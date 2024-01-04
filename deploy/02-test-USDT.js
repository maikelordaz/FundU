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
        log("03. Deploying mock USDT...")

        const args = []
        const tUSDT = await deploy("tUSDT", {
            from: deployer,
            args: args,
            log: true,
            waitConfirmations: waitBlockConfirmations,
        })
        log("03. Mock USDT deployed")

        if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
            log("03. Verifying mock USDT")
            await verify(tUSDT.address, args)
            log("03. Mock USDT verified")
        }
    }
}

module.exports.tags = ["all", "tokens", "tUSDT"]
