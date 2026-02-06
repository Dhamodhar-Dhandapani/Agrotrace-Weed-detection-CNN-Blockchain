from flask import Blueprint, request, jsonify
from models import db, Detection, Land
from services.yolo_service import detect_weeds_in_frame, process_video
import os
from werkzeug.utils import secure_filename

detection_bp = Blueprint('detection', __name__)

UPLOAD_FOLDER = os.path.join(os.getcwd(), 'backend', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

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
    print(f"[DEBUG] Saving video to: {filepath}")
    
    try:
        video_file.save(filepath)
        print(f"[DEBUG] File saved successfully. Size: {os.path.getsize(filepath)} bytes")
    except Exception as save_err:
        print(f"[ERROR] Failed to save file: {save_err}")
        return jsonify({"error": f"Failed to save file: {str(save_err)}"}), 500
    
    video_file.close() # Ensure handle is released
    
    # Process video
    try:
        print(f"[DEBUG] Starting YOLO processing for {filepath}")
        result = process_video(filepath)
        print(f"[DEBUG] Processing complete. Result: {result}")
        
        # Check if result indicates failure (e.g. 0 frames analyzed might indicate model failure)
        # However, relying on exception is safer for "model not working"
        if result.get('frames_analyzed', 0) == 0 and result.get('total_weeds', 0) == 0:
             # If we analyzed 0 frames, something is wrong with the video or loop
             pass 

    except Exception as e:
        print(f"[ERROR] Processing failed: {e}")
        # Validating specific user request: "output... as the model not working and not uploaded"
        return jsonify({"error": "Model not working and not uploaded. Please check backend logs."}), 500
    
    # Create record
    detection = Detection(
        land_id=land_id,
        weed_count=result['total_weeds'],
        confidence=result['avg_confidence'],
        image_path=filepath # Storing video path for now
    )
    
    db.session.add(detection)
    db.session.commit()
    
    return jsonify({
        "message": "Video processed",
        "detection_id": detection.id,
        "results": result
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
    
    result = detect_weeds_in_frame(temp_path)
    
    # We might not save EVERY frame to DB, only when user clicks "Capture"
    # But for this endpoint, let's assume it IS a capture
    
    detection = Detection(
        land_id=land_id,
        weed_count=result['weed_count'],
        confidence=result['confidence'],
        image_path=temp_path
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
