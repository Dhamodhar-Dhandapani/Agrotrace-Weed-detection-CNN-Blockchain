import subprocess
import sys

def install(package):
    subprocess.check_call([sys.executable, "-m", "pip", "install", package])

try:
    import cv2
    print("OpenCV is already installed.")
except ImportError:
    print("OpenCV not found. Installing...")
    install("opencv-python")
    print("OpenCV installed successfully.")
