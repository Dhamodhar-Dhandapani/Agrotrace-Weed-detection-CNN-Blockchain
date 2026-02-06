const { expect } = require("chai");

describe("WeedRegistry", function () {
    it("Should store and retrieve a detection", async function () {
        const WeedRegistry = await ethers.getContractFactory("WeedRegistry");
        const weedRegistry = await WeedRegistry.deploy();
        // wait for deployment? hardhat-toolbox handles this usually or use .waitForDeployment() in newer versions
        // await weedRegistry.waitForDeployment(); 

        await weedRegistry.storeDetection("QmHash123", "Thistle", 95);

        const count = await weedRegistry.getDetectionCount();
        expect(count).to.equal(1);

        const detection = await weedRegistry.getDetection(0);
        expect(detection.weedType).to.equal("Thistle");
        expect(detection.confidence).to.equal(95);
    });
});
