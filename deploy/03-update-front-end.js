const { frontEndContractsFile, frontEndAbiLocation } = require("../helper-hardhat-config");
const { network } = require("hardhat");
require("dotenv").config();
const fs = require("fs");

module.exports = async function () {
    if (process.env.UPDATE_FRONT_END == "true") {
        console.log("Updating front end...");
        await updateContractAddresses();
        await updateAbi();
        console.log("Front end updated!");
        console.log("-------------------------------------------------------");
    }
};

async function updateContractAddresses() {
    // Get contract: Lottery
    const lottery = await ethers.getContract("Lottery");
    // Read existing addresses from file
    const contractAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile, "utf8"));
    const chainId = network.config.chainId.toString();
    if (chainId in contractAddresses) {
        // Lottery contract address update
        const lotteryChainAddress = contractAddresses[chainId];
        if (!lotteryChainAddress.includes(lottery.address)) {
            lotteryChainAddress.pop();
            lotteryChainAddress.push(lottery.address);
        }
    } else {
        // Save new `Lottery` contract address
        contractAddresses[chainId] = [lottery.address];
    }
    fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses));
}

async function updateAbi() {
    // Get contract: Lottery
    const lottery = await ethers.getContract("Lottery");
    // Write to file
    fs.writeFileSync(`${frontEndAbiLocation}Lottery.json`, lottery.interface.format(ethers.utils.FormatTypes.json));
}

module.exports.tags = ["all", "frontend"];
