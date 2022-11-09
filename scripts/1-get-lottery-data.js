const { ethers } = require("hardhat");

//////////////////////////////
// Lottery entrance fee:
//  0 - LOW (0.1 ETH)
//  1 - MEDIUM (0.5 ETH)
//  2 - HIGH (1 ETH)
const ENTRANCE_FEE = 2;
//////////////////////////////

async function getLotteryData() {
    let lotteryContract, lottery;

    // Get signers
    [deployer] = await ethers.getSigners();

    // Get contract and connect deployer account
    lotteryContract = await ethers.getContract("Lottery");
    lottery = lotteryContract.connect(deployer);

    console.log("-------------------------------------------------------");

    //// Lottery data parameters
    // Lottery state
    const lotteryState = await lottery.getLotteryState();
    console.log(`Lottery state (0 - CLOSE, 1 - OPEN, 2 - CALCULATING): ${lotteryState}`);
    // Lottery entrance fee
    const lotteryEntranceFee = await lottery.getLotteryEntranceFee();
    console.log(`Entrance fee: ${ethers.utils.formatEther(lotteryEntranceFee)} ETH`);
    // Lottery start time stamp
    const lotteryStartTimeStamp = await lottery.getLotteryStartTimeStamp();
    console.log(`Lottery start time stamp: ${lotteryStartTimeStamp}`);
    // Lottery duration time in seconds
    const lotteryDuration = await lottery.getLotteryDurationTime();
    console.log(`Lottery duration: ${lotteryDuration} seconds / ${lotteryDuration / 60} minutes`);
    // Lottery players number
    const lotteryPlayersNumber = await lottery.getLotteryPlayersNumber();
    console.log(`Number of players: ${lotteryPlayersNumber}`);
    // Lottery contract balance
    const lotteryContractBalance = await lottery.getLotteryBalance();
    console.log(`Lottery contract balance: ${ethers.utils.formatEther(lotteryContractBalance)} ETH`);
    // Latest lottery winner
    const getLatestLotteryWinner = await lottery.getLatestLotteryWinner();
    console.log(`Latest lottery winner: ${getLatestLotteryWinner}`);

    console.log("-------------------------------------------------------");
}

getLotteryData()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
