@echo off
echo ===================================================
echo      STOPPING AGROTRACE APPLICATION
echo ===================================================
echo.

echo 1. Stopping Frontend and Blockchain (Node.js)...
taskkill /F /IM node.exe /T 2>nul
if errorlevel 1 (
    echo    No Node.js processes found (or already stopped).
) else (
    echo    Frontend and Blockchain stopped.
)
echo.

echo 2. Stopping Backend (Python)...
taskkill /F /IM python.exe /T 2>nul
if errorlevel 1 (
    echo    No Python processes found (or already stopped).
) else (
    echo    Backend stopped.
)
echo.

echo ===================================================
echo      ALL SYSTEMS STOPPED
echo ===================================================
echo.
echo You can now close any remaining empty terminal windows.
pause
