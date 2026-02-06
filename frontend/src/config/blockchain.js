// ==============================================================================
// BLOCKCHAIN NETWORK CONFIGURATION
// ==============================================================================
// Change these values to match your setup:
// - HOST: '127.0.0.1' for local only, or '0.0.0.0' or specific LAN IP for external access
// - PORT: 8545 is the standard Hardhat port
export const BLOCKCHAIN_HOST = '127.0.0.1';
export const BLOCKCHAIN_PORT = 7545;
export const NETWORK_ID = 1337; // Standard Hardhat Chain ID

/**
 * Global Blockchain Configuration
 * Used by: utils/blockchain.js and checks
 */
export const BLOCKCHAIN_CONFIG = {
    // Local Hardhat Network
    // This MUST match the chainId in blockchain/hardhat.config.js
    chainId: NETWORK_ID,
    networkId: '0x' + NETWORK_ID.toString(16), // Hex for 1337 (0x539)
    name: 'Hardhat Localhost',
    rpcUrls: [`http://${BLOCKCHAIN_HOST}:${BLOCKCHAIN_PORT}/`],
    currency: {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18
    }
};
