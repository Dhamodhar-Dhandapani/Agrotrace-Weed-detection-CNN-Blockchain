@echo off
setlocal

:: ============================================================================
:: CONFIGURATION
:: ============================================================================
set BLOCKCHAIN_HOST=0.0.0.0
set BLOCKCHAIN_PORT=7545
:: ============================================================================

echo [INFO] Moving to blockchain directory...
pushd blockchain || (
    echo [ERROR] Could not find 'blockchain' directory.
    pause
    exit /b 1
)

echo [INFO] Starting Hardhat Node on %BLOCKCHAIN_HOST%:%BLOCKCHAIN_PORT%...
echo [INFO] (A new window will open for the node)
start "Hardhat Node" cmd /k "npx hardhat node --hostname %BLOCKCHAIN_HOST% --port %BLOCKCHAIN_PORT%"

echo [INFO] Waiting 10 seconds for node to initialize...
timeout /t 10 /nobreak

echo [INFO] Deploying Contracts...
call npx hardhat run scripts/deploy.js --network localhost
if errorlevel 1 (
    echo [ERROR] Deployment failed. Is the node running? Check the other window.
    popd
    pause
    exit /b 1
)

echo.
echo ==========================================================
echo [SUCCESS] Blockchain setup complete! 
echo [SUCCESS] Frontend configuration has been automatically updated.
echo ==========================================================
echo.
echo [NOTE] DO NOT CLOSE THE "Hardhat Node" WINDOW.
echo.

popd
pause
