# Developer Guide & Troubleshooting

## 🛠️ Project Setup

### Backend (Python/Flask)
1.  **Environment**: Ensure Python 3.8+ is installed.
2.  **Virtual Env**: Always use key `venv`. 
    *   Create: `python -m venv venv`
    *   Activate: `.\venv\Scripts\activate`
3.  **Dependencies**: `pip install -r backend/requirements.txt`
4.  **Database**: `agrotrace.db` is a SQLite file created automatically on first run in the `backend/` folder.
    *   *To reset DB*: Delete `backend/agrotrace.db` and restart the server.

### Frontend (React/Vite)
1.  **Node**: Ensure Node.js 16+ is installed.
2.  **Install**: `cd frontend && npm install`
3.  **Run**: `npm run dev`
    *   *Build Error?*: If you see Tailwind errors, ensure you are using the v4 compatible `index.css` setup (CSS Variables) and NOT `@apply` with utility classes if the plugin fails.

## 🐛 Common Issues & Fixes

### 1. "moov atom not found" (Video Upload)
*   **Cause**: The uploaded video file is incomplete or corrupted, or `cv2` cannot read the codec.
*   **Fix**: 
    - Ensure `ffmpeg` codecs are installed if typical players can't open it.
    - The app attempts to save the file fully before processing.
    - Try uploading `.mp4` files encoded with H.264.

### 2. "ModuleNotFoundError: 'flask'"
*   **Cause**: You are running `python app.py` globally, not in `venv`.
*   **Fix**: Use `start_backend.bat` which handles activation for you.

### 3. "Custom model not found"
*   **Cause**: `best.pt` is missing from `backend/services/`.
*   **Fix**: Place your YOLOv8 weights file named `best.pt` inside `backend/services/`.

### 4. Detection Count is 0 (Video)
*   **Cause**: The logic was previously checking only the *first frame*.
*   **Fix**: The updated service now scans 1 frame every second and reports the maximum weed count found in any single frame.

## 🏗️ Architecture
- **API**: 
    - `/api/land/register`: Creates `Land` record + QR.
    - `/api/detect/video`: Uploads -> DetectionService -> Returns stats.
    - `/api/blockchain/store`: Simulates a blockchain commit by hashing the record.
- **Frontend**: React SPA using `axios` for API calls.

## 📝 Persistence
Data is stored in `backend/agrotrace.db`.
- **Land**: Main registry. 
- **Detection**: History of events.
If you need to backup data, copy this `.db` file.
