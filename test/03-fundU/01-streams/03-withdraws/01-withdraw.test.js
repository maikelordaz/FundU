const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../../../utils/_networks")
const {
    getStatusFromIndex,
    StreamStatus,
    setTimeFromNow,
    advanceTimeByDate,
} = require("../../../../utils/_helpers")
const { week, usdtUnits, day, month } = require("../../../../utils/units")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Fund-U withdraw function", function () {
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

              // Create a new stream
              const start = await setTimeFromNow(1, week)
              const stop = await setTimeFromNow(3, week)

              await fundUAlice.newStream(Bob.address, deposit / 2n, start, stop, USDC.target)
          })

          describe("Revert errors", function () {
              describe("Problems with the caller", function () {
                  it("Should revert if the caller is not the stream beneficiary", async function () {
                      const id = await fundU.getStreamsNumber()
                      await expect(fundUAlice.withdraw(id)).to.be.revertedWith(
                          "Stream: Only stream beneficiary allowed",
                      )
                  })
              })

              describe("Problems with the amount to withdraw", function () {
                  it("Should revert if there is not balance available to withdraw", async function () {
                      const id = await fundU.getStreamsNumber()

                      await expect(fundUBob.withdraw(id)).to.be.revertedWith(
                          "Stream: No balance available",
                      )
                  })
              })

              describe("Problems with the stream status", function () {
                  it("Should revert if the stream status is not Active", async function () {
                      const id = await fundU.getStreamsNumber()

                      await fundUAlice.pause(id)

                      await advanceTimeByDate(3, week)

                      await expect(fundUBob.withdraw(id)).to.be.revertedWith(
                          "Stream: Stream incorrect status",
                      )
                  })
              })
          })

          describe("Withdraw", function () {
              it("Emits Withdraw event", async function () {
                  const id = await fundU.getStreamsNumber()

                  await advanceTimeByDate(18, day)
                  const withdrawal = await fundUBob.withdraw(id)

                  expect(withdrawal).to.emit("Withdraw")
              })

              xit("Set the stream status to Completed and emit Completed event if after the withdraw there is no balance left", async function () {
                  const id = await fundU.getStreamsNumber()
                  await advanceTimeByDate(3, week)

                  const withdrawal = await fundUBob.withdraw(id)
                  const streamAfter = await fundU.getStreamById(id)

                  expect(withdrawal).to.emit("Completed")
                  expect(getStatusFromIndex(streamAfter.status)).to.equal(StreamStatus.Completed)
              })

              it("Update the beneficiary balance", async function () {
                  const bobBalanceBefore = await fundUBob.getWalletBalance(USDC.target)

                  const id = await fundU.getStreamsNumber()
                  const stream = await fundU.getStreamById(id)
                  const testAmount = stream.deposit

                  await advanceTimeByDate(3, month)

                  await fundUBob.withdraw(id)

                  const bobBalanceAfter = await fundUBob.getWalletBalance(USDC.target)

                  assert(bobBalanceBefore.toString() < bobBalanceAfter.toString())
                  assert.equal(testAmount.toString(), bobBalanceAfter.toString().toString())
              })

              it("Update the balanceLeft argument on the StreamData object", async function () {
                  const id = await fundU.getStreamsNumber()
                  const streamBefore = await fundU.getStreamById(id)

                  await advanceTimeByDate(10, day)

                  const balanceLeftBefore = streamBefore.balanceLeft
                  const deposit = streamBefore.deposit
                  await advanceTimeByDate(15, day)

                  await fundUBob.withdraw(id)

                  await advanceTimeByDate(11, day)

                  const streamAfter = await fundU.getStreamById(id)
                  const balanceLeftAfter = streamAfter.balanceLeft

                  assert.equal(balanceLeftBefore.toString(), deposit.toString())
                  assert(deposit > balanceLeftAfter)
              })

              xit("Get correct beneficiary balanceLeft when there has been some withdrawals", async function () {
                  const id = await fundU.getStreamsNumber()
                  const stream = await fundU.getStreamById(id)
                  const startTime = stream.startTime
                  const stopTime = stream.stopTime
                  const deposit = stream.deposit
                  const duration = stopTime - startTime
                  const rate = deposit / duration
                  const firstTimestamp = startTime + 200n
                  const secondTimestamp = firstTimestamp + 200n
                  const thirdWithdrawTime = secondTimestamp + 200n
                  const firstExpectedBalance = firstTimestamp - startTime * rate
                  const firstWithdrawalAmount = firstTimestamp + 1n - startTime * rate
                  const secondExpectedBalance =
                      secondTimestamp - startTime * rate - firstWithdrawalAmount
                  const secondWithdrawalAmount = secondTimestamp + 1n - startTime * rate
                  const thirdExpectedBalance =
                      thirdWithdrawTime - startTime * rate - secondWithdrawalAmount

                  // first timestamp
                  await network.provider.send("evm_mine", [Number(firstTimestamp)])
                  const firstBeneficiaryBalance = await fundU.balanceOfStreamBeneficiary(id)
                  assert.equal(firstBeneficiaryBalance, firstExpectedBalance)

                  await fundUBob.withdraw(id)

                  // second timestamp
                  await network.provider.send("evm_mine", [Number(secondTimestamp)])
                  const secondBeneficiaryBalance = await fundU.balanceOfStreamBeneficiary(id)
                  expect(secondBeneficiaryBalance.toString()).to.equal(
                      secondExpectedBalance.toString(),
                  )

                  await fundUBob.withdraw(id)

                  // third timestamp
                  await network.provider.send("evm_mine", [Number(thirdWithdrawTime)])
                  const thirdBeneficiaryBalance = await fundU.balanceOfStreamBeneficiary(id)
                  expect(thirdBeneficiaryBalance.toString()).to.equal(
                      thirdExpectedBalance.toString(),
                  )
              })
          })
      })
