from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid
import json

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "created_at": self.created_at.isoformat()
        }

class Land(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    farmer_name = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(200), nullable=False)
    crop_type = db.Column(db.String(100), nullable=False)
    # New Fields for Detailed Crop Tracking
    crop_id = db.Column(db.String(50), nullable=True) # Custom ID e.g. WHEAT-2026-001
    soil_type = db.Column(db.String(100))
    water_source = db.Column(db.String(100))
    planting_date = db.Column(db.String(50)) # Keeping as string for simplicity in demo
    expected_harvest = db.Column(db.String(50))
    
    area_size = db.Column(db.Float, nullable=False)
    qr_code_data = db.Column(db.Text, unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Link to User
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=True) # Nullable for backward compat or public lands
    
    # Relationships
    detections = db.relationship('Detection', backref='land', lazy=True)
    treatments = db.relationship('Treatment', backref='land', lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "farmer_name": self.farmer_name,
            "location": self.location,
            "crop_type": self.crop_type,
            "crop_id": self.crop_id,
            "soil_type": self.soil_type,
            "water_source": self.water_source,
            "planting_date": self.planting_date,
            "expected_harvest": self.expected_harvest,
            "area_size": self.area_size,
            "qr_code_data": self.qr_code_data,
            "created_at": self.created_at.isoformat()
        }

class Detection(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    land_id = db.Column(db.String(36), db.ForeignKey('land.id'), nullable=False)
    image_path = db.Column(db.String(300)) # Path to saved frame
    weed_count = db.Column(db.Integer, default=0)
    confidence = db.Column(db.Float, default=0.0)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Blockchain Simulation
    is_on_chain = db.Column(db.Boolean, default=False)
    tx_hash = db.Column(db.String(66), nullable=True) # 0x...
    
    def to_dict(self):
        return {
            "id": self.id,
            "land_id": self.land_id,
            "weed_count": self.weed_count,
            "confidence": self.confidence,
            "timestamp": self.timestamp.isoformat(),
            "is_on_chain": self.is_on_chain,
            "tx_hash": self.tx_hash
        }

class Treatment(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    land_id = db.Column(db.String(36), db.ForeignKey('land.id'), nullable=False)
    herbicide_name = db.Column(db.String(100), nullable=False)
    dosage = db.Column(db.String(50))
    applied_by = db.Column(db.String(100))
    date_applied = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Blockchain Simulation
    is_on_chain = db.Column(db.Boolean, default=False)
    tx_hash = db.Column(db.String(66), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "land_id": self.land_id,
            "herbicide_name": self.herbicide_name,
            "dosage": self.dosage,
            "date_applied": self.date_applied.isoformat(),
            "is_on_chain": self.is_on_chain,
            "tx_hash": self.tx_hash
        }

class BlockchainLedger(db.Model):
    """Simulates an immutable ledger locally"""
    id = db.Column(db.Integer, primary_key=True)
    record_type = db.Column(db.String(50)) # 'DETECTION', 'TREATMENT'
    record_id = db.Column(db.String(36))
    data_hash = db.Column(db.String(64)) # SHA256 of the data
    prev_hash = db.Column(db.String(64))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
