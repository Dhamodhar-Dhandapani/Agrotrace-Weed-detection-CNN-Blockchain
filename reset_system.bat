@echo off
title AgroTrace - System Reset
color 0C

echo ==================================================
echo   AgroTrace System Reset Tool ⚠️
echo ==================================================
echo.
echo This tool will:
echo 1. WIPE the backend database (clearing all saved detections).
echo 2. You should checking if 'npx hardhat node' is running.
echo.
echo use this when you see "Transaction not found" errors.
echo.
echo Are you sure you want to proceed?
pause

echo.
echo 1. Clearing Backend Database...
cd backend
IF EXIST ..\venv\Scripts\activate.bat (call ..\venv\Scripts\activate.bat)
python clear_database.py
cd ..

echo.
echo ==================================================
echo   System Reset Complete!
echo   1. Restart 'run_demo.bat'
echo   2. RESET METAMASK (Settings -> Advanced -> Clear activity data)
echo ==================================================
pause
