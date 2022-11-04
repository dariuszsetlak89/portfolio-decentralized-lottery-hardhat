require("dotenv").config();

const VRF_SUB_ID = process.env.VRF_SUB_ID || "";

const networkConfig = {
    default: {
        name: "hardhat",
    },
    31337: {
        name: "localhost",
        gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15", // it doesn't matter for mocks
        subscriptionId: "588",
        callbackGasLimit: "500000", // 500,000 gas
    },
    5: {
        name: "goerli",
        vrfCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
        gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        subscriptionId: VRF_SUB_ID,
        callbackGasLimit: "500000", // 500,000 gas
    },
};

const developmentChains = ["hardhat", "localhost"];

// Next.js front-end communication
const frontEndContractsFile = "../portfolio-decentralized-lottery-nextjs/constants/contractAddresses.json";
const frontEndAbiLocation = "../portfolio-decentralized-lottery-nextjs/constants/";

module.exports = {
    networkConfig,
    developmentChains,
    frontEndContractsFile,
    frontEndAbiLocation,
};
