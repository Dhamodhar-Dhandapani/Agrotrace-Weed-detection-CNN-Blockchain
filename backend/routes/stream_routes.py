from flask import Blueprint, Response, request, jsonify, stream_with_context
from services.yolo_service import generate_video_frames, process_live_frame, VIDEO_STATS, start_live_session, stop_live_session
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

@stream_bp.route('/live/start', methods=['POST'])
def start_live():
    """Starts a live session."""
    data = request.json
    land_id = data.get('land_id')
    method = data.get('removal_method', 'Manual')
    herbicide = data.get('herbicide_name')
    
    if not land_id:
        return jsonify({"error": "Land ID required"}), 400
        
    session_id = start_live_session(land_id, method, herbicide)
    return jsonify({"session_id": session_id, "status": "started"})

@stream_bp.route('/live/stop', methods=['POST'])
def stop_live():
    """Stops a live session and saves to DB."""
    data = request.json
    session_id = data.get('session_id')
    
    if not session_id:
         return jsonify({"error": "Session ID required"}), 400
         
    stats = stop_live_session(session_id)
    if not stats:
        return jsonify({"error": "Session not found"}), 404
        
    # Save to DB
    try:
        from models import db, Detection
        
        # Create new record
        detection = Detection(
            land_id=stats['land_id'],
            weed_count=stats['weed_count'],
            confidence=0.85, # Assumed high for session
            image_path="live_session_log", # Placeholder or maybe we saved last frame?
            removal_method=stats['method'],
            herbicide_name=stats['herbicide']
        )
        db.session.add(detection)
        db.session.commit()
        
        stats['detection_id'] = detection.id
        stats['status'] = 'completed'
        
        return jsonify(stats)
        
    except Exception as e:
        print(f"[ERROR] Failed to save live session to DB: {e}")
        return jsonify({"error": str(e)}), 500

@stream_bp.route('/live', methods=['POST'])
def stream_live_frame():
    """
    Receives a single frame, processes it, and returns the annotated frame.
    Supports session_id for cumulative counting.
    """
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
        
    image_file = request.files['image']
    
    # Create temp file
    ext = os.path.splitext(image_file.filename)[1] or ".jpg"
    temp_filename = f"live_{uuid.uuid4()}{ext}"
    temp_path = os.path.join(UPLOAD_FOLDER, temp_filename)
    
    try:
        image_file.save(temp_path)
        
        removal_method = request.form.get('removal_method', 'Manual')
        herbicide_name = request.form.get('herbicide_name')
        session_id = request.form.get('session_id') # Get Session ID
        
        image_data_url, count, inference_time = process_live_frame(temp_path, method=removal_method, herbicide=herbicide_name, session_id=session_id)
        
        if image_data_url is None:
             return jsonify({"error": "Processing failed"}), 500
             
        return jsonify({
            "image": image_data_url,
            "weed_count": count, # This is cumulative if session_id is valid
            "inference_time": inference_time,
            "status": "success"
        })
        
    except Exception as e:
        print(f"[ERROR] Live stream error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
