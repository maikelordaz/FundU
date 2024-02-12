const { network, ethers } = require("hardhat")
const {
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
    isDevnet,
    networkConfig,
    isTestnet,
    isMainnet,
} = require("../utils/_networks")
const { verify } = require("../scripts/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer, alice } = await getNamedAccounts()
    const chainId = network.config.chainId
    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS
    log("03. Deploying Fee Manager...")

    const fee = networkConfig[chainId]["fee"]
    let protocolManager, usdc, usdt

    tUSDC = await ethers.getContract("tUSDC")
    tUSDT = await ethers.getContract("tUSDT")

    if (isDevnet) {
        protocolManager = alice
    }

    if (isDevnet || isTestnet) {
        usdc = tUSDC.target
        usdt = tUSDT.target
    }

    if (isTestnet || isMainnet) {
        protocolManager = networkConfig[chainId]["protocolManager"]
    }

    if (isMainnet) {
        usdc = networkConfig[chainId]["usdc"]
        usdt = networkConfig[chainId]["usdt"]
    }

    let args = [fee, protocolManager, usdc, usdt]

    const feeManagerContract = await deploy("FeeManager", {
        from: deployer,
        args: args,
        log: true,
        waitBlockConfirmations: waitBlockConfirmations,
    })

    log("03. Fee Manager deployed")

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("03. Verifying Fee Manager")
        await verify(feeManagerContract.target, args)
        log("03. Fee Manager verified")
    }
    log("=====================================================================================")
}

module.exports.tags = ["all", "core", "fee"]
