require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("hardhat-deploy");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("hardhat-contract-sizer");
require("dotenv").config();

const GOERLI_RPC_URL = process.env.GOERLI_TESTNET_RPC_URL || "https://eth-goerli/";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0xkey";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || "";
const REPORT_GAS = process.env.REPORT_GAS || false;

module.exports = {
    solidity: "0.8.17",
    defaultNetwork: "hardhat",
    paths: {
        deploy: "deploy",
        deployments: "deployments",
    },
    networks: {
        localhost: {
            chainId: 31337,
            live: false,
            saveDeployments: true,
            tags: ["local"],
            blockConfirmations: 1,
        },
        hardhat: {
            chainId: 31337,
            live: false,
            saveDeployments: true,
            tags: ["test", "local"],
            blockConfirmations: 1,
        },
        goerli: {
            chainId: 5,
            live: true,
            saveDeployments: true,
            tags: ["staging", "live"],
            url: GOERLI_RPC_URL,
            accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
            blockConfirmations: 2,
        },
    },
    etherscan: {
        // yarn hardhat verify --network <NETWORK> <CONTRACT_ADDRESS> <CONSTRUCTOR_PARAMETERS>
        apiKey: {
            mainnet: ETHERSCAN_API_KEY,
            goerli: ETHERSCAN_API_KEY,
        },
    },
    gasReporter: {
        enabled: REPORT_GAS == "true" ? true : false,
        outputFile: "gas-report.txt",
        currency: "USD",
        noColors: true,
        token: "ETH", // ETH (default), BNB, MATIC, AVAX
        // coinmarketcap: COINMARKETCAP_API_KEY,
    },
    contractSizer: {
        runOnCompile: false,
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
        player1: {
            default: 1,
        },
        player2: {
            default: 2,
        },
        player3: {
            default: 3,
        },
        player4: {
            default: 4,
        },
        player5: {
            default: 5,
        },
    },
    mocha: {
        timeout: 1200000, // 1200 seconds max = 20 minutes
    },
};
