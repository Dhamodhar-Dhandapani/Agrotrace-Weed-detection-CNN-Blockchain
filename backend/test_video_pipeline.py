import cv2
import numpy as np
import os
import sys

# Add services to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
try:
    from backend.services.yolo_service import process_video, CustomBackbone, FeatureSelector
except ImportError:
    # Use relative import if running directly from root or backend
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))
    from services.yolo_service import process_video, CustomBackbone, FeatureSelector

# HACK: Inject CustomBackbone into __main__ to satisfy pickle
import __main__
__main__.CustomBackbone = CustomBackbone
__main__.FeatureSelector = FeatureSelector

def create_dummy_video(filename="test_video.mp4"):
    print(f"Creating dummy video: {filename}")
    height, width = 640, 640
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(filename, fourcc, 30.0, (width, height))
    
    for i in range(30):
        # Create a frame with a moving green circle
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        # Green circle (simulate weed)
        cv2.circle(frame, (100 + i*5, 320), 50, (0, 255, 0), -1)
        # White text
        cv2.putText(frame, f"Frame {i}", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        out.write(frame)
        
    out.release()
    print("Video created.")
    return filename

def test_pipeline():
    video_path = create_dummy_video()
    
    print("\n--- TESTING OPENCV READ ---")
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("FAIL: Could not open video with OpenCV.")
    else:
        print("SUCCESS: Video opened.")
        ret, frame = cap.read()
        if ret:
            print(f"Read frame shape: {frame.shape}")
        else:
            print("FAIL: Could not read first frame.")
    cap.release()
    
    print("\n--- TESTING YOLO SERVICE ---")
    try:
        current_dir = os.path.abspath(os.path.dirname(__file__))
        abs_video_path = os.path.abspath(video_path)
        print(f"Processing: {abs_video_path}")
        
        result = process_video(abs_video_path)
        print("Service Result:", result)
    except Exception as e:
        print(f"Service FAIL: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_pipeline()
