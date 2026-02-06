@echo off
echo ===================================================
echo      MASTER SYSTEM RESET: AGROTRACE
echo ===================================================
echo.

echo 1. STOPPING ALL PROCESSES...
taskkill /F /IM node.exe /T 2>nul
taskkill /F /IM python.exe /T 2>nul
echo    All Node.js and Python processes stopped.
echo.

echo 2. RESETTING DATABASE...
cd backend
if exist "agrotrace.db" (
    echo    Deleting old database file...
    del "agrotrace.db"
)
echo    Running DB reset and population script...
python reset_and_populate_db.py
cd ..
echo.

echo 3. RESETTING BLOCKCHAIN...
echo    Cleaning artifacts and cache...
cd blockchain
if exist "artifacts" rmdir /s /q artifacts
if exist "cache" rmdir /s /q cache
cd ..

echo    Removing old frontend contract config...
if exist "frontend\src\contracts\WeedRegistry.json" (
    del "frontend\src\contracts\WeedRegistry.json"
)

echo    Starting fresh blockchain node...
echo    (This will open a new window. MINIMIZE IT, DO NOT CLOSE IT)
start "Hardhat Blockchain Node" cmd /k "d:\WeedDetectionBlockchain\start_blockchain.bat"
echo.

echo 4. WAITING FOR DEPLOYMENT...
echo    Waiting 15 seconds for blockchain to start and deploy contracts...
timeout /t 15 /nobreak >nul
echo.

echo 5. VERIFYING CONFIGURATION...
python verify_config.py
echo.

echo ===================================================
echo      SYSTEM RESET COMPLETE
echo ===================================================
echo Next Steps:
echo 1. Open MetaMask -> Settings -> Advanced -> Clear activity tab data
echo 2. Import "Account #0" from the Blockchain window if not already done.
echo 3. Run 'start_backend.bat' and 'start_frontend.bat'
echo.
pause
