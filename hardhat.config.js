require("dotenv").config()
require("@nomicfoundation/hardhat-ethers")
require("hardhat-deploy")
require("hardhat-deploy-ethers")
require("@nomicfoundation/hardhat-verify")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("@nomicfoundation/hardhat-chai-matchers")

const { debug } = require("./tasks/debug")
const { mintTokens } = require("./tasks/mintTokens")
const { stream } = require("./tasks/stream")

/******************************************** Private Keys *********************************************/
const DEPLOYER_PK = process.env.DEPLOYER_PK
const POLYGON_MAINNET_DEPLOYER_PK = process.env.POLYGON_MAINNET_DEPLOYER_PK
const TESTNET_DEPLOYER_PK = process.env.TESTNET_DEPLOYER_PK

/******************************************** Deployer address *****************************************/
const DEPLOYER = process.env.DEPLOYER_ADDRESS
const TESTNET_DEPLOYER = process.env.TESTNET_DEPLOYER_ADDRESS

/******************************************* RPC providers **********************************************/
const POLYGON_MAINNET_RPC_URL = process.env.POLYGON_MAINNET_RPC_URL
const POLYGON_TESTNET_MUMBAI_RPC_URL = process.env.POLYGON_TESTNET_MUMBAI_RPC_URL

/************************************** Networks Scans *************************************************/
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY

/************************************** Coinmarketcap **************************************************/
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY

/***************************************** Features *****************************************************/
const FORK = process.env.FORK
const GAS_REPORT = process.env.GAS_REPORT
const SIZE = process.env.SIZE

/****************************************** Tasks ***********************************************************/

/*** Contracts info related ***/

// Run yarn local debug
task("debug", "Print info about all contracts and their configs", async (taskArguments, hre) => {
    return debug(taskArguments, hre, "all")
})

/*** Mock tokens related ***/
// Run yarn local mintTokens
task(
    "mintTokens",
    "Mints tokens to all accounts with USDC/USDT and approve the fundU contract to use it",
    mintTokens,
)

/***************************************** Config ******************************************************/
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        compilers: [
            {
                version: "0.8.20",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        ],
    },
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            chainId: 31337,
            blockConfirmations: 1,
            initialBaseFeePerGas: 0,
            forking: {
                //chainId: 137,
                accounts: [DEPLOYER_PK],
                url: POLYGON_MAINNET_RPC_URL,
                blockNumber: 53794139,
                enabled: FORK === "true",
            },
        },
        localhost: {
            chainId: 31337,
            timeout: 60000,
        },
        mainnet_polygon: {
            chainId: 137,
            accounts: [DEPLOYER_PK || POLYGON_MAINNET_DEPLOYER_PK],
            url: POLYGON_MAINNET_RPC_URL,
            blockConfirmations: 6,
            timeout: 900000,
        },
        testnet_mumbai: {
            chainId: 80001,
            accounts: [TESTNET_DEPLOYER_PK],
            url: POLYGON_TESTNET_MUMBAI_RPC_URL,
            blockConfirmations: 6,
            timeout: 900000,
        },
    },
    etherscan: {
        apiKey: {
            polygon: POLYGONSCAN_API_KEY,
            polygonMumbai: POLYGONSCAN_API_KEY,
        },
    },
    sourcify: {
        enabled: true,
    },
    gasReporter: {
        enabled: GAS_REPORT === "true",
        currency: "USD",
        token: "MATIC",
        outputFile: "gas-report.txt",
        noColors: true,
        coinmarketcap: COINMARKETCAP_API_KEY,
    },
    namedAccounts: {
        deployer: {
            mainnet_arbitrum: DEPLOYER,

            testnet_mumbai: TESTNET_DEPLOYER,

            default: 0,
            localhost: 0,
        },
        alice: {
            default: 1,
            localhost: 1,
        },
        bob: {
            default: 2,
            localhost: 2,
        },
    },
    mocha: {
        timeout: 300000,
    },
    contractSizer: {
        alphaSort: true,
        runOnCompile: SIZE === "true",
        outputFile: "contracts-size-report.txt",
    },
}
