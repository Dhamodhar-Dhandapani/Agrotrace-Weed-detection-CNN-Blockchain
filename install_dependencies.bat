@echo off
echo ========================================
echo   AgroTrace Dependency Installer
echo ========================================

IF NOT EXIST "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing dependencies...
pip install --upgrade pip
pip install -r backend/requirements.txt

echo.
echo ========================================
echo   Installation Complete!
echo ========================================
echo You can now run start_backend.bat
pause
