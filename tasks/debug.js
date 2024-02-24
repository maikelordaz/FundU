const { usdtUnitsFormat } = require("../utils/units")

async function _debug_tUSDT(taskArguments, hre) {
    const { deployer } = await getNamedAccounts()
    const deployerAddress = await ethers.provider.getSigner(deployer)

    const usdt = await hre.ethers.getContract("tUSDT")

    console.log("====================")
    console.log("USDT Mock Contract address")
    console.log("====================")

    console.log(`USDT Token:                                     ${usdt.target}`)
    console.log("====================")

    console.log(
        `The deployer balance is:                                     ${usdtUnitsFormat(
            await usdt.connect(deployerAddress).balanceOf(deployer),
        )} USDT tokens`,
    )
    console.log("====================")
}

async function _debug_tUSDC(taskArguments, hre) {
    const { deployer } = await getNamedAccounts()
    const deployerAddress = await ethers.provider.getSigner(deployer)

    const usdc = await hre.ethers.getContract("tUSDC")

    console.log("====================")
    console.log("USDC Mock Contract address")
    console.log("====================")

    console.log(`USDC Token:                                     ${usdc.target}`)
    console.log("====================")

    console.log(
        `The deployer balance is:                                     ${usdtUnitsFormat(
            await usdc.connect(deployerAddress).balanceOf(deployer),
        )} USDC tokens`,
    )
    console.log("====================")
}

async function _debug_fundU(taskArguments, hre) {
    const fundU = await hre.ethers.getContract("FundU")

    console.log("====================")
    console.log("Fund U addresses")
    console.log("====================")

    console.log(`Fund-U:                                     ${fundU.target}`)
    console.log("====================")
}

async function debug(taskArguments, hre, protocol = "all") {
    if (protocol === "all" || protocol === "usdt") {
        if (network.config.chainId == 31337) {
            console.log("The USDT Mock contract is:")
            console.log("")
            await _debug_tUSDT(taskArguments, hre)
            console.log("")
        } else {
            console.log("The info about the USDT Mock contract it is unique to localhost")
        }
    }

    if (protocol === "all" || protocol === "usdc") {
        if (network.config.chainId == 31337) {
            console.log("The USDC Mock contract is:")
            console.log("")
            await _debug_tUSDC(taskArguments, hre)
            console.log("")
        } else {
            console.log("The info about the USDC Mock contract it is unique to localhost")
        }
    }

    if (protocol === "all" || protocol === "fundu") {
        console.log("The main contract is:")
        console.log("")
        await _debug_fundU(taskArguments, hre)
    }
}

module.exports = {
    debug,
}
