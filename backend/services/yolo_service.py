import torch
import torch.nn as nn
import torchvision.models as models
from torchvision.models.feature_extraction import create_feature_extractor
import ultralytics.nn.tasks as tasks
import ultralytics.nn.modules as modules_pkg
from ultralytics import YOLO
import cv2
import os
import numpy as np

# --- 1. DEFINE CUSTOM HYBRID ARCHITECTURE ---
# (Must match the architecture used during training exactly)
FEATURE_CACHE = {'p3': None, 'p4': None, 'p5': None}

class CustomBackbone(nn.Module):
    def __init__(self, c2, model_name):
        super().__init__()
        if isinstance(model_name, list): model_name = model_name[0]
        self.model_name = str(model_name)
        
        # Load the appropriate backbone
        if self.model_name == 'resnet50':
            weights = models.ResNet50_Weights.DEFAULT
            base_model = models.resnet50(weights=weights)
            nodes = {'layer2': 'p3', 'layer3': 'p4', 'layer4': 'p5'}
        elif self.model_name == 'densenet121':
            weights = models.DenseNet121_Weights.DEFAULT
            base_model = models.densenet121(weights=weights)
            nodes = {'features.transition1.pool': 'p3', 'features.transition2.pool': 'p4', 'features.norm5': 'p5'}
        else:
            # Fallback or error, but here we assume valid config from user
            weights = models.ResNet50_Weights.DEFAULT
            base_model = models.resnet50(weights=weights)
            nodes = {'layer2': 'p3', 'layer3': 'p4', 'layer4': 'p5'}
            
        self.feature_extractor = create_feature_extractor(base_model, return_nodes=nodes)

    def forward(self, x):
        outputs = self.feature_extractor(x)
        global FEATURE_CACHE
        FEATURE_CACHE['p3'] = outputs['p3']
        FEATURE_CACHE['p4'] = outputs['p4']
        FEATURE_CACHE['p5'] = outputs['p5'] 
        return outputs['p5']

class FeatureSelector(nn.Module):
    def __init__(self, index):
        super().__init__()
        self.index = int(index)

    def forward(self, x):
        global FEATURE_CACHE
        keys = ['p3', 'p4', 'p5']
        target_key = keys[self.index]
        return FEATURE_CACHE[target_key]

# --- 2. REGISTER MODULES ---
def register_custom_modules():
    try:
        setattr(tasks, 'Index', FeatureSelector)
        setattr(tasks, 'CustomBackbone', CustomBackbone)
        setattr(modules_pkg, 'CustomBackbone', CustomBackbone)
        print("[INFO] Custom modules registered.")
    except Exception as e:
        print(f"[WARN] Failed to register custom modules: {e}")

# Register immediately on import
register_custom_modules()

# Global model instance
model = None

def load_model():
    global model
    if model is None:
        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            
            # Primary: Custom user model
            custom_model_path = os.path.join(current_dir, 'best.pt')
            
            # Secondary: Default fallback model
            default_model_path = os.path.join(current_dir, 'yolo_default_best.pt')
            
            model_to_load = None
            
            # 1. Check for custom model
            if os.path.exists(custom_model_path):
                print(f"[INFO] Loading custom model from: {custom_model_path}")
                model_to_load = custom_model_path
            # 2. Check for default custom model
            elif os.path.exists(default_model_path):
                print(f"[INFO] Custom model 'best.pt' not found. Using default: {default_model_path}")
                model_to_load = default_model_path
            # 3. Search up (Legacy)
            else:
                possible_paths = [
                    os.path.join(current_dir, '..', 'best.pt'),
                    os.path.join(current_dir, '..', '..', 'best.pt'),
                    'best.pt'
                ]
                for p in possible_paths:
                    if os.path.exists(p):
                        print(f"[INFO] Found custom model in parent directory: {p}")
                        model_to_load = p
                        break
            
            if model_to_load:
                # User wants strict loading. If it crashes, it crashes.
                register_custom_modules()
                model = YOLO(model_to_load)
                print(f"[INFO] Model loaded successfully: {model_to_load}")
            else:
                raise FileNotFoundError(f"CRITICAL: No custom model found. Please upload 'best.pt' to {current_dir}")
                
        except Exception as e:
            print(f"[ERROR] Failed to load custom model. Automatic fallback is DISABLED.")
            print(f"[ERROR] Error details: {e}")
            raise e

