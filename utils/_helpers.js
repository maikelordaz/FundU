const { network } = require("hardhat")
const { now } = require("./units")

const StreamStatus = {
    Active: "Active",
    Paused: "Paused",
    Canceled: "Canceled",
    Completed: "Completed",
}

const getStatusFromIndex = (index) => {
    return Object.keys(StreamStatus)[index]
}

const advanceTime = async (seconds) => {
    await network.provider.send("evm_increaseTime", [seconds])
    await network.provider.send("evm_mine", [])
}

/**
 * @param times amount of the param seconds
 * @param seconds hour, day, week, month or year
 * Example advanceTimebyDate(5, day)
 */
const advanceTimeByDate = async (times, seconds) => {
    for (let i = 0; i < times; i++) {
        await advanceTime(seconds)
    }
}

const setTimeFromNow = async (times, seconds) => {
    return now + times * seconds
}

const advanceBlocks = async (numBlocks) => {
    for (let i = 0; i < numBlocks; i++) {
        await network.provider.send("evm_mine")
    }
}

module.exports = {
    // Constants from soliditycontracts
    StreamStatus,
    getStatusFromIndex,

    // Time utilities
    advanceTime,
    advanceTimeByDate,
    setTimeFromNow,
    advanceBlocks,
}
