const { now, week, usdtUnits, usdtUnitsFormat } = require("../utils/units")

const StreamStatus = {
    Active: "Active",
    Paused: "Paused",
    Canceled: "Canceled",
    Completed: "Completed",
}

const getStatusFromIndex = (index) => {
    return Object.keys(StreamStatus)[index]
}

const setTimeFromNow = async (times, seconds) => {
    return now + times * seconds
}

const advanceTime = async (seconds) => {
    await network.provider.send("evm_increaseTime", [seconds])
    await network.provider.send("evm_mine", [])
}

const advanceTimeByDate = async (times, seconds) => {
    for (let i = 0; i < times; i++) {
        await advanceTime(seconds)
    }
}

async function _new(taskArguments, hre) {
    const fundU = await ethers.getContract("FundU")
    const tUSDC = await ethers.getContract("tUSDC")

    const { deployer, Beneficiary_1 } = await hre.getNamedAccounts()
    const deployerAddress = await ethers.provider.getSigner(deployer)

    console.log("Creating New Streams...")

    // Dates
    const start = setTimeFromNow(1, week)
    const stop = setTimeFromNow(20, week)

    // Deposit
    const deposit = usdtUnits("100000.0")

    // Creating two stream
    for (let i = 1; i < 4; i++) {
        await fundU
            .connect(deployerAddress)
            .newStream(Beneficiary_1, deposit, start, stop, tUSDC.target)

        const id = await fundU.connect(deployerAddress).getStreamsNumber()
        const stream = await fundU.connect(deployerAddress).getStreamById(i)

        console.log("")
        console.log("New Stream created with USDT Mock tokens")
        console.log(`Stream id "${id}" Deposited: ${usdtUnitsFormat(stream.deposit)}`)
        console.log(`Stream id "${id}" Left: ${usdtUnitsFormat(stream.balanceLeft)}`)
        console.log(`Stream id "${id}" Status: ${getStatusFromIndex(stream.status)}`)
        console.log("")
    }
    console.log("===============")
}

async function _withdraw(taskArguments, hre) {
    const fundU = await ethers.getContract("FundU")

    const { Beneficiary_1 } = await hre.getNamedAccounts()
    const beneficiary_1Address = await ethers.provider.getSigner(Beneficiary_1)

    await advanceTimeByDate(2, week)

    const id = (await fundU.connect(beneficiary_1Address).getStreamsNumber()) - 1

    console.log("Withdrawing from the stream 2...")

    await fundU.connect(beneficiary_1Address).withdraw(id)

    console.log("Withdraw succesfull!")

    for (let id = 1; id < 4; id++) {
        const stream = await fundU.connect(beneficiary_1Address).getStreamById(id)
        console.log("")
        console.log(`Stream id "${id}" Deposited: ${usdtUnitsFormat(stream.deposit)}`)
        console.log(`Stream id "${id}" Left: ${usdtUnitsFormat(stream.balanceLeft)}`)
        console.log(`Stream id "${id}" Status: ${getStatusFromIndex(stream.status)}`)
        console.log("")
    }
    console.log("===============")
}

async function _pause(taskArguments, hre) {
    const fundU = await ethers.getContract("FundU")

    const { deployer } = await hre.getNamedAccounts()
    const deployerAddress = await ethers.provider.getSigner(deployer)

    await advanceTimeByDate(3, week)

    for (let i = 1; i < 3; i++) {
        console.log(`Pausing stream with id "${i}"`)

        await fundU.connect(deployerAddress).pause(i)

        console.log("Pause succesfull!")
    }
    for (let i = 1; i < 4; i++) {
        const stream = await fundU.connect(deployerAddress).getStreamById(i)
        console.log("")
        console.log(`Stream id "${i}" Deposited: ${usdtUnitsFormat(stream.deposit)}`)
        console.log(`Stream id "${i}" Left: ${usdtUnitsFormat(stream.balanceLeft)}`)
        console.log(`Stream id "${i}" Status: ${getStatusFromIndex(stream.status)}`)
        console.log("")
    }
    console.log("===============")
}

async function _cancel(taskArguments, hre) {
    const fundU = await ethers.getContract("FundU")

    const { deployer } = await hre.getNamedAccounts()
    const deployerAddress = await ethers.provider.getSigner(deployer)

    await advanceTimeByDate(3, week)

    const id = await fundU.connect(deployerAddress).getStreamsNumber()

    console.log("Cancel stream 2...")

    await fundU.connect(deployerAddress).cancelStream(id)

    console.log("Cancel succesfull!")
    for (let i = 1; i < 4; i++) {
        const stream = await fundU.connect(deployerAddress).getStreamById(i)
        console.log("")
        console.log(`Stream id "${i}" Deposited: ${usdtUnitsFormat(stream.deposit)}`)
        console.log(`Stream id "${i}" Left: ${usdtUnitsFormat(stream.balanceLeft)}`)
        console.log(`Stream id "${i}" Status: ${getStatusFromIndex(stream.status)}`)
        console.log("")
    }
    console.log("===============")
}

