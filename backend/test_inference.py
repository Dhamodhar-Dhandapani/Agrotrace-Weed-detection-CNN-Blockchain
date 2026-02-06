import sys
import os
import cv2
import numpy as np
from ultralytics import YOLO

# Add current dir to path to find existing modules if needed
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_model():
    print("--- STARTING MODEL TEST ---")
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Try default model
    model_path = os.path.join(current_dir, 'services', 'yolo_default_best.pt')
    if not os.path.exists(model_path):
        # Maybe we are in backend root
        model_path = os.path.join(current_dir, 'services', 'yolo_default_best.pt')
        
    print(f"Looking for model at: {model_path}")
    
    try:
        model = YOLO(model_path)
        print("Successfully loaded YOLO model")
        
        # Create a dummy image (black)
        img = np.zeros((640, 640, 3), dtype=np.uint8)
        
        # Draw a fake "weed" (green circle) just to have content
        cv2.circle(img, (320, 320), 50, (0, 255, 0), -1)
        
        print("Running inference on dummy image...")
        results = model(img, conf=0.1)
        
        for r in results:
            print(f"Detections: {len(r.boxes)}")
            if len(r.boxes) > 0:
                print(r.boxes.conf)
                
        print("--- MODEL TEST COMPLETE ---")
        
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    test_model()
