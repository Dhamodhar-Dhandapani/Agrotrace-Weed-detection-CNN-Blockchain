# Blockchain Configuration & Troubleshooting Guide

## How to Change the Blockchain IP Address

If you want to access the blockchain from another device (e.g., your phone or another computer) or if you need to bind to a specific network interface.

### 1. Update the Startup Scripts
Edit `run_demo.bat` (and `start_blockchain.bat` if you use it individually):

```bat
:: Change 127.0.0.1 to 0.0.0.0 to allow access from ANY device on your network
:: Or set it to your specific LAN IP (e.g., 192.168.1.50)
set BLOCKCHAIN_HOST=0.0.0.0
set BLOCKCHAIN_PORT=8545
```

### 2. Update the Frontend Configuration
Edit `frontend/src/config/blockchain.js` to match the IP you set above.

```javascript
// If you set 0.0.0.0 in the bat file, you should use your computer's LAN IP here
// so other devices can find it (e.g., '192.168.1.50')
// If just running locally, '127.0.0.1' is fine.
export const BLOCKCHAIN_HOST = '127.0.0.1'; 
export const BLOCKCHAIN_PORT = 8545;
```

---

## "Transaction not found" Error

### The Cause
This error happens because you are running a **Local Hardhat Network**. 
*   This network is **ephemeral** (temporary).
*   Every time you close the `AgroTrace Blockchain` window or restart the computer, the blockchain **resets completely** to block 0.
*   The "history" of transactions is lost, but your browser (MetaMask) or database might still "remember" the old transaction hashes.

### The Fix
1.  **Keep the Blockchain Running**: Do not close the "AgroTrace Blockchain" terminal window unless necessary.
2.  **Reset MetaMask**: If you restarted the blockchain:
    *   Open MetaMask.
    *   Go to **Settings > Advanced**.
    *   Click **Clear Activity Tab Data** (or "Reset Account" in older versions).
    *   This forces MetaMask to forget the old (now non-existent) transactions nonce.
3.  **Redeploy**: When the blockchain restarts, the smart contract is gone. The `run_demo.bat` script automatically redeploys it for you, but you get a **new contract address**.
    *   The frontend should automatically pick up the new artifact if the deployment script updates the JSON file correctly.