def visualize_frame(img, results, method="Manual", herbicide=None):
    """
    Helper to draw bounding boxes and text on a frame.
    DOES NOT SHOW WINDOWS. Returns the annotated frame.
    """
    weed_count = 0
    # Text Color based on method
    text_color = (0, 0, 255) # Red default
    action_text = "WEED DETECTED"
    
    if method == "Autonomous":
        action_text = f"SPRAYING {herbicide if herbicide else 'HERBICIDE'}..."
        text_color = (0, 255, 255) # Yellow/Cyan
    elif method == "Chemical":
         action_text = f"APPLYING {herbicide if herbicide else 'CHEMICAL'}..."
         text_color = (0, 165, 255) # Orange
    elif method == "Organic":
         action_text = f"APPLYING {herbicide if herbicide else 'ORGANIC AGENT'}..."
         text_color = (0, 255, 0) # Green
    elif method == "Manual":
         action_text = "MANUAL REMOVAL REQUIRED"
         text_color = (0, 0, 255) # Red

    for result in results:
        boxes = result.boxes
        for box in boxes:
            weed_count += 1
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            
            # Draw Bounding Box
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 0, 255), 2)
            
            # Show Action Text
            cv2.putText(img, action_text, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, text_color, 2)
            
            # If Autonomous, draw the "X" to show destruction
            if method == "Autonomous":
                cv2.line(img, (x1, y1), (x2, y2), (0, 0, 255), 3)
                cv2.line(img, (x1, y2), (x2, y1), (0, 0, 255), 3)

    return img, weed_count

import base64
import time

# ... (existing imports)

# Global stats for video streams
VIDEO_STATS = {}

