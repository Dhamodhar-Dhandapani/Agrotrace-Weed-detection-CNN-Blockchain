@echo off
echo Starting Backend...
cd backend

IF EXIST "..\venv\Scripts\activate.bat" (
    echo Activating Virtual Environment...
    call ..\venv\Scripts\activate.bat
)

python app.py
pause
