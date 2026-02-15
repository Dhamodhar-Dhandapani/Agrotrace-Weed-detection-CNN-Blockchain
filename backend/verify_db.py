from app import app
from models import Detection, db

def verify_data():
    with app.app_context():
        detections = Detection.query.all()
        print(f"Total Detections: {len(detections)}")
        for i, det in enumerate(detections[:5]):
            print(f"Detection {i+1}:")
            print(f"  Method: {det.detection_method}")
            print(f"  Removal: {det.removal_method}")
            print(f"  Herbicide: {det.herbicide_name}")
            print("-" * 20)

if __name__ == "__main__":
    verify_data()
