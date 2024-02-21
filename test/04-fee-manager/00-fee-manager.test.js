const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../utils/_networks")
const { usdtUnits } = require("../../utils/units")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Fee Manager unit tests", function () {
          let fundU, feeManager, USDC, USDT, fundUCharlie, fundUEva, usdcCharlie, usdtCharlie

          beforeEach(async () => {
              // Get the accounts
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              Alice = accounts[1]
              Bob = accounts[2]
              Charlie = accounts[3]
              Eva = accounts[4]
              // Deploy contracts
              await deployments.fixture(["all"])
              fundU = await ethers.getContract("FundU", deployer)
              feeManager = await ethers.getContract("FeeManager", deployer)
              USDC = await ethers.getContract("tUSDC", deployer)
              USDT = await ethers.getContract("tUSDT", deployer)

              // Connect the users to FunU contract
              fundUCharlie = fundU.connect(Charlie)
              fundUEva = fundU.connect(Eva)
              usdcCharlie = USDC.connect(Charlie)
              usdtCharlie = USDT.connect(Charlie)
              feeManagerAlice = feeManager.connect(Alice)
              feeManagerBob = feeManager.connect(Bob)

              // Deposit on wallet
              const deposit = usdtUnits("10000.0")

              await USDC.mintUSDC(Charlie.address, deposit)
              await USDT.mintUSDT(Charlie.address, deposit)

              await usdcCharlie.approve(fundU.target, deposit)
              await usdtCharlie.approve(fundU.target, deposit)

              await fundUCharlie.depositOnWallet(deposit, USDC.target)
              await fundUCharlie.depositOnWallet(deposit, USDT.target)

              // Creating instant payment

              const payment = usdtUnits("1000.0")

              await fundUCharlie.instantPayments(Eva.address, payment, USDC.target)
              await fundUCharlie.instantPayments(Eva.address, payment, USDT.target)
          })

          describe("Fee", function () {
              it("Set the correct transaction fee on deploy", async function () {
                  const chainId = network.config.chainId
                  const expectedFee = networkConfig[chainId]["fee"]
                  const actualFee = await feeManager.getTransactionFee()

                  assert.equal(expectedFee.toString(), actualFee.toString())
              })

              it("Should revert if the caller is incorrect", async function () {
                  await expect(feeManager.setNewTransactionFee(1)).to.be.revertedWith(
                      "FeeManager: Only the fee managers allowed",
                  )
              })

              it("Set new transaction fee", async function () {
                  const chainId = network.config.chainId
                  const oldFee = networkConfig[chainId]["fee"]
                  const newFee = "1"

                  await feeManagerAlice.setNewTransactionFee(newFee)
                  const actualFee = await feeManager.getTransactionFee()

                  assert.equal(newFee.toString(), actualFee.toString())
                  expect(oldFee.toString()).to.not.equal(actualFee.toString())
              })

              it("Should revert if the new fee is not bigger than zero or less than 100", async function () {
                  await expect(feeManagerAlice.setNewTransactionFee(0)).to.be.revertedWith(
                      "FeeManager: Invalid fee",
                  )

                  await expect(feeManagerAlice.setNewTransactionFee(101)).to.be.revertedWith(
                      "FeeManager: Invalid fee",
                  )
              })
          })

          describe("Managers", function () {
              it("Set the correct protocol manager on deploy", async function () {
                  const expectedManager = Alice.address
                  const actualManager = await feeManager.getProtocolManager()

                  assert.equal(expectedManager, actualManager)
              })

              describe("Fee manager", function () {
                  it("Set the correct fee manager on deploy", async function () {
                      const expectedManager = Alice.address
                      const actualManager = await feeManager.getFeeManager()

                      assert.equal(expectedManager, actualManager)
                  })

                  it("Set new fee manager", async function () {
                      const oldManager = await feeManager.getFeeManager()

                      await feeManagerAlice.setNewFeeManager(Eva.address)
                      const newManager = await feeManager.getFeeManager()

                      assert.equal(newManager, Eva.address)
                      expect(oldManager).to.not.equal(newManager)
                  })

                  it("Should revert if the caller is incorrect", async function () {
                      await expect(feeManager.setNewFeeManager(Eva.address)).to.be.revertedWith(
                          "FeeManager: Only the protocol manager is allowed",
                      )
                  })

                  it("Should revert if the new manager is the address zero", async function () {
                      await expect(
                          feeManagerAlice.setNewFeeManager(ethers.ZeroAddress),
                      ).to.be.revertedWith("FeeManager: Invalid manager address")
                  })

                  it("Should revert if the new manager is the address zero", async function () {
                      await expect(
                          feeManagerAlice.setNewFeeManager(feeManager.target),
                      ).to.be.revertedWith("FeeManager: Invalid manager address")
                  })
              })
          })

          describe("Collect fees", function () {
              it("Collect fees on USDC", async function () {
                  const payment = usdtUnits("500.0")

                  const usdcBalanceBefore = await USDC.balanceOf(feeManager.target)

                  await fundUCharlie.instantPayments(Eva.address, payment, USDC.target)
                  balanceUSDC = await feeManager.s_protocolBalanceByToken(USDC.target)

                  const usdcBalanceAfter = await USDC.balanceOf(feeManager.target)

                  assert(usdcBalanceBefore < usdcBalanceAfter)
                  assert.equal(usdcBalanceAfter.toString(), balanceUSDC.toString())
              })

              it("Collect fees on USDT", async function () {
                  const payment = usdtUnits("500.0")

                  const usdtBalanceBefore = await USDT.balanceOf(feeManager.target)

                  await fundUCharlie.instantPayments(Eva.address, payment, USDT.target)
                  balanceUSDT = await feeManager.s_protocolBalanceByToken(USDT.target)

                  const usdtBalanceAfter = await USDT.balanceOf(feeManager.target)

                  assert(usdtBalanceBefore < usdtBalanceAfter)
                  assert.equal(usdtBalanceAfter.toString(), balanceUSDT.toString())
              })
          })

          describe("Withdraw fees", function () {
              it("Withdraw collected USDC fees", async function () {
                  const manager = await feeManager.getFeeManager()
                  const usdcProtocolBalanceBefore = await USDC.balanceOf(feeManager.target)
                  const usdcManagerBalanceBefore = await USDC.balanceOf(manager)

                  await feeManagerAlice.withdrawFees(USDC.target)

                  const usdcProtocolBalanceAfter = await USDC.balanceOf(feeManager.target)
                  const usdcManagerBalanceAfter = await USDC.balanceOf(manager)

                  assert(usdcProtocolBalanceBefore > usdcProtocolBalanceAfter)
                  assert(usdcManagerBalanceBefore < usdcManagerBalanceAfter)
              })

              it("Withdraw collected USDT fees", async function () {
                  const manager = await feeManager.getFeeManager()
                  const usdtProtocolBalanceBefore = await USDT.balanceOf(feeManager.target)
                  const usdtManagerBalanceBefore = await USDT.balanceOf(manager)

                  await feeManagerAlice.withdrawFees(USDT.target)

                  const usdtProtocolBalanceAfter = await USDT.balanceOf(feeManager.target)
                  const usdtManagerBalanceAfter = await USDT.balanceOf(manager)

                  assert(usdtProtocolBalanceBefore > usdtProtocolBalanceAfter)
                  assert(usdtManagerBalanceBefore < usdtManagerBalanceAfter)
              })

              it("Should revert if there is nothing to withdraw", async function () {
                  await feeManagerAlice.withdrawFees(USDT.target)
                  await expect(feeManagerAlice.withdrawFees(USDT.target)).to.be.revertedWith(
                      "FeeManager: Zero balance for this token",
                  )
              })

              it("Should revert if the caller is incorrect", async function () {
                  await expect(feeManager.withdrawFees(USDT.target)).to.be.revertedWith(
                      "FeeManager: Only the fee managers allowed",
                  )
              })
          })
      })
