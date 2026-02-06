from flask import Blueprint, request, jsonify, send_file
from models import db, Land
import qrcode
import io
import uuid

land_bp = Blueprint('land', __name__)

@land_bp.route('/register', methods=['POST'])
def register_land():
    data = request.json
    
    # Generate a unique Land ID if not provided (though model handles it, we need it for QR)
    # We'll let the DB handle ID generation if we commit first, or generate uuid here
    new_id = str(uuid.uuid4())
    
    # Generate QR Code Data (JSON string of vital info)
    qr_payload = {
        "land_id": new_id,
        "farmer": data.get('farmer_name'),
        "loc": data.get('location')
    }
    qr_str = str(qr_payload)
    
    new_land = Land(
        id=new_id,
        farmer_name=data.get('farmer_name'),
        location=data.get('location'),
        crop_type=data.get('crop_type'),
        crop_id=data.get('crop_id'),
        soil_type=data.get('soil_type'),
        water_source=data.get('water_source'),
        planting_date=data.get('planting_date'),
        expected_harvest=data.get('expected_harvest'),
        area_size=data.get('area_size'),
        qr_code_data=qr_str,
        user_id=data.get('user_id')
    )
    
    db.session.add(new_land)
    db.session.commit()
    
    return jsonify({"message": "Land registered successfully", "land": new_land.to_dict()}), 201

@land_bp.route('/<land_id>', methods=['GET'])
def get_land(land_id):
    land = Land.query.get_or_404(land_id)
    return jsonify(land.to_dict())

@land_bp.route('/qr/<land_id>', methods=['GET'])
def get_qr(land_id):
    land = Land.query.get_or_404(land_id)
    
    img = qrcode.make(land.qr_code_data)
    buf = io.BytesIO()
    img.save(buf)
    buf.seek(0)
    
    return send_file(buf, mimetype='image/png')

@land_bp.route('/user/<user_id>', methods=['GET'])
def get_user_lands(user_id):
    # Depending on how strict we want to be, we could verify the user exists first.
    # For now, just query lands by user_id.
    lands = Land.query.filter_by(user_id=user_id).all()
    
    # If no lands found, returns empty list, which is valid.
    return jsonify([land.to_dict() for land in lands])
