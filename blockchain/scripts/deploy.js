const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const WeedRegistry = await hre.ethers.getContractFactory("WeedRegistry");
    const weedRegistry = await WeedRegistry.deploy();

    await weedRegistry.waitForDeployment();

    const contractAddress = await weedRegistry.getAddress();
    console.log("WeedRegistry deployed to:", contractAddress);

    // Save address and ABI to frontend
    saveFrontendFiles(contractAddress);
}

function saveFrontendFiles(contractAddress) {
    const contractsDir = path.join(__dirname, "..", "..", "frontend", "src", "contracts");

    if (!fs.existsSync(contractsDir)) {
        fs.mkdirSync(contractsDir, { recursive: true });
    }

    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "WeedRegistry.sol", "WeedRegistry.json");
    if (!fs.existsSync(artifactPath)) {
        console.error("Artifact not found at:", artifactPath);
        return;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath));

    const contractData = {
        address: contractAddress,
        abi: artifact.abi
    };

    // Verify artifact exists before writing
    if (!contractData.abi || contractData.abi.length === 0) {
        console.error("CRITICAL ERROR: Contract ABI is empty! Deployment failed to capture contract details.");
        return;
    }

    fs.writeFileSync(
        path.join(contractsDir, "WeedRegistry.json"),
        JSON.stringify(contractData, null, 2)
    );

    console.log("✅ Frontend configuration updated at:", path.join(contractsDir, "WeedRegistry.json"));
    console.log("--------------------------------------------------");
    console.log("  AUTOMATION SUCCESS: Contract address updated in frontend.");
    console.log("  DO NOT COPY MANUALLY.");
    console.log("--------------------------------------------------");
    console.log("IMPORTANT: If you restarted `npx hardhat node`, you MUST reset your MetaMask account!");
    console.log("MetaMask -> Settings -> Advanced -> Clear activity tab data");
    console.log("--------------------------------------------------");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
