# Blockchain Setup & Integration Guide

This guide provides step-by-step instructions to set up the local blockchain, deploy the smart contract, and connect the frontend application.

## Prerequisites

- **Node.js** and **npm** installed.
- **MetaMask** browser extension installed.

> [!IMPORTANT]
> **CRITICAL INFO FOR LOCAL DEVELOPMENT:**
> Every time you restart `npx hardhat node`, the blockchain resets to Block 0.
> **MetaMask does not know this** and will get confused (Nonce issues).
> You **MUST** reset your MetaMask account activity after every restart of the blockchain node.
> **How to Reset:** MetaMask -> Settings -> Advanced -> "Clear activity and nonce data" (or "Clear activity tab data").

## 1. Start the Local Blockchain

Open a new terminal and navigate to the `blockchain` directory:

```bash
cd blockchain
npx hardhat node
```

> **Keep this terminal open!** This runs your local blockchain network. You will see a list of accounts with private keys.

## 2. Deploy the Smart Contract

In a **second terminal**, navigate to the `blockchain` directory:

```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```

**What this does automatically:**
1.  Deploys the `WeedRegistry` contract to your local network.
2.  **Updates the Frontend**: Automatically creates/updates `frontend/src/contracts/WeedRegistry.json` with the new contract address and ABI.

## 3. Configure MetaMask

1.  Open MetaMask in your browser.
2.  Click the network selector (top left) -> **Add network**.
3.  Choose **"Add a network manually"**.
4.  Enter the following details (matches `frontend/src/config/blockchain.js`):
    - **Network Name**: Hardhat Localhost
    - **RPC URL**: `http://127.0.0.1:8545/`
    - **Chain ID**: `1337`
    - **Currency Symbol**: `ETH`
5.  **Import an Account**:
    - Go back to the terminal running `npx hardhat node`.
    - Copy the **Private Key** of `Account #0`.
    - In MetaMask, click **Accounts** -> **Import Account** -> Paste the private key.

## 4. Run the Frontend

In a **third terminal**, navigate to the `frontend` directory:

```bash
cd frontend
npm start 
# OR use the provided batch file if available
```

## 5. Troubleshooting

### "Contract address not found"
- **Cause**: You haven't deployed the contract yet, or you deployed it before starting the frontend watcher (sometimes).
- **Fix**: Run the deployment command (Step 2) again.

### "Transaction not found"
- **Cause**: You restarted `npx hardhat node`. This wipes the blockchain history.
- **Fix**: You must **Redeploy the contract** (Step 2) and **Reset your MetaMask account** (Settings -> Advanced -> Clear activity tab data) to fix nonce mismatch errors.

### "Nonce too high"
- **Cause**: MetaMask thinks you have sent X transactions, but the local blockchain was reset.
- **Fix**: In MetaMask: Settings -> Advanced -> **Clear activity tab data**.
