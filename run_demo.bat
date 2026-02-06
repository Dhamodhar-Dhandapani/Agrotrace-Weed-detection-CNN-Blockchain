@echo off
title AgroTrace - Demo Launcher (Multi-Device Ready)
color 0A

:: ============================================================================
:: CONFIGURATION
:: ============================================================================
set BLOCKCHAIN_HOST=0.0.0.0
set BLOCKCHAIN_PORT=7545
:: ============================================================================

echo ==================================================
echo   Starting AgroTrace Platform (Demo Mode) 🚜
echo ==================================================
echo.
echo This script will launch Backend, Blockchain, and Frontend.
echo All services will be accessible from other devices on the LAN.
echo.

:ASK_RESET
set /P RESET_DB="Do you want to RESET the database/blockchain first? (Y/N): "
if /I "%RESET_DB%" EQU "Y" (
    echo.
    echo [RESETTING SYSTEM...]
    call reset_entire_system.bat
    echo.
    echo System reset complete. Proceeding to launch...
)

echo.
echo 1. Launching Backend API (Flask)...
:: Backend already binds to 0.0.0.0 in app.py
start "AgroTrace Backend" cmd /k "d:\WeedDetectionBlockchain\start_backend.bat"

echo 2. Launching Blockchain Node (Hardhat)...
:: start_blockchain.bat now binds to 0.0.0.0
start "AgroTrace Blockchain" cmd /k "d:\WeedDetectionBlockchain\start_blockchain.bat"

echo.
echo Waiting 15 seconds for Blockchain to initialize...
timeout /t 15 /nobreak >nul

echo 3. Launching Frontend UI (Vite)...
:: start_frontend.bat now uses --host
start "AgroTrace Frontend" cmd /k "d:\WeedDetectionBlockchain\start_frontend.bat"

echo.
echo ==================================================
echo   System is Live!
echo ==================================================
echo.
echo   Access from THIS computer:
echo     Frontend: http://localhost:5173
echo.
echo   Access from OTHER devices (find your IP):
echo     Frontend: http://YOUR_LAN_IP:5173
echo.
echo   NOTE: Remote devices must connect their MetaMask
echo         to http://YOUR_LAN_IP:7545
echo.
pause
exit
