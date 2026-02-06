@echo off
echo ===================================================
echo      FULL BLOCKCHAIN RESET (AGGRESSIVE MODE)
echo ===================================================
echo.
echo 1. KILLING STALE PROCESSES (Node.js)
echo    Closing any running Hardhat nodes to free ports 7545/8545...
taskkill /F /IM node.exe /T 2>nul
echo.

echo 2. NUKING ARTIFACTS & CACHE
cd blockchain
if exist "artifacts" (
    echo    Removing artifacts...
    rmdir /s /q artifacts
)
if exist "cache" (
    echo    Removing cache...
    rmdir /s /q cache
)
cd ..

echo.
echo 3. REMOVING FRONTEND CONTRACT CONFIG
if exist "frontend\src\contracts\WeedRegistry.json" (
    echo    Deleting old contract JSON...
    del "frontend\src\contracts\WeedRegistry.json"
)

echo.
echo 4. CLEANING HARDHAT
cd blockchain
call npx hardhat clean
cd ..

echo.
echo 5. STARTING FRESH BLOCKCHAIN NODE
echo    (This will open a new window. DO NOT CLOSE IT.)
call start_blockchain.bat

echo.
echo ===================================================
echo      RESET COMPLETE
echo ===================================================
echo.
echo NOW FOLLOW THE STEPS IN "FRESH_START_GUIDE.md"
echo to configure MetaMask from scratch.
pause
