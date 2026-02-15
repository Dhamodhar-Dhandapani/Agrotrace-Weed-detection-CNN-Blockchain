@echo off
title AgroTrace - Demo Launcher (Multi-Device Ready)
color 0A



echo ==================================================
echo   Starting AgroTrace Platform (Demo Mode) 🚜
echo ==================================================
echo.
echo This script will launch Backend, Blockchain, and Frontend.
echo All services will be accessible from other devices on the LAN.
echo.


echo.
echo 1. Launching Backend API (Flask)...
:: Backend already binds to 0.0.0.0 in app.py
start "AgroTrace Backend" cmd /k "d:\WeedDetectionBlockchain\start_backend.bat"


timeout /t 10 /nobreak >nul

echo 2. Launching Frontend UI (Vite)...
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
