const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../../../utils/_networks")
const {
    StreamStatus,
    getStatusFromIndex,
    setTimeFromNow,
    advanceTimeByDate,
} = require("../../../../utils/_helpers")
const { week, usdtUnits, day } = require("../../../../utils/units")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Fund-U pause function", function () {
          let fundU, fundUAlice, fundUBob, USDT, usdtAlice

          beforeEach(async () => {
              // Get the accounts
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              Alice = accounts[1]
              Bob = accounts[2]
              // Deploy contracts
              await deployments.fixture(["all"])
              fundU = await ethers.getContract("FundU", deployer)
              USDT = await ethers.getContract("tUSDT", deployer)
              // Connect the users contracts
              fundUAlice = fundU.connect(Alice)
              fundUBob = fundU.connect(Bob)
              usdtAlice = USDT.connect(Alice)

              // Deposit on wallet
              const deposit = usdtUnits("10000.0")

              await USDT.mintUSDT(Alice.address, deposit)
              await usdtAlice.approve(fundU.target, deposit)

              await fundUAlice.depositOnWallet(deposit, USDT.target)
              // Create a stream
              const start = await setTimeFromNow(1, week)
              const stop = await setTimeFromNow(3, week)

              await fundUAlice.newStream(Bob.address, deposit / 2n, start, stop, USDT.target)
          })

          describe("Revert errors", function () {
              describe("Problems with the caller", function () {
                  it("Should revert if the caller is not the stream owner", async function () {
                      const id = await fundU.getStreamsNumber()
                      await expect(fundUBob.pause(id)).to.be.revertedWith(
                          "Stream: Only stream owner allowed",
                      )
                  })
              })

              describe("Problems with the stream status", function () {
                  it("Should revert if the stream is not active", async function () {
                      const id = await fundU.getStreamsNumber()
                      await fundUAlice.pause(id)
                      await expect(fundUAlice.pause(id)).to.be.revertedWith(
                          "Stream: Stream incorrect status",
                      )
                  })
              })
          })

          describe("Pausing a stream", function () {
              it("Set the stream status to paused", async function () {
                  const id = await fundU.getStreamsNumber()
                  await fundUAlice.pause(id)
                  const streamAfter = await fundU.getStreamById(id)
                  expect(getStatusFromIndex(streamAfter.status)).to.equal(StreamStatus.Paused)
              })

              it("Update the balances", async function () {
                  const bobBalanceBefore = await fundUBob.getWalletBalance(USDT.target)

                  const id = await fundU.getStreamsNumber()

                  await advanceTimeByDate(14, day)

                  await fundUAlice.pause(id)

                  const bobBalanceAfter = await fundUBob.getWalletBalance(USDT.target)

                  assert(bobBalanceAfter > bobBalanceBefore)
                  //   expect(bobBalanceAfter.toString()).to.be.bignumber.greaterThan(
                  //       bobBalanceBefore.toString(),
                  //   )
              })

              it("Emits a Withdraw event", async function () {
                  const id = await fundU.getStreamsNumber()
                  expect(await fundUAlice.pause(id)).to.emit("Withdraw")
              })

              it("Emits a Completed event if there is no balance left on the stream", async function () {
                  const id = await fundU.getStreamsNumber()

                  await advanceTimeByDate(3, week)

                  expect(await fundUAlice.pause(id)).to.emit("Completed")
              })

              it("Emits a Pause event", async function () {
                  const id = await fundU.getStreamsNumber()
                  expect(await fundUAlice.pause(id)).to.emit("PauseStream")
              })
          })
      })
