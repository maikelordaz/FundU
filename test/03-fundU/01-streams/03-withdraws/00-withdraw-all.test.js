const { assert, expect } = require("chai")
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
    : describe.only("Fund-U withdrawAll function", function () {
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
              // Connect the users to contracts
              fundUAlice = fundU.connect(Alice)
              fundUBob = fundU.connect(Bob)
              usdcAlice = USDC.connect(Alice)

              // Deposit on wallet
              const deposit = usdtUnits("10000.0")

              await USDC.mintUSDC(Alice.address, deposit)
              await usdcAlice.approve(fundU.target, deposit)

              await fundUAlice.depositOnWallet(deposit, USDC.target)

              // Create two new stream
              const start = await setTimeFromNow(1, week)
              const stop = await setTimeFromNow(3, week)

              const deposit1 = usdtUnits("2000.0")

              const deposit2 = usdtUnits("2000.0")

              await fundUAlice.newStream(Bob.address, deposit1, start, stop, USDC.target)
              await fundUAlice.newStream(Bob.address, deposit2, start, stop, USDC.target)
          })

          describe("Withdraw all", function () {
              it("Emits an event", async function () {
                  await advanceTimeByDate(3, week)

                  expect(await fundUBob.withdrawAll()).to.emit("Withdraw")
              })

              it("Set the streams statuses to Completed if after the withdraw there is no balance left", async function () {
                  const BobStreamsIds = await fundU.getStreamByBeneficiary(Bob.address)

                  await advanceTimeByDate(5, week)

                  BobStreamsIds.map(async function (id) {
                      const streamAfter = await fundU.getStreamById(id)
                      expect(getStatusFromIndex(streamAfter.status)).to.equal(
                          StreamStatus.Completed,
                      )
                  })
              })

              it("Update the beneficiary balance", async function () {
                  const bobBalanceBefore = await fundUBob.getWalletBalance(USDC.target)

                  const BobStreamsIds = await fundU.getStreamByBeneficiary(Bob.address)
                  const stream1 = await fundU.getStreamById(BobStreamsIds[0])
                  const stream2 = await fundU.getStreamById(BobStreamsIds[1])
                  const testAmount1 = stream1.deposit
                  const testAmount2 = stream2.deposit

                  await advanceTimeByDate(3, week)

                  await fundUBob.withdrawAll()

                  const bobBalanceAfter = await fundUBob.getWalletBalance(USDC.target)

                  const expectedBalance = testAmount1 + testAmount2

                  assert(bobBalanceBefore.toString() < bobBalanceAfter.toString())
              })
          })
      })
