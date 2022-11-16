const { network, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

//////////////////////////////
// Verify deployed contract //
//       on Etherscan       //
//////////////////////////////
async function verify() {
    const chainId = network.config.chainId;

    // Contract address
    const contractAddress = "0x2a8b6a9f617ef5d90867ff66d659672ded588c1a";

    // Constructor parameters
    const durationTime = 600; // 600 seconds = 10 minutes
    const vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
    const gasLane = networkConfig[chainId]["gasLane"];
    const subscriptionId = networkConfig[chainId]["subscriptionId"];
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];

    const args = [durationTime, vrfCoordinatorV2Address, gasLane, subscriptionId, callbackGasLimit];

    // Verify deployed contract on Etherscan
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        await verify(contractAddress, args);
    }
}

verify()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
