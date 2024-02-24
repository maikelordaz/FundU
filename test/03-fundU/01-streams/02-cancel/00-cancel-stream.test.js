const { expect, assert } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../../../utils/_networks")
const {
    getStatusFromIndex,
    StreamStatus,
    setTimeFromNow,
    advanceTimeByDate,
} = require("../../../../utils/_helpers")
const { week, usdtUnits, day } = require("../../../../utils/units")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Fund-U cancelStream function", function () {
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
              // Connect the users to contracts
              fundUAlice = fundU.connect(Alice)
              fundUBob = fundU.connect(Bob)
              usdtAlice = USDT.connect(Alice)

              // Deposit on wallet
              const deposit = usdtUnits("10000.0")

              await USDT.mintUSDT(Alice.address, deposit)
              await usdtAlice.approve(fundU.target, deposit)

              await fundUAlice.depositOnWallet(deposit, USDT.target)

              // Create a new stream
              const start = await setTimeFromNow(1, week)
              const stop = await setTimeFromNow(3, week)

              await fundUAlice.newStream(Bob.address, deposit / 2n, start, stop, USDT.target)
          })

          describe("Revert errors", function () {
              describe("Problems with the caller", function () {
                  it("Should revert if the caller is not the stream owner", async function () {
                      const id = await fundU.getStreamsNumber()
                      await expect(fundUBob.cancelStream(id)).to.be.revertedWith(
                          "Stream: Only stream owner allowed",
                      )
                  })
              })
          })

          describe("Canceling streams", function () {
              it("Emits a Cancel event", async function () {
                  const id = await fundU.getStreamsNumber()
                  expect(await fundUAlice.cancelStream(id)).to.emit("CancelStream")
              })

              it("Set the stream status to Canceled", async function () {
                  const id = await fundU.getStreamsNumber()
                  await fundUAlice.cancelStream(id)
                  const streamAfter = await fundU.getStreamById(id)
                  expect(getStatusFromIndex(streamAfter.status)).to.equal(StreamStatus.Canceled)
              })

              it("Update the beneficiary balances", async function () {
                  const bobBalanceBefore = await fundUBob.getWalletBalance(USDT.target)

                  const id = await fundU.getStreamsNumber()

                  await advanceTimeByDate(5, week)

                  await fundUAlice.cancelStream(id)

                  const bobBalanceAfter = await fundUBob.getWalletBalance(USDT.target)

                  assert(bobBalanceAfter > bobBalanceBefore)
              })

              it("Update the owner balances", async function () {
                  const aliceBalanceBefore = await fundUAlice.getWalletBalance(USDT.target)

                  const id = await fundU.getStreamsNumber()

                  await advanceTimeByDate(14, day)

                  await fundUAlice.cancelStream(id)

                  const aliceBalanceAfter = await fundUAlice.getWalletBalance(USDT.target)

                  assert(aliceBalanceAfter > aliceBalanceBefore)
              })
          })
      })
