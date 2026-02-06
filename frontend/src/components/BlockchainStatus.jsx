import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { BLOCKCHAIN_CONFIG } from '../config/blockchain';

const BlockchainStatus = () => {
    const [status, setStatus] = useState('loading'); // loading, connected, wrong_network, disconnected, no_wallet
    const [account, setAccount] = useState(null);
    const [chainId, setChainId] = useState(null);
    const [isVisible, setIsVisible] = useState(true);

    const checkConnection = async () => {
        if (!window.ethereum) {
            setStatus('no_wallet');
            return;
        }

        try {
            // Check if we have permission to view accounts
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length === 0) {
                setStatus('disconnected');
            } else {
                setAccount(accounts[0]);

                // Check Chain ID
                const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
                setChainId(currentChainId);

                // Compare calculated hex chainId
                const targetChainIdHex = BLOCKCHAIN_CONFIG.networkId;

                if (currentChainId !== targetChainIdHex && parseInt(currentChainId, 16) !== BLOCKCHAIN_CONFIG.chainId) {
                    setStatus('wrong_network');
                } else {
                    setStatus('connected');
                }
            }
        } catch (err) {
            console.error("Blockchain status check failed:", err);
            setStatus('error');
        }
    };

    useEffect(() => {
        checkConnection();

        if (window.ethereum) {
            window.ethereum.on('accountsChanged', checkConnection);
            window.ethereum.on('chainChanged', checkConnection);
        }

        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener('accountsChanged', checkConnection);
                window.ethereum.removeListener('chainChanged', checkConnection);
            }
        };
    }, []);

    const handleConnect = async () => {
        if (!window.ethereum) return;

        try {
            // 1. Request Account Access
            await window.ethereum.request({ method: 'eth_requestAccounts' });

            // 2. Switch Network
            const { networkId, name, rpcUrls, currency } = BLOCKCHAIN_CONFIG;
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: networkId }],
                });
            } catch (switchError) {
                // This error code indicates that the chain has not been added to MetaMask.
                if (switchError.code === 4902) {
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
                } else {
                    throw switchError;
                }
            }

            // Re-check status
            checkConnection();
        } catch (error) {
            console.error("Connection failed:", error);
            alert("Failed to connect: " + error.message);
        }
    };

    if (status === 'connected' || !isVisible) return null;

    return (
        <div className="bg-gray-900 text-white px-4 py-3 shadow-lg border-b border-gray-800 relative z-50">
            <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                    {status === 'no_wallet' && <WifiOff className="text-red-500" />}
                    {status === 'wrong_network' && <AlertTriangle className="text-yellow-500" />}
                    {status === 'disconnected' && <Wifi className="text-blue-500" />}

                    <span className="font-medium text-sm">
                        {status === 'no_wallet' && "MetaMask is not installed. Blockchain features unavailable."}
                        {status === 'wrong_network' && `Wrong Network detected. Please switch to ${BLOCKCHAIN_CONFIG.name}.`}
                        {status === 'disconnected' && "Wallet disconnected. Connect to access blockchain features."}
                        {status === 'loading' && "Checking blockchain connection..."}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    {status !== 'no_wallet' && status !== 'loading' && (
                        <button
                            onClick={handleConnect}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors
                                ${status === 'wrong_network'
                                    ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                        >
                            {status === 'wrong_network' ? 'Switch Network' : 'Connect Wallet'}
                        </button>
                    )}
                    <button
                        onClick={() => setIsVisible(false)}
                        className="text-gray-400 hover:text-white"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BlockchainStatus;
