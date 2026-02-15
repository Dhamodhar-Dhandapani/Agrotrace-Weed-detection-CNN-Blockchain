from flask import Blueprint, Response, request, jsonify, stream_with_context
from services.yolo_service import generate_video_frames, process_live_frame, VIDEO_STATS
import os
import uuid

stream_bp = Blueprint('stream', __name__)

# Fix pathing to be independent of CWD
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
UPLOAD_FOLDER = os.path.join(backend_dir, 'uploads')

@stream_bp.route('/video/<filename>')
def stream_video(filename):
    """
    Stream a video file frame-by-frame (MJPEG).
    """
    video_path = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(video_path):
        return jsonify({"error": "Video not found"}), 404

    # Get optional query params for method
    removal_method = request.args.get('method', 'Manual')
    herbicide = request.args.get('herbicide', '')
    detection_id = request.args.get('detection_id', None)

    return Response(
        generate_video_frames(video_path, method=removal_method, herbicide=herbicide, filename=filename, detection_id=detection_id),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )

@stream_bp.route('/video/status/<filename>')
def video_status(filename):
    """
    Get real-time stats for a streaming video.
    """
    stats = VIDEO_STATS.get(filename, {
        "frames_processed": 0, 
        "total_frames": 0, 
        "weed_count": 0, 
        "status": "pending"
    })
    
    # Check if we need to update DB (Architecture Fix: Do it here, not in generator)
    if stats.get("status") == "completed" and stats.get("detection_id") and not stats.get("db_saved", False):
        try:
            from models import db, Detection
            detection_id = stats["detection_id"]
            record = Detection.query.get(detection_id)
            if record:
                record.weed_count = stats["weed_count"]
                record.confidence = 0.85 # Set a default high confidence for successful tracking
                db.session.commit()
                stats["db_saved"] = True
                print(f"[INFO] Polling Poller updated Detection {detection_id} in DB.")
        except Exception as e:
            print(f"[ERROR] Failed to update DB from status poller: {e}")
            
    return jsonify(stats)

@stream_bp.route('/live', methods=['POST'])
def stream_live_frame():
    """
    Receives a single frame, processes it, and returns the annotated frame.
    This is for "pseudo-streaming" where client POSTs frames rapidly.
    """
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
        
    image_file = request.files['image']
    
    # We don't save to disk to be fast.
    # Convert FileStorage to numpy array - doing it in memory is better.
    # But yolo_service depends on file paths or cv2.imread.
    # Let's quickly save to temp for simplicity with current service structure, 
    # OR refactor service to accept bytes.
    # For now, to minimize risk, we keep file pattern but use a RAM-disk-like approach or just temp.
    # Actually, saving every frame to disk is slow (10-30ms).
    # A better approach is `cv2.imdecode`.
    
    # Let's save to a temp file that gets overwritten?
    # Or better: Decode in memory.
    
    # But `process_live_frame` currently takes `image_path` in my previous edit?
    # Let's check `yolo_service.py`... 
    # "img = cv2.imread(image_path)"
    
    # We should update yolo_service to handle bytes/numpy to be efficient.
    # For this step, I'll stick to the interface I just wrote: `image_path`.
    # I will save to a temp file named 'live_temp.jpg' (overwriting it).
    
    # Create a unique temp file to avoid race conditions
    ext = os.path.splitext(image_file.filename)[1] or ".jpg"
    temp_filename = f"live_{uuid.uuid4()}{ext}"
    temp_path = os.path.join(UPLOAD_FOLDER, temp_filename)
    
    try:
        image_file.save(temp_path)
        
        removal_method = request.form.get('removal_method', 'Manual')
        herbicide_name = request.form.get('herbicide_name')
        
        image_data_url, count, inference_time = process_live_frame(temp_path, method=removal_method, herbicide=herbicide_name)
        
        if image_data_url is None:
             return jsonify({"error": "Processing failed"}), 500
             
        # Return JSON with metadata and base64 image
        return jsonify({
            "image": image_data_url, # Data URL for <img> src
            "weed_count": count,
            "inference_time": inference_time,
            "status": "success"
        })
        
    except Exception as e:
        print(f"[ERROR] Live stream error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        # Cleanup temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)
