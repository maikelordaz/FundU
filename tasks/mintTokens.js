const { usdtUnits } = require("../utils/units")

async function mintTokens(taskArguments, hre) {
    const accounts = await hre.ethers.getSigners()

    const fundU = await ethers.getContract("FundU")
    const tUSDT = await ethers.getContract("tUSDT")
    const tUSDC = await ethers.getContract("tUSDC")

    const { deployer } = await getNamedAccounts()
    const deployerAddress = await ethers.provider.getSigner(deployer)
    for (const account of accounts) {
        const accountAddress = await ethers.provider.getSigner(account.address)

        await tUSDT.connect(deployerAddress).mintUSDT(account.address, usdtUnits("9000000.0"))
        await tUSDC.connect(deployerAddress).mintUSDC(account.address, usdtUnits("9000000.0"))

        console.log(`Minted USDT/USDC to ${account.address}`)
        console.log("")

        await tUSDT.connect(accountAddress).approve(fundU.target, usdtUnits("9000000.0"))
        await tUSDC.connect(accountAddress).approve(fundU.target, usdtUnits("9000000.0"))

        console.log(
            `The Fund U contract at ${fundU.target} is now approved to use the ${usdtUnits(
                "10000.0",
            )} USDT/USDC/CNET just minted`,
        )
        console.log("")
    }
}

module.exports = {
    mintTokens,
}
