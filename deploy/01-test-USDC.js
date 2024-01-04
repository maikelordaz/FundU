const { network } = require("hardhat")
const {
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
    isTestnet,
    isDevnet,
} = require("../utils/_networks")
const { verify } = require("../scripts/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS

    if (isDevnet || isTestnet) {
        log("02. Deploying mock USDC...")

        const args = []
        const tUSDC = await deploy("tUSDC", {
            from: deployer,
            args: args,
            log: true,
            waitConfirmations: waitBlockConfirmations,
        })
        log("02. Mock USDC deployed")

        if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
            log("02. Verifying mock USDC")
            await verify(tUSDC.address, args)
            log("02. Mock USDC verified")
        }
    }
}

module.exports.tags = ["all", "tokens", "tUSDC"]
