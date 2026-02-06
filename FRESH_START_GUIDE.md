# FRESH START GUIDE: Blockchain & MetaMask

Follow these steps EXACTLY to fix "Contract not found" or "Nonce too high" errors.

## Phase 1: Clean Slate
1.  **Close ALL** command prompt/terminal windows.
2.  Run the **Full Reset Script**:
    ```powershell
    d:\WeedDetectionBlockchain\full_blockchain_reset.bat
    ```
3.  Wait for the new window to appear and show "Frontend configuration has been automatically updated".
4.  **KEEP THAT NEW WINDOW OPEN.**

## Phase 2: MetaMask Setup (New/Reinstalled)

1.  **Install MetaMask**: Add the extension to Chrome/Edge if you haven't.
2.  **Create/Import Wallet**: Set up a new wallet (password/seed phrase).

### IMPORT THE TEST ACCOUNT
We need to use the `Account #0` from our local blockchain, not your personal wallet.

1.  Look at the **Blockchain Terminal Window** (the one running the node).
2.  Scroll to the top to see the list of Accounts.
3.  Copy the **Private Key** for `Account #0`:
    *   It looks like: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
4.  Open MetaMask -> Click the **Account Icon** (top circle) -> **Add account or hardware wallet** -> **Import Account**.
5.  Paste the private key and click **Import**.

### ADD THE NETWORK
1.  In MetaMask, click the **Network Dropdown** (top left, usually says "Ethereum Mainnet").
2.  Click **Add network**.
3.  Click **Add a network manually** (bottom).
4.  Enter these EXACT details:
    *   **Network Name**: `Hardhat Localhost`
    *   **New RPC URL**: `http://127.0.0.1:7545`
    *   **Chain ID**: `1337`
    *   **Currency Symbol**: `ETH`
5.  Click **Save**.
6.  Click **Switch to Hardhat Localhost**.

## Phase 3: Run the App
1.  Start the Backend: `d:\WeedDetectionBlockchain\start_backend.bat`
2.  Start the Frontend: `d:\WeedDetectionBlockchain\start_frontend.bat`
3.  Go to `http://localhost:5173`.
4.  If prompted by the black banner, click **Connect Wallet**.
5.  Select the **Imported Account** (Account 2 or similar) that has `10000 ETH`.

**You are now fully connected with a fresh system!**
