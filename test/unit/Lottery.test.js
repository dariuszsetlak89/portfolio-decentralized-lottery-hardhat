const { network, deployments, ethers, getNamedAccounts } = require("hardhat");
const { assert, expect } = require("chai");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery Unit Tests", function () {
          let lottery, vrfCoordinatorV2Mock, deployer, player;
          const chainId = network.config.chainId;

          beforeEach(async () => {
              // Deploy all smart contracts
              await deployments.fixture(["all"]);
              // Use ethers getSigners accounts:
              [deployer, player] = await ethers.getSigners();
              // Get contracts
              lotteryContract = await ethers.getContract("Lottery");
              lottery = lotteryContract.connect(deployer);
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
          });

          describe("constructor", function () {
              it("initializes lottery duration time correctly", async function () {
                  const durationTimeFromCall = await lottery.getLotteryDurationTime();
                  const durationTimeFromHelper = networkConfig[chainId]["durationTime"];
                  assert.equal(durationTimeFromCall.toString(), durationTimeFromHelper);
              });
              it("initializes lottery state correctly", async function () {
                  const lotteryStateFromCall = await lottery.getLotteryState();
                  assert.equal(lotteryStateFromCall.toString(), 0);
              });
              it("initializes lotteryFees mapping values correctly", async function () {
                  const lotteryFeeLowFromCall = await lottery.getLotteryFeesValues(0);
                  const lotteryFeeMediumFromCall = await lottery.getLotteryFeesValues(1);
                  const lotteryFeeHighFromCall = await lottery.getLotteryFeesValues(2);
                  const FEE_LOW = "100000000000000000";
                  const FEE_MEDIUM = "500000000000000000";
                  const FEE_HIGH = "1000000000000000000";
                  assert.equal(lotteryFeeLowFromCall.toString(), FEE_LOW);
                  assert.equal(lotteryFeeMediumFromCall.toString(), FEE_MEDIUM);
                  assert.equal(lotteryFeeHighFromCall.toString(), FEE_HIGH);
              });
          });

          describe("startLottery", function () {
              it("reverts when lottery is already started", async function () {
                  const entranceFeeEnum = 1; // MEDIUM
                  const entranceFee = await lottery.getLotteryFeesValues(entranceFeeEnum);
                  await lottery.startLottery(entranceFeeEnum, { value: entranceFee });
                  await expect(lottery.startLottery(entranceFeeEnum, { value: entranceFee })).to.be.revertedWith(
                      "Lottery__AlreadyStarted"
                  );
              });
              it("set lottery entrance fee LOW correctly", async function () {
                  const entranceFeeEnumLow = 0; // LOW
                  const entranceFeeLow = await lottery.getLotteryFeesValues(entranceFeeEnumLow);
                  await lottery.startLottery(entranceFeeEnumLow, { value: entranceFeeLow });
                  const getEntranceFee = await lottery.getLotteryEntranceFee();
                  assert.equal(getEntranceFee.toString(), entranceFeeLow);
              });
              it("set lottery entrance fee MEDIUM correctly", async function () {
                  const entranceFeeEnumMedium = 1; // MEDIUM
                  const entranceFeeMedium = await lottery.getLotteryFeesValues(entranceFeeEnumMedium);
                  await lottery.startLottery(entranceFeeEnumMedium, { value: entranceFeeMedium });
                  const getEntranceFee = await lottery.getLotteryEntranceFee();
                  assert.equal(getEntranceFee.toString(), entranceFeeMedium);
              });
              it("set lottery entrance fee HIGH correctly", async function () {
                  const entranceFeeEnumHigh = 2; // HIGH
                  const entranceFeeHigh = await lottery.getLotteryFeesValues(entranceFeeEnumHigh);
                  await lottery.startLottery(entranceFeeEnumHigh, { value: entranceFeeHigh });
                  const getEntranceFee = await lottery.getLotteryEntranceFee();
                  assert.equal(getEntranceFee.toString(), entranceFeeHigh);
              });
              it("reverts when entranceFee sent in transaction is not enough", async function () {
                  const entranceFeeEnumLow = 0; // LOW
                  await expect(lottery.startLottery(entranceFeeEnumLow, { value: 0 })).to.be.revertedWith(
                      "Lottery__NotEnoughFeeSent"
                  );
              });
              it("set lottery state to OPEN correctly", async function () {
                  const entranceFeeEnumLow = 0; // LOW
                  const entranceFeeLow = await lottery.getLotteryFeesValues(entranceFeeEnumLow);
                  await lottery.startLottery(entranceFeeEnumLow, { value: entranceFeeLow });
                  const lotteryStateFromCall = await lottery.getLotteryState();
                  assert.equal(lotteryStateFromCall.toString(), 1);
              });
              it("pushes first player's address to lottery players' array correctly", async function () {
                  const entranceFeeEnumLow = 0; // LOW
                  const entranceFeeLow = await lottery.getLotteryFeesValues(entranceFeeEnumLow);
                  await lottery.startLottery(entranceFeeEnumLow, { value: entranceFeeLow });
                  const firstPlayerAddress = await lottery.getLotteryPlayersArray();
                  assert.equal(firstPlayerAddress[0].toString(), deployer.address);
              });
              it("set lottery starting time stamp correctly", async function () {
                  const entranceFeeEnumLow = 0; // LOW
                  const entranceFeeLow = await lottery.getLotteryFeesValues(entranceFeeEnumLow);
                  await lottery.startLottery(entranceFeeEnumLow, { value: entranceFeeLow });
                  const lotteryTimeStamp = await lottery.getLotteryStartTimeStamp();
                  assert(lotteryTimeStamp.toString() > 0);
              });
              it("emits an event when lottery started properly", async function () {
                  const entranceFeeEnumLow = 0; // LOW
                  const entranceFeeLow = await lottery.getLotteryFeesValues(entranceFeeEnumLow);
                  await expect(lottery.startLottery(entranceFeeEnumLow, { value: entranceFeeLow }))
                      .to.emit(lottery, "LotteryStarted")
                      .withArgs(entranceFeeEnumLow, deployer.address);
              });
          });

          describe("joinLottery", function () {
              it("reverts when lottery is not in OPEN state", async function () {
                  const entranceFeeEnumLow = 0; // LOW
                  const entranceFeeLow = await lottery.getLotteryFeesValues(entranceFeeEnumLow);
                  await expect(lottery.joinLottery({ value: entranceFeeLow })).to.be.revertedWith("Lottery__NotOpen");
              });
              it("doesn't allow join when the lottery is in CALCULATING state", async function () {
                  const entranceFeeEnumLow = 0; // LOW
                  const entranceFeeLow = await lottery.getLotteryFeesValues(entranceFeeEnumLow);
                  await lottery.startLottery(entranceFeeEnumLow, { value: entranceFeeLow });
                  const durationTime = await lottery.getLotteryDurationTime();
                  await network.provider.send("evm_increaseTime", [durationTime.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
                  // Pretend to be a Chainlink Automation node
                  await lottery.performUpkeep([]);
                  const lotteryState = await lottery.getLotteryState();
                  await expect(lottery.joinLottery({ value: entranceFeeLow })).to.be.revertedWith("Lottery__NotOpen");
              });
              it("reverts when entranceFee sent in transaction is not enough", async function () {
                  const entranceFeeEnumLow = 0; // LOW
                  const entranceFeeLow = await lottery.getLotteryFeesValues(entranceFeeEnumLow);
                  await lottery.startLottery(entranceFeeEnumLow, { value: entranceFeeLow });
                  await expect(lottery.joinLottery({ value: 0 })).to.be.revertedWith("Lottery__NotEnoughFeeSent");
              });
              it("pushes join player's address to lottery players' array correctly", async function () {
                  const entranceFeeEnumLow = 0; // LOW
                  const entranceFeeLow = await lottery.getLotteryFeesValues(entranceFeeEnumLow);
                  await lottery.startLottery(entranceFeeEnumLow, { value: entranceFeeLow });
                  lottery = lotteryContract.connect(player);
                  await lottery.joinLottery({ value: entranceFeeLow });
                  const joinPlayerAddress = await lottery.getLotteryPlayersArray();
                  assert.equal(joinPlayerAddress[1].toString(), player.address);
              });
              it("emits an event when player join already started lottery", async function () {
                  const entranceFeeEnumLow = 0; // LOW
                  const entranceFeeLow = await lottery.getLotteryFeesValues(entranceFeeEnumLow);
                  await lottery.startLottery(entranceFeeEnumLow, { value: entranceFeeLow });
                  lottery = lotteryContract.connect(player);
                  await expect(lottery.joinLottery({ value: entranceFeeLow }))
                      .to.emit(lottery, "LotteryJoined")
                      .withArgs(player.address);
              });
          });

          describe("checkUpkeep", function () {
              it("returns false if lottery is not in OPEN state", async function () {
                  const entranceFeeEnumLow = 0; // LOW
                  const entranceFeeLow = await lottery.getLotteryFeesValues(entranceFeeEnumLow);
                  await lottery.startLottery(entranceFeeEnumLow, { value: entranceFeeLow });
                  const durationTime = await lottery.getLotteryDurationTime();
                  await network.provider.send("evm_increaseTime", [durationTime.toNumber() + 1]); // Duration time passed!
                  await network.provider.send("evm_mine", []);
                  // Pretend to be a Chainlink Automation node
                  await lottery.performUpkeep("0x"); // ([]) == ("0x")
                  const lotteryState = await lottery.getLotteryState();
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x");
                  assert.equal(lotteryState.toString(), "2");
                  assert.equal(upkeepNeeded, false);
              });
              it("returns false when lottery duration time hasn't passed yet", async function () {
                  const entranceFeeEnumLow = 0; // LOW
                  const entranceFeeLow = await lottery.getLotteryFeesValues(entranceFeeEnumLow);
                  await lottery.startLottery(entranceFeeEnumLow, { value: entranceFeeLow });
                  const durationTime = await lottery.getLotteryDurationTime();
                  await network.provider.send("evm_increaseTime", [durationTime.toNumber() - 1]); // Duration time didn't pass!
                  await network.provider.send("evm_mine", []);
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x");
                  assert(upkeepNeeded == false);
              });
              it("returns false if nobody join lottery and no ETH has been sent", async function () {
                  const durationTime = await lottery.getLotteryDurationTime();
                  await network.provider.send("evm_increaseTime", [durationTime.toNumber() - 1]); // Duration time didn't pass!
                  await network.provider.send("evm_mine", []);
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x");
                  assert(upkeepNeeded == false);
              });
              it("returns true when lottery state is OPEN, has players, has balance and duration time passed", async function () {
                  const entranceFeeEnumLow = 0; // LOW
                  const entranceFeeLow = await lottery.getLotteryFeesValues(entranceFeeEnumLow);
                  await lottery.startLottery(entranceFeeEnumLow, { value: entranceFeeLow });
                  const durationTime = await lottery.getLotteryDurationTime();
                  await network.provider.send("evm_increaseTime", [durationTime.toNumber() + 1]); // Duration time passed!
                  await network.provider.send("evm_mine", []);
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x");
                  assert(upkeepNeeded == true);
              });
          });

          describe("performUpkeep", function () {
              it("reverts when checkupkeep is false", async function () {
                  await expect(lottery.performUpkeep([])).to.be.revertedWith("Lottery__UpkeepNotNeeded");
              });
              it("run ONLY when checkupkeep is true", async function () {
                  const entranceFeeEnumLow = 0; // LOW
                  const entranceFeeLow = await lottery.getLotteryFeesValues(entranceFeeEnumLow);
                  await lottery.startLottery(entranceFeeEnumLow, { value: entranceFeeLow });
                  const durationTime = await lottery.getLotteryDurationTime();
                  await network.provider.send("evm_increaseTime", [durationTime.toNumber() + 1]); // Duration time passed!
                  await network.provider.send("evm_mine", []);
                  const performUpkeepTx = await lottery.performUpkeep([]); // returns object
                  assert(performUpkeepTx); // check if there is a transaction = performUpkeepTx object not empty
              });
              it("updates the lottery state to CALCULATING", async function () {
                  const entranceFeeEnumLow = 0; // LOW
                  const entranceFeeLow = await lottery.getLotteryFeesValues(entranceFeeEnumLow);
                  await lottery.startLottery(entranceFeeEnumLow, { value: entranceFeeLow });
                  const durationTime = await lottery.getLotteryDurationTime();
                  await network.provider.send("evm_increaseTime", [durationTime.toNumber() + 1]); // Duration time passed!
                  await network.provider.send("evm_mine", []);
                  lottery.performUpkeep([]);
                  const lotteryState = await lottery.getLotteryState();
                  assert.equal(lotteryState.toString(), "2");
              });
              it("calls the VRF coordinator function requestRandomWords", async function () {
                  const entranceFeeEnumLow = 0; // LOW
                  const entranceFeeLow = await lottery.getLotteryFeesValues(entranceFeeEnumLow);
                  await lottery.startLottery(entranceFeeEnumLow, { value: entranceFeeLow });
                  const durationTime = await lottery.getLotteryDurationTime();
                  await network.provider.send("evm_increaseTime", [durationTime.toNumber() + 1]); // Duration time passed!
                  await network.provider.send("evm_mine", []);
                  const performUpkeepTxResponse = await lottery.performUpkeep([]); // emits requestId
                  const performUpkeepTxReceipt = await performUpkeepTxResponse.wait(1); // waits 1 block
                  // event[0] - emited by function requestRandomWords(), event[1] - emited by event LotteryWinnerRequested
                  const requestId = performUpkeepTxReceipt.events[1].args.requestId;
                  assert(requestId.toString() > 0); // toString() or toNumber()
              });
              it("emits an event when performUpkeep function is done", async function () {
                  const entranceFeeEnumLow = 0; // LOW
                  const entranceFeeLow = await lottery.getLotteryFeesValues(entranceFeeEnumLow);
                  await lottery.startLottery(entranceFeeEnumLow, { value: entranceFeeLow });
                  const durationTime = await lottery.getLotteryDurationTime();
                  await network.provider.send("evm_increaseTime", [durationTime.toNumber() + 1]); // Duration time passed!
                  await network.provider.send("evm_mine", []);
                  const performUpkeepTxResponse = await lottery.performUpkeep([]); // emits requestId
                  const performUpkeepTxReceipt = await performUpkeepTxResponse.wait(1); // waits 1 block
                  // 2 events: event[0] - emited by function requestRandomWords(), event[1] - emited by event LotteryWinnerRequested
                  const requestId = performUpkeepTxReceipt.events[1].args.requestId;
                  await expect(performUpkeepTxResponse).to.emit(lottery, "LotteryWinnerRequested").withArgs(requestId);
              });
          });

          describe("fulfillRandomWords", function () {
              beforeEach(async function () {
                  // Start the lottery
                  const entranceFeeEnumHigh = 2; // HIGH
                  const entranceFeeHigh = await lottery.getLotteryFeesValues(entranceFeeEnumHigh);
                  await lottery.startLottery(entranceFeeEnumHigh, { value: entranceFeeHigh });
                  // Additional players join the lottery
                  const additionalPlayers = 9; // max: deployer + 19 players = 20 players
                  let newPlayers = await ethers.getSigners();
                  for (let i = 1; i <= additionalPlayers; i++) {
                      lottery = lotteryContract.connect(newPlayers[i]);
                      await lottery.joinLottery({ value: entranceFeeHigh });
                  }
                  // Pass the time
                  lottery = lotteryContract.connect(deployer);
                  const durationTime = await lottery.getLotteryDurationTime();
                  await network.provider.send("evm_increaseTime", [durationTime.toNumber() + 1]); // Duration time passed!
                  await network.provider.send("evm_mine", []);
              });
              it("can only be called after performUpkeep function has been called", async function () {
                  await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0, lottery.address)).to.be.revertedWith(
                      "nonexistent request"
                  );
                  await expect(vrfCoordinatorV2Mock.fulfillRandomWords(1, lottery.address)).to.be.revertedWith(
                      "nonexistent request"
                  );
                  await expect(vrfCoordinatorV2Mock.fulfillRandomWords(2, lottery.address)).to.be.revertedWith(
                      "nonexistent request"
                  );
              });
              it("set current winner address as latest lottery winner", async function () {
                  // Check upkeepNeeded
                  await lottery.callStatic.checkUpkeep([]);
                  // Perform upkeep automated action
                  const performUpkeepTx = await lottery.performUpkeep([]);
                  const performUpkeepTxReceipt = await performUpkeepTx.wait(1);
                  const requestId = performUpkeepTxReceipt.events[1].args.requestId;
                  // Mock Chainlink VRF function fulfillrandomWords
                  await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, lottery.address);
                  // Latest lottery winner
                  latestLotteryWinner = await lottery.getLatestLotteryWinner();
                  expectedLotteryWinner = player; // Mock always choose player1 as a winner
                  assert.equal(latestLotteryWinner.toString(), expectedLotteryWinner.address);
              });
              it("set lottery state to CLOSE after winner picked", async function () {
                  // Check upkeepNeeded
                  await lottery.callStatic.checkUpkeep([]);
                  // Perform upkeep automated action
                  const performUpkeepTx = await lottery.performUpkeep([]);
                  const performUpkeepTxReceipt = await performUpkeepTx.wait(1);
                  const requestId = performUpkeepTxReceipt.events[1].args.requestId;
                  // Mock Chainlink VRF function fulfillrandomWords
                  await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, lottery.address);
                  const lotteryState = await lottery.getLotteryState();
                  assert.equal(lotteryState, 0); // 0 - CLOSE
              });
              it("resets the lottery participants addresses array", async function () {
                  // Check upkeepNeeded
                  await lottery.callStatic.checkUpkeep([]);
                  // Perform upkeep automated action
                  const performUpkeepTx = await lottery.performUpkeep([]);
                  const performUpkeepTxReceipt = await performUpkeepTx.wait(1);
                  const requestId = performUpkeepTxReceipt.events[1].args.requestId;
                  // Mock Chainlink VRF function fulfillrandomWords
                  await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, lottery.address);
                  const lotteryPlayersArray = await lottery.getLotteryPlayersArray();
                  assert.equal(lotteryPlayersArray.length, 0);
              });
              it("transfers lottery funds to the lottery winner", async function () {
                  const winnerBalanceBefore = ethers.utils.formatEther(await player.getBalance()); // player is a lottery winner
                  const lotteryBalanceBefore = ethers.utils.formatEther(await lottery.getLotteryBalance());
                  // Check upkeepNeeded
                  await lottery.callStatic.checkUpkeep([]);
                  // Perform upkeep automated action
                  const performUpkeepTx = await lottery.performUpkeep([]);
                  const performUpkeepTxReceipt = await performUpkeepTx.wait(1);
                  const requestId = performUpkeepTxReceipt.events[1].args.requestId;
                  // Mock Chainlink VRF function fulfillrandomWords
                  await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, lottery.address);
                  const winnerBalanceAfter = Number(winnerBalanceBefore) + Number(lotteryBalanceBefore);
                  const lotteryPrize = ethers.utils.formatEther(await lottery.getLotteryFeesValues(2)) * 10;
                  const winnerBalanceBeforePlusLotteryPrize = Number(winnerBalanceBefore) + Number(lotteryPrize);
                  assert.equal(winnerBalanceAfter.toString(), winnerBalanceBeforePlusLotteryPrize.toString());
              });
              it("transfers lottery funds to the lottery winner", async function () {
                  const lotteryBalance = await lottery.getLotteryBalance();
                  // Check upkeepNeeded
                  await lottery.callStatic.checkUpkeep([]);
                  // Perform upkeep automated action
                  const performUpkeepTx = await lottery.performUpkeep([]);
                  const performUpkeepTxReceipt = await performUpkeepTx.wait(1);
                  const requestId = performUpkeepTxReceipt.events[1].args.requestId;
                  // Mock Chainlink VRF function fulfillrandomWords
                  const fulfillRandomWordsTx = await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, lottery.address);
                  await expect(fulfillRandomWordsTx).to.emit(lottery, "WinnerPicked").withArgs(player.address, lotteryBalance);
              });
          });

          describe("getLotteryState", async () => {
              it("returns current lottery state", async () => {
                  const entranceFeeEnumLow = 0; // LOW
                  const entranceFeeLow = await lottery.getLotteryFeesValues(entranceFeeEnumLow);
                  await lottery.startLottery(entranceFeeEnumLow, { value: entranceFeeLow });
                  const lotteryState = await lottery.getLotteryState();
                  assert.equal(lotteryState, 1); // 1 - OPEN
              });
          });

          describe("getLotteryEntranceFee", async () => {
              it("returns current lottery entrance fee", async () => {
                  const entranceFeeEnumLow = 0; // LOW
                  const entranceFeeLow = await lottery.getLotteryFeesValues(entranceFeeEnumLow);
                  await lottery.startLottery(entranceFeeEnumLow, { value: entranceFeeLow });
                  const lotteryEntranceFee = await lottery.getLotteryEntranceFee();
                  assert.equal(lotteryEntranceFee.toString(), entranceFeeLow);
              });
          });

          describe("getLotteryStartTimeStamp", async () => {
              it("returns current lottery start time stamp", async () => {
                  const entranceFeeEnumLow = 0; // LOW
                  const entranceFeeLow = await lottery.getLotteryFeesValues(entranceFeeEnumLow);
                  await lottery.startLottery(entranceFeeEnumLow, { value: entranceFeeLow });
                  const lotteryStartTimeStamp = await lottery.getLotteryStartTimeStamp();
                  assert(lotteryStartTimeStamp.toString() > 0);
              });
          });

          describe("getLotteryPlayersArray", async () => {
              it("returns current lottery players array", async () => {
                  const entranceFeeEnumLow = 0; // LOW
                  const entranceFeeLow = await lottery.getLotteryFeesValues(entranceFeeEnumLow);
                  await lottery.startLottery(entranceFeeEnumLow, { value: entranceFeeLow });
                  const lotteryPlayersArray = await lottery.getLotteryPlayersArray();
                  assert.equal(lotteryPlayersArray[0].toString(), deployer.address);
              });
          });

          describe("getLotteryPlayersNumber", async () => {
              it("returns current lottery players number", async () => {
                  const entranceFeeEnumLow = 0; // LOW
                  const entranceFeeLow = await lottery.getLotteryFeesValues(entranceFeeEnumLow);
                  await lottery.startLottery(entranceFeeEnumLow, { value: entranceFeeLow });
                  const lotteryPlayersNumber = await lottery.getLotteryPlayersNumber();
                  assert.equal(lotteryPlayersNumber, 1);
              });
          });

          describe("getLatestLotteryWinner", async () => {
              it("returns latest lottery winner's address", async () => {
                  const entranceFeeEnumLow = 0; // LOW
                  const entranceFeeLow = await lottery.getLotteryFeesValues(entranceFeeEnumLow);
                  await lottery.startLottery(entranceFeeEnumLow, { value: entranceFeeLow });
                  const latestLotteryWinner = await lottery.getLatestLotteryWinner();
                  const expectedLatestLotteryWinner = "0x0000000000000000000000000000000000000000";
                  assert.equal(latestLotteryWinner, expectedLatestLotteryWinner);
              });
          });

          describe("getLotteryDurationTime", async () => {
              it("returns lottery duration time", async () => {
                  const entranceFeeEnumLow = 0; // LOW
                  const entranceFeeLow = await lottery.getLotteryFeesValues(entranceFeeEnumLow);
                  await lottery.startLottery(entranceFeeEnumLow, { value: entranceFeeLow });
                  const lotteryDurationTime = await lottery.getLotteryDurationTime();
                  const expectedDurationTime = networkConfig[chainId]["durationTime"];
                  assert.equal(lotteryDurationTime, expectedDurationTime);
              });
          });

          describe("getLotteryBalance", async () => {
              it("returns current lottery balance", async () => {
                  const entranceFeeEnumLow = 0; // LOW
                  const entranceFeeLow = await lottery.getLotteryFeesValues(entranceFeeEnumLow);
                  await lottery.startLottery(entranceFeeEnumLow, { value: entranceFeeLow });
                  const lotteryBalance = await lottery.getLotteryBalance();
                  assert.equal(lotteryBalance.toString(), entranceFeeLow);
              });
          });

          describe("getLotteryFeesValues", async () => {
              it("returns current lottery fees values", async () => {
                  const entranceFeeLow = await lottery.getLotteryFeesValues(0);
                  const entranceFeeMedium = await lottery.getLotteryFeesValues(1);
                  const entranceFeeHigh = await lottery.getLotteryFeesValues(2);
                  assert.equal(entranceFeeLow.toString(), "100000000000000000");
                  assert.equal(entranceFeeMedium.toString(), "500000000000000000");
                  assert.equal(entranceFeeHigh.toString(), "1000000000000000000");
              });
          });

          describe("receive", async () => {
              it("should invoke the `receive` function and receive ETH payment", async () => {
                  const [signer] = await ethers.getSigners();
                  const ethAmount = ethers.utils.parseEther("1");
                  const tx = signer.sendTransaction({ to: lottery.address, data: "0x", value: ethAmount });
                  await expect(tx).to.emit(lottery, "NewTransferReceived").withArgs(ethAmount);
                  const balance = ethers.utils.formatEther(await lottery.getLotteryBalance()).toString();
                  console.log("Lottery balance after receive function call:", balance.toString());
              });
          });

          describe("fallback", async () => {
              it("should invoke the `fallback` function and receive ETH payment", async () => {
                  const [signer] = await ethers.getSigners();
                  const ethAmount = ethers.utils.parseEther("1");
                  const tx = signer.sendTransaction({ to: lottery.address, data: "0x01", value: ethAmount });
                  await expect(tx).to.emit(lottery, "NewTransferReceived").withArgs(ethAmount);
                  const balance = ethers.utils.formatEther(await lottery.getLotteryBalance()).toString();
                  console.log("Lottery balance after fallback function call:", balance.toString());
              });
          });
      });
