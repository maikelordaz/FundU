const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../../utils/_networks")
const { StreamStatus, getStatusFromIndex } = require("../../../utils/_helpers")
const { usdtUnits } = require("../../../utils/units")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Fund-U instantPayments function", function () {
          let fundU, fundUAlice, fundUBob, USDC, USDT, usdcAlice, usdtAlice
          const mintAmount = 1000

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
              USDT = await ethers.getContract("tUSDT", deployer)
              // Connect the users to FunU contract
              fundUAlice = fundU.connect(Alice)
              fundUBob = fundU.connect(Bob)
              usdcAlice = USDC.connect(Alice)
              usdtAlice = USDT.connect(Alice)
          })

          describe("Revert errors", function () {
              describe("Problems with the beneficiary", function () {
                  it("Should revert if the beneficiary is the address zero", async function () {
                      const beneficiary = ethers.ZeroAddress
                      const amountToDeposit = mintAmount
                      await expect(
                          fundU.instantPayments(beneficiary, amountToDeposit, USDC.target),
                      ).to.be.revertedWith("Stream: Invalid beneficiary address")
                  })

                  it("Should revert if the beneficiary is the contract", async function () {
                      const amountToDeposit = mintAmount
                      await expect(
                          fundU.instantPayments(fundU.target, amountToDeposit, USDT.target),
                      ).to.be.revertedWith("Stream: Invalid beneficiary address")
                  })

                  it("Should revert if the beneficiary is the caller", async function () {
                      const amountToDeposit = mintAmount
                      await expect(
                          fundUAlice.instantPayments(Alice.address, amountToDeposit, USDC.target),
                      ).to.be.revertedWith("Stream: Invalid beneficiary address")
                  })
              })

              describe("Problems with the deposit amount", function () {
                  it("Should revert if there is no deposit", async function () {
                      await expect(
                          fundU.instantPayments(Alice.address, 0, USDC.target),
                      ).to.be.revertedWith("Stream: Zero amount")
                  })
              })

              describe("Problems with the available balance", function () {
                  it("Should revert if there is no balance enough", async function () {
                      await expect(
                          fundU.instantPayments(Alice.address, 100, USDT.target),
                      ).to.be.revertedWith("Stream: Not enough balance")
                  })
              })
          })

          describe("Making an instant payment", function () {
              beforeEach(async () => {
                  const depositUSD = usdtUnits("10000.0")

                  await USDC.mintUSDC(Alice.address, depositUSD)
                  await USDT.mintUSDT(Alice.address, depositUSD)

                  await usdcAlice.approve(fundU.target, depositUSD)
                  await usdtAlice.approve(fundU.target, depositUSD)

                  await fundUAlice.depositOnWallet(depositUSD, USDC.target)
                  await fundUAlice.depositOnWallet(depositUSD, USDT.target)
              })
              it("Increment the streams id", async function () {
                  const actualId = await fundU.getStreamsNumber()
                  const payment = usdtUnits("5000.0")

                  await fundUAlice.instantPayments(Bob.address, payment, USDC.target)
                  const newId = await fundU.getStreamsNumber()
                  assert(actualId < newId)
                  assert.equal(actualId.toString(), "0")
                  assert.equal(newId.toString(), "1")
              })

              it("Create a new instant payment", async function () {
                  const payment = usdtUnits("5000.0")

                  await fundUAlice.instantPayments(Bob.address, payment, USDC.target)

                  const id = await fundU.getStreamsNumber()

                  const newInstantPayment = await fundU.getStreamById(id)

                  assert.equal(newInstantPayment.balanceLeft.toString(), "0")
                  assert.equal(
                      newInstantPayment.startTime.toString(),
                      newInstantPayment.stopTime.toString(),
                  )
                  assert.equal(newInstantPayment.beneficiary, Bob.address)
                  assert.equal(newInstantPayment.owner, Alice.address)
                  assert.equal(newInstantPayment.tokenAddress, USDC.target)
                  expect(getStatusFromIndex(newInstantPayment.status)).to.equal(
                      StreamStatus.Completed,
                  )
              })

              it("Does not collect fees when paying with USDT token", async function () {
                  const payment = usdtUnits("5000.0")
                  const neededInput = 5000n
                  const aliceBalanceBefore = await fundUAlice.getWalletBalance(USDT.target)

                  await fundUAlice.instantPayments(Bob.address, payment, USDT.target)

                  const aliceBalanceAfter = await fundUAlice.getWalletBalance(USDT.target)

                  const deltaBalance = aliceBalanceBefore - aliceBalanceAfter
                  const needed = await fundU.amountNeeded(neededInput)

                  assert.equal(deltaBalance, needed)
              })

              it("Collect fees when paying with USDC token", async function () {
                  const payment = usdtUnits("5000.0")
                  const neededInput = 5000n

                  const aliceBalanceBefore = await fundUAlice.getWalletBalance(USDC.target)

                  await fundUAlice.instantPayments(Bob.address, payment, USDC.target)

                  const aliceBalanceAfter = await fundUAlice.getWalletBalance(USDC.target)

                  const deltaBalance = aliceBalanceBefore - aliceBalanceAfter
                  const needed = await fundU.amountNeeded(neededInput)

                  assert.equal(deltaBalance, needed)
              })

              it("Collect fees when paying with USDT token", async function () {
                  const payment = usdtUnits("5000.0")
                  const neededInput = 5000n

                  const aliceBalanceBefore = await fundUAlice.getWalletBalance(USDT.target)

                  await fundUAlice.instantPayments(Bob.address, payment, USDT.target)

                  const aliceBalanceAfter = await fundUAlice.getWalletBalance(USDT.target)

                  const deltaBalance = aliceBalanceBefore - aliceBalanceAfter
                  const needed = await fundU.amountNeeded(neededInput)

                  assert.equal(deltaBalance, needed)
              })

              it("Update the users balances", async function () {
                  const aliceBalanceBefore = await fundUAlice.getWalletBalance(USDT.target)
                  const bobBalanceBefore = await fundUBob.getWalletBalance(USDT.target)

                  const payment = usdtUnits("100.0")

                  await fundUAlice.instantPayments(Bob.address, payment, USDT.target)

                  const aliceBalanceAfter = await fundUAlice.getWalletBalance(USDT.target)
                  const bobBalanceAfter = await fundUBob.getWalletBalance(USDT.target)

                  assert(aliceBalanceBefore > aliceBalanceAfter)
                  assert(bobBalanceAfter > bobBalanceBefore)
              })

              it("Emits an event", async function () {
                  const payment = usdtUnits("5000.0")

                  expect(
                      await fundUAlice.instantPayments(Bob.address, payment, USDT.target),
                  ).to.emit("NewStream")
              })

              it("Asign multiple payments to the correct beneficiary", async function () {
                  // Deposit per stream for Alice
                  const payment = usdtUnits("2000.0")

                  // Stream 1
                  await fundUAlice.instantPayments(Bob.address, payment, USDT.target)

                  const firstId = await fundU.getStreamsNumber()

                  // Stream 2
                  await fundUAlice.instantPayments(Bob.address, payment, USDT.target)

                  const secondId = await fundU.getStreamsNumber()

                  // Check the Ids and number of streams
                  const paymentsIds = await fundU.getStreamByBeneficiary(Bob.address)
                  const paymentsCount = await fundU.getBeneficiaryStreamCount(Bob.address)

                  // Asserts
                  assert.equal(firstId.toString(), "1")
                  assert.equal(firstId.toString(), paymentsIds[0])

                  assert.equal(secondId.toString(), "2")
                  assert.equal(secondId.toString(), paymentsIds[1])

                  assert.equal(paymentsCount.toString(), "2")
              })

              it("Asign multiple payments to the correct owner", async function () {
                  const payment = usdtUnits("2000.0")

                  // Stream 1
                  await fundUAlice.instantPayments(Bob.address, payment, USDT.target)

                  const firstId = await fundU.getStreamsNumber()

                  // Stream 2
                  await fundUAlice.instantPayments(Bob.address, payment, USDT.target)

                  const secondId = await fundU.getStreamsNumber()

                  const paymentsIds = await fundU.getStreamByOwner(Alice.address)
                  const paymentsCount = await fundU.getOwnerStreamCount(Alice.address)

                  // Asserts
                  assert.equal(paymentsIds[0].toString(), firstId.toString())
                  assert.equal(paymentsIds[1].toString(), secondId.toString())
                  assert.equal(paymentsIds[0].toString(), "1")
                  assert.equal(paymentsIds[1].toString(), "2")
                  assert.equal(paymentsCount.toString(), "2")
              })
          })
      })
