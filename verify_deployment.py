import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from app import app
    print("SUCCESS: App imported successfully.")
except Exception as e:
    print(f"FAILURE: {e}")
    import traceback
    traceback.print_exc()
