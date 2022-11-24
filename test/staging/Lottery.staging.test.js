const { assert, expect } = require("chai");
const { getNamedAccounts, ethers, network } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

/////////////////////////////////////////////////////////////
// Entrance fee choice:
// 0 - LOW      0.1 ETH
// 1 - MEDIUM   0.5 ETH
// 2 - HIGH     1 ETH
const FEE = 2;
/////////////////////////////////////////////////////////////

// Staging test runs only on test network - Goerli
developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery Staging Tests", function () {
          let lottery, deployer;

          beforeEach(async function () {
              // Get accounts: deployer
              deployer = (await getNamedAccounts()).deployer;
              // Get contract: Lottery
              lottery = await ethers.getContract("Lottery", deployer);
          });

          describe("fulfillRandomWords", function () {
              it("works with live Chainlink Automation and Chainlink VRF to get a random lottery winner", async function () {
                  // Get signers
                  const accounts = await ethers.getSigners();
                  // Winner starting balance - account[0] is the only player, so also the winner
                  const winnerStartingBalance = await accounts[0].getBalance();
                  console.log("Winner starting balance:", ethers.utils.formatEther(winnerStartingBalance));
                  // 1) Setup listener before start the lottery
                  await new Promise(async (resolve, reject) => {
                      lottery.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!");
                          try {
                              // Lottery winner
                              const lotteryWinner = await lottery.getLatestLotteryWinner();
                              console.log("Winner!:", lotteryWinner.toString());
                              // Lottery state
                              const lotteryState = await lottery.getLotteryState();
                              console.log("Lottery state:", lotteryState.toString());
                              // Players array length
                              const playersArrayLength = await lottery.getLotteryPlayersNumber();
                              console.log("Players array length:", playersArrayLength.toString());
                              // Winner ending balance
                              const winnerEndingBalance = await accounts[0].getBalance();
                              console.log("Winner ending balance:", ethers.utils.formatEther(winnerEndingBalance));
                              // Asserts
                              // Check if recent winner is account[0], which is an only player
                              assert.equal(lotteryWinner.toString(), accounts[0].address);
                              // Check if lotteryState is CLOSE, after picking lotteryWinner
                              assert.equal(lotteryState, 0);
                              // Expected player's array length = 0
                              assert.equal(playersArrayLength, 0);
                              // Check if money have been transfered correctly to the lotteryWinner
                              assert.equal(winnerEndingBalance.toString(), winnerBalanceAfterJoin.add(entranceFee).toString());
                              resolve();
                          } catch (error) {
                              console.log(error);
                              reject(error);
                          }
                      });
                      // 2) Then start the lottery
                      console.log("Start the lottery...");
                      const entranceFee = await lottery.getLotteryFeesValues(FEE);
                      // Start the lottery
                      const startLotteryTx = await lottery.startLottery(FEE, { value: entranceFee });
                      await startLotteryTx.wait(1);
                      // Winner balance after join the lottery
                      const winnerBalanceAfterJoin = await accounts[0].getBalance();
                      console.log("Winner balance after join lottery:", ethers.utils.formatEther(winnerBalanceAfterJoin));
                      console.log("Now is time to wait...");
                      // This code WON'T complete until our listener has finished listening!!!
                  });
              });
          });
      });
