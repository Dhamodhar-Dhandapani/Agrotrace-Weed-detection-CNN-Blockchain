require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.24",
    networks: {
        hardhat: {
            chainId: 1337 // Standard for local development
        },
        localhost: {
            url: "http://127.0.0.1:7545",
            chainId: 1337
        }
        // Add other networks (sepolia, etc.) here if needed
    },
    paths: {
        artifacts: "./artifacts",
        cache: "./cache",
        sources: "./contracts",
        tests: "./test",
    },
};
