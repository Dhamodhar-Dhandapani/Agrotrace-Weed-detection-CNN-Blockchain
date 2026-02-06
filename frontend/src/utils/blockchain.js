import { ethers } from "ethers";
// Import the dynamically generated contract file (created by deploy script)
import WeedRegistry from "../contracts/WeedRegistry.json";
import { BLOCKCHAIN_CONFIG } from "../config/blockchain";

export const connectWallet = async () => {
    if (!window.ethereum) {
        throw new Error("MetaMask is not installed!");
    }

    try {
        await checkAndSwitchNetwork(); // Ensure we are on the correct network
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        return accounts[0];
    } catch (error) {
        console.error("Error connecting wallet:", error);
        throw error;
    }
};

const checkAndSwitchNetwork = async () => {
    const { networkId, chainId: targetChainId, name, rpcUrls, currency } = BLOCKCHAIN_CONFIG;

    try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        // chainId is returned as a hex string (e.g. "0x539")
        if (parseInt(chainId, 16) === targetChainId) return;

        console.log(`Switching network from ${chainId} to ${networkId} (${name})...`);

        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: networkId }],
            });
        } catch (switchError) {
            // This error code indicates that the chain has not been added to MetaMask.
            if (switchError.code === 4902) {
                console.log("Network not found, adding it...");
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [
                        {
                            chainId: networkId,
                            chainName: name,
                            rpcUrls: rpcUrls,
                            nativeCurrency: currency
                        },
                    ],
                });
            } else if (switchError.code === 4001) {
                // User rejected the request
                throw new Error("You must switch to the Hardhat Localhost network to use this app.");
            } else {
                console.error("Failed to switch network:", switchError);
                throw switchError;
            }
        }
    } catch (error) {
        console.error("Network check failed:", error);
        throw error;
    }
};

export const getContract = async () => {
    if (!window.ethereum) throw new Error("MetaMask is not installed!");

    // Check if contract address is available
    if (!WeedRegistry.address) {
        throw new Error("Contract address not found. Please deploy the contract first.");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    return new ethers.Contract(WeedRegistry.address, WeedRegistry.abi, signer);
};

export const storeDetectionOnBlockchain = async (ipfsHash, weedType, confidence) => {
    try {
        await checkAndSwitchNetwork(); // Ensure correct network before transaction
        const contract = await getContract();

        // Confidence is 0-100, might need scaling if contract expects different precision
        // Assuming contract expects integer 0-100
        const tx = await contract.storeDetection(ipfsHash, weedType, Math.floor(confidence));

        console.log("Transaction sent:", tx.hash);
        await tx.wait(); // Wait for confirmation

        return tx.hash;
    } catch (error) {
        console.error("Error storing detection:", error);
        throw error;
    }
};

export const getDetectionDetails = async (txHash) => {
    try {
        const contract = await getContract();
        const provider = contract.runner.provider; // Ethers v6 access to provider

        // 1. Get Transaction Receipt to find the Event Log
        const formattedTxHash = txHash.startsWith("0x") ? txHash : `0x${txHash}`;
        const receipt = await provider.getTransactionReceipt(formattedTxHash);
        if (!receipt) throw new Error("Transaction receipt not found");

        // 2. Parse Logs to find 'DetectionStored' event
        // The event signature is DetectionStored(uint256,address,string,uint256)
        // We can use the contract interface to parse it
        let detectionId = null;

        for (const log of receipt.logs) {
            try {
                const parsedLog = contract.interface.parseLog({
                    topics: log.topics ? [...log.topics] : [], // Ensure topics is an array
                    data: log.data
                });

                if (parsedLog && parsedLog.name === "DetectionStored") {
                    detectionId = parsedLog.args[0]; // First argument is id
                    break;
                }
            } catch (e) {
                // Ignore logs that don't match our event
                continue;
            }
        }

        if (detectionId === null) throw new Error("DetectionStored event not found in transaction");

        // 3. Fetch Data from Contract
        const data = await contract.getDetection(detectionId);

        // 4. Return formatted data
        // Struct: id, ipfsHash, weedType, confidence, timestamp, uploader
        return {
            id: data[0].toString(),
            ipfsHash: data[1],
            weedType: data[2],
            confidence: data[3].toString(),
            timestamp: new Date(Number(data[4]) * 1000).toLocaleString(),
            uploader: data[5]
        };

    } catch (error) {
        console.error("Error fetching detection details:", error);
        // Create a more user-friendly error message
        if (error.message.includes("receipt not found")) {
            throw new Error("Transaction not found on the current blockchain. If you restarted your local hardhat node, previous transaction history is lost.");
        }
        throw error;
    }
};
