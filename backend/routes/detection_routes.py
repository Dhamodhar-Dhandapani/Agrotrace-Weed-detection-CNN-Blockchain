from flask import Blueprint, request, jsonify
from models import db, Detection, Land
from services.yolo_service import detect_weeds_in_frame, process_video
import os
from werkzeug.utils import secure_filename

detection_bp = Blueprint('detection', __name__)

# Fix pathing to be independent of CWD
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
UPLOAD_FOLDER = os.path.join(backend_dir, 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@detection_bp.route('/uploads/<filename>')
def uploaded_file(filename):
    from flask import send_from_directory
    return send_from_directory(UPLOAD_FOLDER, filename)

@detection_bp.route('/video', methods=['POST'])
def detect_video():
    print(f"[DEBUG] Received video upload request. Files: {request.files.keys()}")
    if 'video' not in request.files:
        print("[DEBUG] No video file in request")
        return jsonify({"error": "No video file provided"}), 400
        
    video_file = request.files['video']
    land_id = request.form.get('land_id')
    print(f"[DEBUG] Processing upload for Land ID: {land_id}, Filename: {video_file.filename}")
    
    if not land_id:
        return jsonify({"error": "Land ID is required"}), 400

    filename = secure_filename(video_file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    print(f"[DEBUG] Saving file to: {filepath}")
    
    try:
        video_file.save(filepath)
        print(f"[DEBUG] File saved successfully. Size: {os.path.getsize(filepath)} bytes")
    except Exception as save_err:
        print(f"[ERROR] Failed to save file: {save_err}")
        return jsonify({"error": f"Failed to save file: {str(save_err)}"}), 500
    
    video_file.close()
    
    removal_method = request.form.get('removal_method', 'Manual')
    herbicide_name = request.form.get('herbicide_name')
    
    # Check if file is an image
    ext = os.path.splitext(filename)[1].lower()
    if ext in ['.jpg', '.jpeg', '.png', '.bmp', '.webp']:
        # Process as Image
        print(f"[DEBUG] Processing as Image: {filename}")
        
        # Run inference
        result = detect_weeds_in_frame(filepath, method=removal_method, herbicide=herbicide_name)
        
        # Save detection record
        detection = Detection(
            land_id=land_id,
            weed_count=result['weed_count'],
            confidence=result['confidence'],
            image_path=filepath, # Overwritten with annotated image
            removal_method=removal_method,
            herbicide_name=herbicide_name
        )
        db.session.add(detection)
        db.session.commit()
        
        # Return static image URL
        # We need to bust cache for the image since we overwrote it
        import time
        image_url = f"{request.host_url}api/detect/uploads/{filename}?t={int(time.time())}"
        
        return jsonify({
            "message": "Image analyzed successfully.",
            "detection_id": detection.id,
            "processed_image_url": image_url, # Frontend will use this
            "results": {
                "status": "completed",
                "weed_count": result['weed_count'],
                "confidence": result['confidence']
            }
        })
        
    else:
        # Process as Video (Streaming)
        print(f"[DEBUG] Processing as Video: {filename}")
        
        # Create record immediately (empty stats, updated later via polling)
        detection = Detection(
            land_id=land_id,
            weed_count=0, 
            confidence=0.0,
            image_path=filepath, 
            removal_method=removal_method,
            herbicide_name=herbicide_name
        )
        db.session.add(detection)
        db.session.commit()
        
        # Construct Streaming URL
        # Add timestamp to prevent browser caching of the stream
        import time
        stream_url = f"{request.host_url}api/stream/video/{filename}?method={removal_method}&herbicide={herbicide_name}&detection_id={detection.id}&t={int(time.time())}"
        
        return jsonify({
            "message": "Video uploaded. Starting stream.",
            "detection_id": detection.id,
            "results": {"status": "streaming"},
            "processed_video_url": stream_url,
            "timeline_events": [] 
        })

@detection_bp.route('/live-frame', methods=['POST'])
def detect_live_frame():
    # Expects an image file from the frontend webcam capture
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
        
    image_file = request.files['image']
    land_id = request.form.get('land_id')
    
    if not land_id:
        return jsonify({"error": "Land ID is required"}), 400
        
    # Run inference directly
    # For now, we save it temp or pass file stream
    # Simplification: Save temp
    temp_path = os.path.join(UPLOAD_FOLDER, f"temp_{image_file.filename}")
    image_file.save(temp_path)
    
    removal_method = request.form.get('removal_method', 'Manual')
    herbicide_name = request.form.get('herbicide_name')

    # Pass parameters to service for visualization
    result = detect_weeds_in_frame(temp_path, method=removal_method, herbicide=herbicide_name)
    
    # We might not save EVERY frame to DB, only when user clicks "Capture"
    # But for this endpoint, let's assume it IS a capture
    
    detection = Detection(
        land_id=land_id,
        weed_count=result['weed_count'],
        confidence=result['confidence'],
        image_path=temp_path,
        removal_method=removal_method,
        herbicide_name=herbicide_name
    )
    
    db.session.add(detection)
    db.session.commit()
    
    return jsonify(detection.to_dict())

@detection_bp.route('/history/<land_id>', methods=['GET'])
def get_history(land_id):
    history = Detection.query.filter_by(land_id=land_id).order_by(Detection.timestamp.desc()).all()
    return jsonify([h.to_dict() for h in history])

@detection_bp.route('/user/<user_id>', methods=['GET'])
def get_user_detections(user_id):
    # This involves a join: Detection -> Land -> User
    # query detections where detection.land_id is in (select id from land where user_id = user_id)
    
    detections = db.session.query(Detection).join(Land).filter(Land.user_id == user_id).order_by(Detection.timestamp.desc()).all()
    
    # We might want to enrich the detection data with land name
    results = []
    for d in detections:
        d_dict = d.to_dict()
        d_dict['land_name'] = d.land.farmer_name # or some other identifier
        d_dict['location'] = d.land.location
        results.append(d_dict)
        
    return jsonify(results)

@detection_bp.route('/autonomous-simulation', methods=['POST'])
def autonomous_simulation():
    # Expects an image file from the frontend
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
        
    image_file = request.files['image']
    land_id = request.form.get('land_id')
    removal_method = request.form.get('removal_method', 'Autonomous')
    herbicide_name = request.form.get('herbicide_name')
    
    # Save temp
    temp_filename = f"sim_{secure_filename(image_file.filename)}"
    temp_path = os.path.join(UPLOAD_FOLDER, temp_filename)
    image_file.save(temp_path)
    
    try:
        # Import here to avoid circular dependencies if any, or just standard import
        from services.yolo_service import simulate_autonomous_action
        
        result = simulate_autonomous_action(temp_path, herbicide_key=herbicide_name)
        
        if "error" in result:
            return jsonify(result), 500
            
        # Create a record for this simulation event too
        if land_id:
            detection = Detection(
                land_id=land_id,
                weed_count=result['weed_count'],
                confidence=0.95, # High confidence for simulation
                image_path=result['processed_image_path'],
                removal_method=removal_method,
                herbicide_name=result.get('herbicide') or herbicide_name,
                is_on_chain=False
            )
            db.session.add(detection)
            db.session.commit()
            
            result['detection_id'] = detection.id
            
        # Construct full URL for the processed image
        # Assuming we have a route to serve uploads, or we return base64
        # For simplicity, returning filename and frontend can fetch via static route if exists, 
        # or we read and return base64. 
        # Let's return base64 for immediate display without static file hosting issues.
        import base64
        
        processed_path = os.path.join(UPLOAD_FOLDER, result['processed_image_path'])
        with open(processed_path, "rb") as img_file:
            encoded_string = base64.b64encode(img_file.read()).decode('utf-8')
            
        result['processed_image_base64'] = f"data:image/jpeg;base64,{encoded_string}"
        
        return jsonify(result)

    except Exception as e:
        print(f"[ERROR] Simulation endpoint error: {e}")
        return jsonify({"error": str(e)}), 500
