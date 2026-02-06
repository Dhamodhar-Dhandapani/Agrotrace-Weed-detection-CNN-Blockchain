# Weed Detection Blockchain Layer

This directory contains the Smart Contracts and Hardhat configuration for the Weed Detection application.

## Prerequisites
- Node.js
- MetaMask (Browser Extension)

## Setup
1.  Install dependencies:
    ```bash
    npm install
    ```

## Development
1.  Start a local blockchain node:
    ```bash
    npx hardhat node
    ```
    This will start a local Ethereum network on `http://127.0.0.1:8545`. It provides 20 test accounts with 10,000 ETH each.

2.  Deploy the contract (in a new terminal):
    ```bash
    npx hardhat run scripts/deploy.js --network localhost
    ```
    **Output:** "WeedRegistry deployed to: 0x..."

3.  **IMPORTANT**: Copy the deployed contract address and update it in `../frontend/src/utils/blockchain.js`:
    ```javascript
    const CONTRACT_ADDRESS = "0xYourDeployedAddress";
    ```

4.  Import one of the private keys from the `npx hardhat node` output into MetaMask to have funds for testing.

## Testing
To run the smart contract tests:
```bash
npx hardhat test
```
