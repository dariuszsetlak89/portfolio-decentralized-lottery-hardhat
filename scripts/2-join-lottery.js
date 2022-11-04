const { ethers } = require("hardhat");

async function joinLottery() {
    console.log("-------------------------------------------------------");

    let lotteryContract, lottery;

    // Get signers
    [deployer, player1, player2, player3, player4] = await ethers.getSigners();

    // Get contract and connect deployer account
    lotteryContract = await ethers.getContract("Lottery");
    lottery = lotteryContract.connect(deployer);

    // Lottery state
    const lotteryState = await lottery.getLotteryState();
    console.log(`Lottery state (0 - NOT_STARTED, 1 - OPEN, 2 - CALCULATING): ${lotteryState}`);

    // Entrance fee
    const lotteryEntranceFee = await lottery.getLotteryEntranceFee();
    console.log(`Entrance fee: ${ethers.utils.formatEther(lotteryEntranceFee)} ETH`);

    // 4 players join the lottery
    // Deployer
    console.log(`Deployer joined lottery: ${deployer.address}`);
    // Player 1
    lottery = lotteryContract.connect(player1);
    await lottery.joinLottery({ value: lotteryEntranceFee });
    console.log(`Player1 join lottery: ${player1.address}`);
    // Player 2
    lottery = lotteryContract.connect(player2);
    await lottery.joinLottery({ value: lotteryEntranceFee });
    console.log(`Player2 join lottery: ${player2.address}`);
    // Player 3
    lottery = lotteryContract.connect(player3);
    await lottery.joinLottery({ value: lotteryEntranceFee });
    console.log(`Player3 join lottery: ${player3.address}`);
    // Player 4
    lottery = lotteryContract.connect(player4);
    await lottery.joinLottery({ value: lotteryEntranceFee });
    console.log(`Player4 join lottery: ${player4.address}`);

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
