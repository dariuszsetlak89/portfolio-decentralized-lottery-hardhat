const { ethers } = require("hardhat");

//////////////////////////////
// Lottery duration:
//  0 - FAST (5 minutes)
//  1 - MEDIUM (1 hour)
//  2 - LONG (12 hours)
const LOTTERY_DURATION = 1;
//////////////////////////////

//////////////////////////////
// Lottery entrance fee:
//  0 - LOW (0.1 ETH)
//  1 - MEDIUM (1 ETH)
//  2 - HIGH (10 ETH)
const ENTRANCE_FEE = 1;
//////////////////////////////

async function startLottery() {
    let lotteryContract, lottery;

    // Get signers
    [deployer] = await ethers.getSigners();

    // Get contract and connect deployer account
    lotteryContract = await ethers.getContract("Lottery");
    lottery = await lotteryContract.connect(deployer);

    // Entrance fee amount:
    let entranceFeeAmount;
    if (ENTRANCE_FEE == 0) entranceFeeAmount = ethers.utils.parseEther("0.1");
    else if (ENTRANCE_FEE == 1) entranceFeeAmount = ethers.utils.parseEther("1");
    else if (ENTRANCE_FEE == 2) entranceFeeAmount = ethers.utils.parseEther("10");

    console.log("-------------------------------------------------------");

    // Start lottery
    await lottery.startLottery(LOTTERY_DURATION, ENTRANCE_FEE, { value: entranceFeeAmount });
    console.log(`!!! LOTTERY STARTED !!!`);
    console.log(`Deployer started and joined the lottery: ${deployer.address}`);

    // Lottery data parameters
    const lotteryState = await lottery.getLotteryState();
    const lotteryEntranceFee = await lottery.getLotteryEntranceFee();
    const lotteryStartTimeStamp = await lottery.getLotteryStartTimeStamp();
    const lotteryDuration = await lottery.getLotteryDurationTime();
    const lotteryPlayersNumber = await lottery.getLotteryPlayersNumber();
    const lotteryContractBalance = await lottery.getLotteryBalance();
    console.log(`Lottery state (0 - NOT_STARTED, 1 - OPEN, 2 - CALCULATING): ${lotteryState}`);
    console.log(`Entrance fee: ${ethers.utils.formatEther(lotteryEntranceFee)} ETH`);
    console.log(`Lottery start time stamp: ${lotteryStartTimeStamp}`);
    console.log(`Lottery duration: ${lotteryDuration} seconds / ${lotteryDuration / 60} minutes / ${lotteryDuration / 3600} hours`);
    console.log(`Lottery contract balance: ${ethers.utils.formatEther(lotteryContractBalance)} ETH`);
    console.log(`Number of players: ${lotteryPlayersNumber}`);

    console.log("-------------------------------------------------------");
}

startLottery()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
