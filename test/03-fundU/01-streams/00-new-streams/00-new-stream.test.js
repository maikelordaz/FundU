const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../../../utils/_networks")
const { StreamStatus, getStatusFromIndex, setTimeFromNow } = require("../../../../utils/_helpers")
const { day, week, month, year, usdtUnits } = require("../../../../utils/units")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe.only("Fund-U newStream function", function () {
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
                      const stop = await setTimeFromNow(5, day)
                      await expect(
                          fundU.newStream(beneficiary, amountToDeposit, 0, stop, USDT.target),
                      ).to.be.revertedWith("Stream: Invalid beneficiary address")
                  })

                  it("Should revert if the beneficiary is the contract", async function () {
                      const amountToDeposit = mintAmount
                      const stop = await setTimeFromNow(1, week)
                      await expect(
                          fundU.newStream(fundU.target, amountToDeposit, 0, stop, USDT.target),
                      ).to.be.revertedWith("Stream: Invalid beneficiary address")
                  })

                  it("Should revert if the beneficiary is the caller", async function () {
                      const amountToDeposit = mintAmount
                      const stop = await setTimeFromNow(1, month)
                      await expect(
                          fundUAlice.newStream(
                              Alice.address,
                              amountToDeposit,
                              0,
                              stop,
                              USDT.target,
                          ),
                      ).to.be.revertedWith("Stream: Invalid beneficiary address")
                  })
              })

              describe("Problems with the deposit amount", function () {
                  it("Should revert if there is no deposit", async function () {
                      const stop = await setTimeFromNow(1, year)
                      await expect(
                          fundU.newStream(Alice.address, 0, 0, stop, USDT.target),
                      ).to.be.revertedWith("Stream: Zero amount")
                  })

                  it("Should revert if the deposit is no big enough", async function () {
                      const deposit = usdtUnits("10000.0")

                      await USDT.mintUSDT(Alice.address, deposit)
                      await usdtAlice.approve(fundU.target, deposit)

                      await fundUAlice.depositOnWallet(deposit, USDT.target)

                      const stop = await setTimeFromNow(1, week)
                      const amountToDeposit = 1
                      await expect(
                          fundUAlice.newStream(Bob.address, amountToDeposit, 0, stop, USDT.target),
                      ).to.be.revertedWith("Stream: Deposit smaller than time left")
                  })
              })

              describe("Problems with the available balance", function () {
                  it("Should revert if there is no balance enough", async function () {
                      const stop = await setTimeFromNow(1, year)
                      await expect(
                          fundU.newStream(Alice.address, 100, 0, stop, USDT.target),
                      ).to.be.revertedWith("Stream: Not enough balance")
                  })
              })

              describe("Problems with the stop time", function () {
                  it("Should revert if the stop time has already passed", async function () {
                      const start = await setTimeFromNow(3, week)
                      const stop = await setTimeFromNow(1, week)
                      const deposit = 10000

                      const needed = await fundU.amountNeeded(deposit)

                      await USDT.mintUSDT(Alice.address, needed)
                      await usdtAlice.approve(fundU.target, deposit)

                      await fundUAlice.depositOnWallet(deposit, USDT.target)

                      await expect(
                          fundUAlice.newStream(Bob.address, 100, start, stop, USDT.target),
                      ).to.be.revertedWith("Stream: Invalid stop time")
                  })
              })
          })

          describe("Creating new streams", function () {
              beforeEach(async () => {
                  const depositCNET = usdtUnits("100000.0")
                  const depositUSD = usdtUnits("100000.0")

                  await USDC.mintUSDC(Alice.address, depositUSD)
                  await USDT.mintUSDT(Alice.address, depositUSD)

                  await usdcAlice.approve(fundU.target, depositUSD)
                  await usdtAlice.approve(fundU.target, depositUSD)

                  await fundUAlice.depositOnWallet(depositUSD, USDC.target)
                  await fundUAlice.depositOnWallet(depositUSD, USDT.target)
              })

              it("Increment the streams id", async function () {
                  const actualId = await fundU.getStreamsNumber()
                  const start = await setTimeFromNow(1, week)
                  const stop = await setTimeFromNow(3, week)
                  const deposit = usdtUnits("1000.0")

                  await fundUAlice.newStream(Bob.address, deposit, start, stop, USDT.target)
                  const newId = await fundU.getStreamsNumber()
                  assert(actualId < newId)
                  assert.equal(actualId.toString(), "0")
                  assert.equal(newId.toString(), "1")
              })

              it("Create a new stream", async function () {
                  const start = await setTimeFromNow(1, week)
                  const stop = await setTimeFromNow(3, week)
                  const deposit = usdtUnits("10000.0")

                  await fundUAlice.newStream(Bob.address, deposit, start, stop, USDT.target)

                  const id = await fundU.getStreamsNumber()

                  const newStream = await fundU.getStreamById(id)

                  assert.equal(newStream.startTime.toString(), start.toString())
                  assert.equal(newStream.stopTime.toString(), stop.toString())
                  assert.equal(newStream.beneficiary, Bob.address)
                  assert.equal(newStream.owner, Alice.address)
                  assert.equal(newStream.tokenAddress, USDT.target)
                  expect(getStatusFromIndex(newStream.status)).to.equal(StreamStatus.Active)
              })

              it("Does not collect fees when paying with CNET token", async function () {
                  const start = await setTimeFromNow(1, week)
                  const stop = await setTimeFromNow(3, week)
                  const deposit = usdtUnits("500.0")
                  const neededInput = 500n

                  const aliceBalanceBefore = await fundUAlice.getWalletBalance(USDT.target)

                  await fundUAlice.newStream(Bob.address, deposit, start, stop, USDT.target)

                  const aliceBalanceAfter = await fundUAlice.getWalletBalance(USDT.target)

                  const deltaBalance = aliceBalanceBefore - aliceBalanceAfter
                  const needed = await fundU.amountNeeded(neededInput)

                  //assert.equal(deltaBalance, needed)
              })

              it("Collect fees when paying with USDT token", async function () {
                  const start = await setTimeFromNow(1, week)
                  const stop = await setTimeFromNow(3, week)
                  const deposit = usdtUnits("10000.0")
                  const neededInput = 10000n

                  const aliceBalanceBefore = await fundUAlice.getWalletBalance(USDT.target)

                  await fundUAlice.newStream(Bob.address, deposit, start, stop, USDT.target)

                  const aliceBalanceAfter = await fundUAlice.getWalletBalance(USDT.target)

                  const deltaBalance = aliceBalanceBefore - aliceBalanceAfter
                  const needed = await fundU.amountNeeded(neededInput)

                  assert.equal(deltaBalance, needed)
              })

              it("Collect fees when paying with USDC token", async function () {
                  const start = await setTimeFromNow(1, week)
                  const stop = await setTimeFromNow(3, week)
                  const deposit = usdtUnits("10000.0")
                  const neededInput = 10000n

                  const aliceBalanceBefore = await fundUAlice.getWalletBalance(USDC.target)

                  await fundUAlice.newStream(Bob.address, deposit, start, stop, USDC.target)

                  const aliceBalanceAfter = await fundUAlice.getWalletBalance(USDC.target)

                  const deltaBalance = aliceBalanceBefore - aliceBalanceAfter
                  const needed = await fundU.amountNeeded(neededInput)

                  assert.equal(deltaBalance, needed)
              })

              it("Emits an event", async function () {
                  const start = await setTimeFromNow(1, week)
                  const stop = await setTimeFromNow(3, week)
                  const deposit = usdtUnits("10000.0")

                  expect(
                      await fundUAlice.newStream(Bob.address, deposit, start, stop, USDT.target),
                  ).to.emit("NewStream")
              })

              it("Asign multiple streams to the correct beneficiary", async function () {
                  // Variables to the streams
                  const start = await setTimeFromNow(1, week)
                  const stop = await setTimeFromNow(3, week)

                  // Deposit per stream for Alice and Bob
                  const deposit = usdtUnits("2000.0")

                  // Stream 1
                  await fundUAlice.newStream(Bob.address, deposit, start, stop, USDT.target)

                  const firstId = await fundU.getStreamsNumber()

                  // Stream 2
                  await fundUAlice.newStream(Bob.address, deposit, start, stop, USDT.target)

                  const secondId = await fundU.getStreamsNumber()

                  // Check the Ids and number of streams
                  const streamsIds = await fundU.getStreamByBeneficiary(Bob.address)
                  const streamsCount = await fundU.getBeneficiaryStreamCount(Bob.address)

                  // Asserts
                  assert.equal(firstId.toString(), "1")
                  assert.equal(firstId.toString(), streamsIds[0])

                  assert.equal(secondId.toString(), "2")
                  assert.equal(secondId.toString(), streamsIds[1])

                  assert.equal(streamsCount.toString(), "2")
              })

              it("Asign multiple streams to the correct owner", async function () {
                  // Variables to the streams
                  const start = await setTimeFromNow(1, week)
                  const stop = await setTimeFromNow(3, week)

                  // Deposit per stream for Alice and Bob
                  const deposit = usdtUnits("2000.0")

                  // Stream 1
                  await fundUAlice.newStream(Bob.address, deposit, start, stop, USDT.target)

                  const firstId = await fundU.getStreamsNumber()

                  // Stream 2
                  await fundUAlice.newStream(Bob.address, deposit, start, stop, USDT.target)

                  const secondId = await fundU.getStreamsNumber()

                  const streamsIds = await fundU.getStreamByOwner(Alice.address)
                  const streamsCount = await fundU.getOwnerStreamCount(Alice.address)

                  // Asserts
                  assert.equal(streamsIds[0].toString(), firstId.toString())
                  assert.equal(streamsIds[1].toString(), secondId.toString())
                  assert.equal(streamsIds[0].toString(), "1")
                  assert.equal(streamsIds[1].toString(), "2")
                  assert.equal(streamsCount.toString(), "2")
              })
          })
      })