def generate_video_frames(video_path, method="Manual", herbicide=None, filename="unknown", detection_id=None):
    """
    Generator function that yields JPEG frames for a video stream.
    IMPLEMENTS FRAME THROTTLING: Runs AI only a few times per second.
    Results are "sticky" (persisted) between inference frames.
    Updates VIDEO_STATS for polling.
    Updates Database on completion if detection_id is provided.
    """
    load_model()
    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        print(f"[ERROR] Could not open video: {video_path}")
        return

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    # Target AI FPS (How many times per second to run YOLO)
    TARGET_AI_FPS = 5 
    SKIP_FRAMES = max(1, int(fps / TARGET_AI_FPS))
    
    # Optimization: Resize to 640px width for "Real-Time" speed (MJPEG bandwidth heavy)
    if width > 640:
        scale = 640 / width
        width = int(width * scale)
        height = int(height * scale)
        
    print(f"[DEBUG] Starting stream: {filename} | {width}x{height} | {total_frames} frames | AI Skip: {SKIP_FRAMES}")

    frame_count = 0
    last_results = []
    
    # Initialize stats
    VIDEO_STATS[filename] = {
        "frames_processed": 0,
        "total_frames": total_frames,
        "weed_count": 0,
        "cumulative_weeds": 0,
        "status": "processing",
        "detection_id": detection_id, # Store for polling update
        "db_saved": False
    }
    
    seen_ids = set()

    try:
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break
            
            frame_count += 1
            
            # Resize
            frame = cv2.resize(frame, (width, height))
            
            # Intelligent Frame Throttling
            # For TRACKING, we ideally need every frame or close to it for Kalman filters to work.
            # But skipping 5 frames (Video 30fps -> 6fps) usually works fine for ByteTrack.
            if frame_count % SKIP_FRAMES == 0 or frame_count == 1:
                try:
                    # Use YOLOv8 Tracking (ByteTrack/BoT-SORT)
                    # persist=True is crucial for video tracking
                    # verbose=False explicitly to reduce console noise
                    last_results = model.track(frame, persist=True, conf=0.15, verbose=False)
                    
                    # Unique Counting Logic
                    if last_results and last_results[0].boxes and last_results[0].boxes.id is not None:
                        # Extract IDs (they are tensors)
                        ids = last_results[0].boxes.id.int().cpu().tolist()
                        for obj_id in ids:
                            seen_ids.add(obj_id)
                except Exception as track_err:
                    print(f"[WARN] Tracking error at frame {frame_count}: {track_err}")
            
            # Visualization
            annotated_frame, _ = visualize_frame(frame, last_results, method, herbicide)
            
            # Update Global Stats
            VIDEO_STATS[filename]["frames_processed"] = frame_count
            VIDEO_STATS[filename]["weed_count"] = len(seen_ids) # Unique Count
            VIDEO_STATS[filename]["cumulative_weeds"] = len(seen_ids) # Same as above
            VIDEO_STATS[filename]["status"] = "processing"
            
            # Add "Status" text to video
            cv2.putText(annotated_frame, f"Unique Weeds: {len(seen_ids)}", (20, 40), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            
            ret, buffer = cv2.imencode('.jpg', annotated_frame)
            if not ret:
                continue
            
            # Encode frame
            frame_bytes = buffer.tobytes()
            
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

        # Mark as completed when loop finishes naturally
        VIDEO_STATS[filename]["status"] = "completed"
        print(f"[INFO] Video processing completed. Final unique count: {len(seen_ids)}")


    except Exception as e:
        print(f"[ERROR] Streaming error: {e}")
        VIDEO_STATS[filename]["status"] = "error"
    finally:
        cap.release()

def process_live_frame(image_path, method="Manual", herbicide=None):
    """
    Processes a single frame for live camera feed.
    Returns: (base64_string, weed_count, inference_time)
    """
    load_model()
    try:
        start_time = time.time()
        img = cv2.imread(image_path)
        if img is None:
            return None, 0, 0
            
        # Inference
        results = model(img, conf=0.15, verbose=False)
        annotated_frame, count = visualize_frame(img, results, method, herbicide)
        
        # Calculate inference time
        inference_time = time.time() - start_time
        
        # Encode to JPEG then Base64
        ret, buffer = cv2.imencode('.jpg', annotated_frame)
        if not ret:
             return None, 0, 0
             
        # Convert to base64 string
        b64_string = base64.b64encode(buffer).decode('utf-8')
        image_data_url = f"data:image/jpeg;base64,{b64_string}"
             
        return image_data_url, count, inference_time
        
    except Exception as e:
        print(f"[ERROR] Live frame error: {e}")
        return None, 0, 0

def detect_weeds_in_frame(image_path, conf=0.15, method="Manual", herbicide=None):
    """
    Legacy single frame detection - updated to use shared visualizer and NO POPUPS.
    """
    load_model()
    try:
        results = model(image_path, conf=conf, verbose=True)
        img = cv2.imread(image_path)
        if img is not None:
            processed_img, count = visualize_frame(img, results, method, herbicide)
            cv2.imwrite(image_path, processed_img)
            
            confidence = 0.0
            if count > 0 and len(results) > 0:
                 confidence = float(results[0].boxes.conf.mean())
                 
            return {"weed_count": count, "confidence": confidence}
        else:
             return {"weed_count": 0, "confidence": 0.0}
    except Exception as e:
        print(f"[ERROR] Inference error: {e}")
        return {"weed_count": 0, "confidence": 0.0}

def simulate_autonomous_action(image_path, conf=0.15, herbicide_key=None):
    """
    Simulates autonomous weed removal.
    Updated to REMOVE POPUPS. 
    Just processes the image and returns result + annotated image.
    """
    load_model()
    try:
        results = model(image_path, conf=conf, verbose=True)
        img = cv2.imread(image_path)
        if img is None: raise ValueError("Image load failed")
            
        # Herbicide selection logic
        herbicides = ["Glyphosate-41%", "Glufosinate-Ammonium", "Organic Vinegar", "Hot Water"]
        selected = herbicide_key if herbicide_key else herbicides[0]
        
        # Viz
        processed_img, weed_count = visualize_frame(img, results, "Autonomous", selected)
        
        # Save output
        dirname, basename = os.path.split(image_path)
        processed_filename = f"processed_{basename}"
        processed_path = os.path.join(dirname, processed_filename)
        cv2.imwrite(processed_path, processed_img)
        
        actions = []
        if weed_count > 0:
            actions.append(f"System identified {weed_count} targets.")
            actions.append(f"Applied {selected} via spray nozzle.")
            actions.append("Target eliminated.")
        else:
            actions.append("No weeds detected. Patrol mode active.")
            
        return {
            "weed_count": weed_count,
            "processed_image_path": processed_filename,
            "herbicide": selected if weed_count > 0 else None,
            "actions": actions
        }

    except Exception as e:
        print(f"[ERROR] Simulation error: {e}")
        return {"error": str(e)}

def process_video(video_path, method="Manual", herbicide=None):
    """
    Legacy video processing - Removed. 
    Kept as stub or redirect if needed, but we want streaming now.
    If keeping for "save to file" mode, we must ensure NO POPUPS.
    For this task, we can deprecate it or make it silent.
    """
    # Simply return a dummy response or implement silent processing if user still wants "download"
    # For now, let's implement silent processing for backward compatibility
    load_model()
    pass # Implementation omitted to prioritize streaming. 
    # If the user uploads via the old endpoint, we can just return success or redirect.
    # But since we are replacing the frontend behavior, this function might not be called.
    return {"message": "Deprecated. Use streaming."}
