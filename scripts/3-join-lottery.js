const { ethers } = require("hardhat");

async function joinLottery() {
    console.log("-------------------------------------------------------");

    // Get signers
    let player1, player2, player3, player4, player5;
    [deployer, player1, player2, player3, player4, player5] = await ethers.getSigners();

    // Get contract and connect deployer account
    let lotteryContract, lottery;
    lotteryContract = await ethers.getContract("Lottery");
    lottery = lotteryContract.connect(deployer);

    // Lottery state
    const lotteryState = await lottery.getLotteryState();
    console.log(`Lottery state (0 - NOT_STARTED, 1 - OPEN, 2 - CALCULATING): ${lotteryState}`);

    // Entrance fee
    const lotteryEntranceFee = await lottery.getLotteryEntranceFee();
    console.log(`Entrance fee: ${ethers.utils.formatEther(lotteryEntranceFee)} ETH`);

    //////////////////////////////
    // Number of players: MAX 5
    const PLAYERS_NUMBER = 1;
    //////////////////////////////

    // Deployer - already started and joined the lottery
    console.log(`Deployer joined lottery: ${deployer.address}`);

    const players = [player1, player2, player3, player4, player5];

    for (let i = 0; i < PLAYERS_NUMBER; i++) {
        lottery = lotteryContract.connect(players[i]);
        await lottery.joinLottery({ value: lotteryEntranceFee });
        console.log(`Player${i + 1} joined lottery: ${players[i].address}`);
    }

    // Number of players
    const lotteryPlayersNumber = await lottery.getLotteryPlayersNumber();
    console.log(`Number of players: ${lotteryPlayersNumber}`);

    // Lottery contract balance
    const lotteryContractBalance = await lottery.getLotteryBalance();
    console.log(`Lottery contract balance: ${ethers.utils.formatEther(lotteryContractBalance)} ETH`);

    console.log("-------------------------------------------------------");
}

joinLottery()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