async function _resume(taskArguments, hre) {
    const fundU = await ethers.getContract("FundU")

    const { deployer } = await hre.getNamedAccounts()
    const deployerAddress = await ethers.provider.getSigner(deployer)

    await advanceTimeByDate(4, week)

    for (let i = 1; i < 3; i++) {
        console.log(`Resuming stream with id "${i}"`)

        if (i % 2 == 0) {
            await fundU.connect(deployerAddress).resumeStream(i, false)
        } else {
            await fundU.connect(deployerAddress).resumeStream(i, true)
        }
        console.log("Resume succesfull")
    }
    for (let i = 1; i < 4; i++) {
        const stream = await fundU.connect(deployerAddress).getStreamById(i)
        console.log("")
        console.log(`Stream id "${i}" Deposited: ${usdtUnitsFormat(stream.deposit)}`)
        console.log(`Stream id "${i}" Left: ${usdtUnitsFormat(stream.balanceLeft)}`)
        console.log(`Stream id "${i}" Status: ${getStatusFromIndex(stream.status)}`)
        console.log("")
    }
    console.log("===============")
}

async function _withdrawAll(taskArguments, hre) {
    const fundU = await ethers.getContract("FundU")

    const { Beneficiary_1 } = await hre.getNamedAccounts()
    const beneficiary_1Address = await ethers.provider.getSigner(Beneficiary_1)

    await advanceTimeByDate(5, week)

    console.log("Withdrawing from both streams...")

    await fundU.connect(beneficiary_1Address).withdrawAll()

    console.log("Withhdraw succesfull!")

    for (let i = 1; i < 4; i++) {
        const stream = await fundU.connect(beneficiary_1Address).getStreamById(i)
        console.log("")
        console.log(`Stream id "${i}" Deposited: ${usdtUnitsFormat(stream.deposit)}`)
        console.log(`Stream id "${i}" Left: ${usdtUnitsFormat(stream.balanceLeft)}`)
        console.log(`Stream id "${i}" Status: ${getStatusFromIndex(stream.status)}`)
        console.log("")
    }
    console.log("===============")
}

async function _complete(taskArguments, hre) {
    const fundU = await ethers.getContract("FundU")

    const { Beneficiary_1 } = await hre.getNamedAccounts()
    const beneficiary_1Address = await ethers.provider.getSigner(Beneficiary_1)

    await advanceTimeByDate(21, week)

    await fundU.connect(beneficiary_1Address).withdrawAll()

    for (let i = 1; i < 4; i++) {
        const stream = await fundU.connect(beneficiary_1Address).getStreamById(i)

        console.log("")
        console.log(`Stream id "${i}" Deposited: ${usdtUnitsFormat(stream.deposit)}`)
        console.log(`Stream id "${i}" Left: ${usdtUnitsFormat(stream.balanceLeft)}`)
        console.log(`Stream id "${i}" Status: ${getStatusFromIndex(stream.status)}`)
        console.log("")
    }
    console.log("===============")
}

async function stream(taskArguments, hre, protocol = "all") {
    if (protocol === "new") {
        if (network.config.chainId == 31337) {
            await _new(taskArguments, hre)
        } else {
            console.log("This task is intended to run on localhost")
        }
    }

    if (protocol === "withdraw") {
        if (network.config.chainId == 31337) {
            await _withdraw(taskArguments, hre)
        } else {
            console.log("This task is intended to run on localhost")
        }
    }

    if (protocol === "pause") {
        if (network.config.chainId == 31337) {
            await _pause(taskArguments, hre)
        } else {
            console.log("This task is intended to run on localhost")
        }
    }

    if (protocol === "cancel") {
        if (network.config.chainId == 31337) {
            await _cancel(taskArguments, hre)
        } else {
            console.log("This task is intended to run on localhost")
        }
    }

    if (protocol === "resume") {
        if (network.config.chainId == 31337) {
            await _resume(taskArguments, hre)
        } else {
            console.log("This task is intended to run on localhost")
        }
    }

    if (protocol === "withdrawAll") {
        if (network.config.chainId == 31337) {
            await _withdrawAll(taskArguments, hre)
        } else {
            console.log("This task is intended to run on localhost")
        }
    }

    if (protocol === "complete") {
        if (network.config.chainId == 31337) {
            await _complete(taskArguments, hre)
        } else {
            console.log("This task is intended to run on localhost")
        }
    }

    if (protocol === "all") {
        if (network.config.chainId == 31337) {
            await _new(taskArguments, hre)
            await _withdraw(taskArguments, hre)
            await _pause(taskArguments, hre)
            await _cancel(taskArguments, hre)
            await _resume(taskArguments, hre)
            await _withdrawAll(taskArguments, hre)
            await _complete(taskArguments, hre)
        } else {
            console.log("This task is intended to run on localhost")
        }
    }
}

module.exports = { stream }
