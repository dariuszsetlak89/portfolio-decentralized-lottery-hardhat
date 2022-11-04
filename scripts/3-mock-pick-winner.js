const { ethers } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");

// Mock Chainlink Automation function
async function mockChainlinkAutomation() {
    let lotteryContract, lottery, lotteryState, lotteryWinner, lotteryBalance;

    // Get signers
    [deployer] = await ethers.getSigners();

    // Get contract and connect deployer account
    lotteryContract = await ethers.getContract("Lottery");
    lottery = lotteryContract.connect(deployer);

    // Calculate checkData
    const checkData = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(""));

    // Check upkeepNeeded
    const { upkeepNeeded } = await lottery.callStatic.checkUpkeep(checkData);
    console.log("upkeepNeeded:", upkeepNeeded.toString());

    if (upkeepNeeded) {
        // Perform upkeep automated action
        const tx = await lottery.performUpkeep(checkData);
        const txReceipt = await tx.wait(1);
        const requestId = txReceipt.events[1].args.requestId;

        // Lottery state
        lotteryState = await lottery.getLotteryState();
        console.log(`Lottery state (0 - NOT_STARTED, 1 - OPEN, 2 - CALCULATING): ${lotteryState}`);

        // Lottery balance
        lotteryContractBalance = await lottery.getLotteryBalance();
        console.log(`Lottery contract balance: ${ethers.utils.formatEther(lotteryContractBalance)} ETH`);

        console.log(`Performed upkeep with RequestId: ${requestId}`);
        if (developmentChains.includes(network.name)) {
            await mockChainlinkVrf(requestId, lottery);
        }
    } else {
        console.log("No upkeep needed!");
    }
}

// Mock Chainlink VRF function
async function mockChainlinkVrf(requestId, lottery) {
    console.log("Picking the lottery winner...");
    const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
    await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, lottery.address);
    console.log("Winner picked!");

    // Latest lottery winner
    lotteryWinner = await lottery.getLatestLotteryWinner();
    console.log(`Lottery winner is: ${lotteryWinner}`);

    // Lottery state
    lotteryState = await lottery.getLotteryState();
    console.log(`Lottery state (0 - NOT_STARTED, 1 - OPEN, 2 - CALCULATING): ${lotteryState}`);

    // Lottery balance
    lotteryContractBalance = await lottery.getLotteryBalance();
    console.log(`Lottery contract balance: ${ethers.utils.formatEther(lotteryContractBalance)} ETH`);
}

mockChainlinkAutomation()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
