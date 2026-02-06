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

def detect_weeds_in_frame(image_path, conf=0.15):
    """
    Single frame detection.
    """
    load_model()
    
    try:
        # Run inference with lower confidence threshold
        results = model(image_path, conf=conf, verbose=True)
        count = 0
        total_conf = 0.0
        
        for result in results:
            boxes = result.boxes
            count += len(boxes)
            if len(boxes) > 0:
                conf_values = boxes.conf.cpu().numpy()
                total_conf += np.sum(conf_values)
                
        avg_conf = (total_conf / count) if count > 0 else 0.0
        
        print(f"[DEBUG] Frame Analysis: Found {count} weeds with avg conf {avg_conf:.2f}")
        return {"weed_count": int(count), "confidence": float(avg_conf)}
    except Exception as e:
        print(f"[ERROR] Inference error: {e}")
        return {"weed_count": 0, "confidence": 0.0}

def process_video(video_path):
    """
    Full video processing with TRACKING to count unique weeds.
    Does NOT save output video/images, only returns stats.
    """
    load_model()
    
    if model == "DUMMY":
        return {"total_weeds": 0, "avg_confidence": 0}

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"[ERROR] Could not open video: {video_path}")
        return {"total_weeds": 0, "avg_confidence": 0}

    unique_weed_ids = set()
    confidences = []
    max_detections_in_frame = 0 # Backup metric if tracking fails
    
    print("[INFO] Processing video for unique weed count...")
    
    try:
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break

            # Run Object Tracking
            # Lower confidence to catch more potential weeds
            frame_count = int(cap.get(cv2.CAP_PROP_POS_FRAMES))

            # --- OPTIMIZATION: Process at ~5 FPS ---
            # Sampling too low (1 FPS) breaks tracking. 5 FPS is a good balance.
            fps = cap.get(cv2.CAP_PROP_FPS)
            if fps <= 0 or fps is None: fps = 30 
            
            skip_interval = max(1, int(fps / 5))

            if frame_count % skip_interval != 0:
                continue 

            # Resize frame for speed (Standard YOLO size)
            height, width = frame.shape[:2]
            if width > 640:
                scale = 640 / width
                new_height = int(height * scale)
                frame = cv2.resize(frame, (640, new_height))
            
            try:
                # TRACKING ATTEMPT
                results = model.track(frame, conf=0.15, persist=True, verbose=False)
                
                for r in results:
                    if r.boxes.id is not None:
                        # Found tracked objects
                        track_ids = r.boxes.id.int().cpu().tolist()
                        current_confidences = r.boxes.conf.cpu().tolist()
                        
                        if frame_count % 30 == 0:
                            print(f"[DEBUG] Frame {frame_count}: Found {len(track_ids)} objects. IDs: {track_ids}")
                        
                        for track_id, conf in zip(track_ids, current_confidences):
                            if track_id not in unique_weed_ids:
                                unique_weed_ids.add(track_id)
                                confidences.append(conf)
                    elif frame_count % 30 == 0:
                         print(f"[DEBUG] Frame {frame_count}: No objects detected (Tracking).")
                         
            except Exception as track_err:
                # FALLBACK TO DETECTION
                # If tracking fails (e.g. missing 'lap'), use standard prediction
                if frame_count % 30 == 0:
                     print(f"[WARN] Tracking failed, using fallback detection. Error: {track_err}")
                
                try:     
                    results = model(frame, conf=0.15, verbose=False)
                    for r in results:
                        count = len(r.boxes)
                        
                        if frame_count % 30 == 0:
                            print(f"[DEBUG] Frame {frame_count}: Found {count} objects (Fallback).")
    
                        if count > max_detections_in_frame:
                            max_detections_in_frame = count
                        
                        if count > 0:
                             current_confidences = r.boxes.conf.cpu().tolist()
                             confidences.extend(current_confidences)
                except Exception as fallback_err:
                    print(f"[ERROR] Fallback detection also failed: {fallback_err}")

                            
    except Exception as e:
        print(f"[ERROR] Video processing loop error: {e}")
        
    finally:
        cap.release()

    if len(unique_weed_ids) > 0:
        total_unique_weeds = len(unique_weed_ids)
    else:
        # If tracking failed, use max concurrent detections as a proxy for "min unique weeds"
        total_unique_weeds = max_detections_in_frame
    avg_conf = sum(confidences) / len(confidences) if confidences else 0.0
    
    print(f"[INFO] Processing Complete. Unique Weeds: {total_unique_weeds}, Avg Conf: {avg_conf}")

    return {
        "total_weeds": total_unique_weeds,
        "avg_confidence": avg_conf,
        "frames_analyzed": frame_count if 'frame_count' in locals() else 0
    }
