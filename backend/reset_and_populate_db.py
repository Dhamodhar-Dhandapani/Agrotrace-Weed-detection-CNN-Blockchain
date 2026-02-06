from app import app
from models import db, User, Land, Detection, Treatment, BlockchainLedger
from werkzeug.security import generate_password_hash
import uuid
from datetime import datetime, timedelta
import random

def reset_and_populate():
    with app.app_context():
        print("Dropping all tables...")
        db.drop_all()
        print("Creating all tables...")
        db.create_all()
        
        # --- Create Users ---
        print("Creating users...")
        users = [
            User(
                username='Admin', 
                email='admin@agrotrace.com', 
                password_hash=generate_password_hash('password123')
            ),
            User(
                username='FarmerJohn', 
                email='john@farms.com', 
                password_hash=generate_password_hash('password123')
            ),
            User(
                username='GreenGrowers', 
                email='info@greengrowers.org', 
                password_hash=generate_password_hash('password123')
            )
        ]
        
        for u in users:
            db.session.add(u)
        db.session.commit()
        
        # --- Create Lands ---
        print("Creating agricultural assets...")
        
        # --- Create Lands ---
        print("Creating agricultural assets...")
        
        # Helper to find user by name
        def get_uid(name):
            return User.query.filter_by(username=name).first().id
            
        crop_types = [
            ("Zea Mays (Corn)", "CORN"),
            ("Glycine Max (Soybean)", "SOY"),
            ("Triticum Aestivum (Wheat)", "WHEAT"),
            ("Oryza Sativa (Rice)", "RICE"),
            ("Solanum Lycopersicum (Tomato)", "TOM"),
            ("Solanum Tuberosum (Potato)", "POT"),
            ("Gossypium (Cotton)", "COT"),
            ("Saccharum (Sugarcane)", "SUG")
        ]
        
        soil_types = ["Silty Loam", "Clay Loam", "Sandy Soil", "Black Soil", "Red Soil"]
        water_sources = ["Rainfed", "Irrigation Pivot", "Drip Irrigation", "Canal", "Borewell"]
        locations = ["Iowa, District", "California, Valley", "Texas, Zone", "Punjab, Block", "Karnataka, District"]
        
        owners = ['FarmerJohn', 'GreenGrowers', 'Admin']
        
        lands = []
        for i in range(1, 16): # Generate 15 assets
            owner = owners[i % 3] # Distribute among users
            crop_name, crop_code = random.choice(crop_types)
            planting_month = random.randint(1, 6)
            
            land = Land(
                user_id=get_uid(owner),
                farmer_name=f"{owner}'s Field #{i}",
                location=f"{random.choice(locations)} {random.randint(1, 99)}",
                crop_type=crop_name,
                crop_id=f"{crop_code}-2024-{100+i}",
                soil_type=random.choice(soil_types),
                water_source=random.choice(water_sources),
                planting_date=f"2024-{planting_month:02d}-{random.randint(1, 28):02d}",
                expected_harvest=f"2024-{planting_month+4:02d}-15",
                area_size=round(random.uniform(5.0, 150.0), 1),
                qr_code_data=str({"id": str(uuid.uuid4()), "seq": i})
            )
            lands.append(land)
        
        for l in lands:
            db.session.add(l)
        db.session.commit()
        
        # --- Create History (Detections & Treatments) ---
        print("Creating detection history...")
        
        all_lands = Land.query.all()
        
        # Generate some random history
        for land in all_lands:
            # Add 3-5 detections per land
            for i in range(random.randint(3, 5)):
                tx_hash = "0x" + "".join([random.choice("0123456789abcdef") for _ in range(64)])
                
                det = Detection(
                    land_id=land.id,
                    weed_count=random.randint(0, 15),
                    confidence=random.uniform(0.75, 0.99),
                    timestamp=datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                    is_on_chain=False, # generated data is not on real blockchain
                    tx_hash=None
                )
                db.session.add(det)
                
                # Skip adding to BlockchainLedger for off-chain dummy data
                
        db.session.commit()
        print("Database reset and populated successfully!")
        print("------------------------------------------------")
        print("Credentials created:")
        print("1. Admin / password123")
        print("2. FarmerJohn / password123")
        print("3. GreenGrowers / password123")

if __name__ == '__main__':
    reset_and_populate()
