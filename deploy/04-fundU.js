const { network, ethers } = require("hardhat")
const {
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
    isDevnet,
    isTestnet,
    isMainnet,
    networkConfig,
} = require("../utils/_networks")
const { verify } = require("../scripts/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer, alice } = await getNamedAccounts()
    const chainId = network.config.chainId
    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS

    log("04. Deploying Fund-U...")

    let feeManager, protocolManager, usdc, usdt

    tUSDC = await ethers.getContract("tUSDC")
    tUSDT = await ethers.getContract("tUSDT")
    feeManagerContract = await ethers.getContract("FeeManager")

    if (isDevnet) {
        protocolManager = alice
    }

    if (isDevnet || isTestnet) {
        feeManager = feeManagerContract.target
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

    let args = [feeManager, protocolManager, usdc, usdt]

    const fundU = await deploy("FundU", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: waitBlockConfirmations,
    })
    log("04. Fund-U deployed")

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("04. Verifying Fund-U")
        await verify(fundU.address, args)
        log("04. Fund-U verified")
    }
    log("=====================================================================================")
}

module.exports.tags = ["all", "core", "fundU"]
