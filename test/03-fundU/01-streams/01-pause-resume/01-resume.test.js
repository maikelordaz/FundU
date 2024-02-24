const { expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../../../utils/_networks")
const {
    getStatusFromIndex,
    StreamStatus,
    setTimeFromNow,
    advanceTimeByDate,
} = require("../../../../utils/_helpers")
const { week, usdtUnits } = require("../../../../utils/units")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe.only("Fund-U resumeStream function", function () {
          let fundU, fundUAlice, fundUBob, USDC, usdcAlice

          beforeEach(async () => {
              // Get the accounts
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              Alice = accounts[1]
              Bob = accounts[2]
              // Deploy contracts
              await deployments.fixture(["all"])
              fundU = await ethers.getContract("FundU", deployer)
              USDC = await ethers.getContract("tUSDC", deployer)
              // Connect the users contracts
              fundUAlice = fundU.connect(Alice)
              fundUBob = fundU.connect(Bob)
              usdcAlice = USDC.connect(Alice)

              // Deposit on wallet
              const deposit = usdtUnits("10000.0")

              await USDC.mintUSDC(Alice.address, deposit)
              await usdcAlice.approve(fundU.target, deposit)

              await fundUAlice.depositOnWallet(deposit, USDC.target)

              // Create a new stream
              const start = await setTimeFromNow(1, week)
              const stop = await setTimeFromNow(3, week)

              await fundUAlice.newStream(Bob.address, deposit / 2n, start, stop, USDC.target)
          })

          describe("Revert errors", function () {
              describe("Problems with the caller", function () {
                  it("Should revert if the caller is not the stream owner", async function () {
                      const id = await fundU.getStreamsNumber()
                      await fundUAlice.pause(id)
                      await expect(fundU.resumeStream(id, true)).to.be.revertedWith(
                          "Stream: Only stream owner allowed",
                      )
                  })
              })

              describe("Problems with the stream status", function () {
                  it("Should revert if the stream is not paused", async function () {
                      const id = await fundU.getStreamsNumber()
                      await expect(fundUAlice.resumeStream(id, false)).to.be.revertedWith(
                          "Stream: Stream incorrect status",
                      )
                  })
              })
          })

          describe("Resuming a stream", function () {
              beforeEach(async () => {
                  const id = await fundU.getStreamsNumber()
                  await fundUAlice.pause(id)
              })

              it("Set the stream status to Active when is a paid resume", async function () {
                  const id = await fundU.getStreamsNumber()
                  await fundUAlice.resumeStream(id, true)
                  const streamAfter = await fundU.getStreamById(id)
                  expect(getStatusFromIndex(streamAfter.status)).to.equal(StreamStatus.Active)
              })

              it("Set the stream status to Active when is a unpaid resume", async function () {
                  const id = await fundU.getStreamsNumber()
                  const stream = await fundU.getStreamById(id)
                  const stopTime = stream.stopTime - 500n
                  await network.provider.send("evm_mine", [Number(stopTime)])

                  await fundUAlice.resumeStream(id, false)

                  const streamAfter = await fundU.getStreamById(id)
                  expect(getStatusFromIndex(streamAfter.status)).to.equal(StreamStatus.Active)
              })

              it("Emits a Completed event if there is no balance left on the stream with a paid Pause", async function () {
                  const id = await fundU.getStreamsNumber()

                  await advanceTimeByDate(3, week)

                  expect(await fundUAlice.resumeStream(id, true)).to.emit("Completed")
              })

              it("Emits an ResumeStream event", async function () {
                  const id = await fundU.getStreamsNumber()
                  expect(await fundUAlice.resumeStream(id, true)).to.emit("ResumeStream")
              })

              it("It is called as an unpaid resume if the stream is canceled while paused", async function () {
                  const id = await fundU.getStreamsNumber()
                  expect(await fundUAlice.cancelStream(id)).to.emit("ResumeStream")
              })
          })
      })
