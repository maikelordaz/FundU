const hre = require("hardhat")

const isFork = process.env.FORK === "true"
const isLocalhost = !isFork && hre.network.name === "localhost"
const isMemnet = hre.network.name === "hardhat"

const isMainnet = hre.network.name.startsWith("mainnet_")
const isTestnet = hre.network.name.startsWith("testnet_")

const isDevnet = isLocalhost || isMemnet
const isRealChain = !isLocalhost && !isMemnet
const isProtocolChain = isMemnet || isFork || isLocalhost || isMainnet || isTestnet

const networkConfig = {
    31337: {
        name: "hardhat",
        protocolManager: "0x3904F59DF9199e0d6dC3800af9f6794c9D037eb1",
        feeManagerAddress: "0x3904F59DF9199e0d6dC3800af9f6794c9D037eb1",
        fee: 2, //TODO: set correct value
    },
    137: {
        name: "mainnet_polygon",
        usdc: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        usdt: "0x170A18B9190669Cda08965562745A323C907E5Ec",
        protocolManager: "0x3904F59DF9199e0d6dC3800af9f6794c9D037eb1", //TODO: change when deployed
        feeManagerAddress: "0x3904F59DF9199e0d6dC3800af9f6794c9D037eb1", //TODO: change when deployed
        fee: 2, //TODO: set correct value
    },
    80001: {
        name: "testnet_mumbai",
        protocolManager: "0x3904F59DF9199e0d6dC3800af9f6794c9D037eb1",
        feeManagerAddress: "0x3904F59DF9199e0d6dC3800af9f6794c9D037eb1",
        fee: 2, //TODO: set correct value
    },
}

const developmentChains = ["hardhat", "localhost"]
const VERIFICATION_BLOCK_CONFIRMATIONS = 6

module.exports = {
    isFork,
    isLocalhost,
    isMemnet,
    isMainnet,
    isTestnet,
    isDevnet,
    isRealChain,
    isProtocolChain,
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
}
