const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../utils/_networks")
const { erc20Units } = require("../../utils/units")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Fund-U wallet functions", function () {
          let fundU, fundUAlice, USDC, USDT, usdcAlice, usdtAlice, feeManager
          const mintAmount = 1000

          beforeEach(async () => {
              // Get the accounts
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              Alice = accounts[1]
              // Deploy contracts
              await deployments.fixture(["all"])
              fundU = await ethers.getContract("FundU", deployer)
              USDC = await ethers.getContract("tUSDC", deployer)
              USDT = await ethers.getContract("tUSDT", deployer)
              feeManager = await ethers.getContract("FeeManager", deployer)
              // Connect the users to FundU contract
              fundUAlice = fundU.connect(Alice)
              usdcAlice = USDC.connect(Alice)
              usdtAlice = USDT.connect(Alice)
          })

          describe("Deposits", function () {
              describe("Revert errors", function () {
                  it("Should revert if there is no deposits", async function () {
                      await expect(fundU.depositOnWallet(0, USDC.target)).to.be.revertedWith(
                          "Wallet: Zero amount",
                      )
                  })
                  it("Should revert if the address is not CNET, USDC or USDT", async function () {
                      await expect(
                          fundU.depositOnWallet(mintAmount, fundU.target),
                      ).to.be.revertedWith("Wallet: Only USDC and USDT")
                  })
              })
              describe("Depositing", function () {
                  beforeEach(async () => {
                      const mintAmount = erc20Units("10000.0")

                      await USDC.mintUSDC(Alice.address, mintAmount)
                      await usdcAlice.approve(fundU.target, mintAmount)

                      await USDT.mintUSDT(Alice.address, mintAmount)
                      await usdtAlice.approve(fundU.target, mintAmount)
                  })

                  it("Should update the user usdc wallet balance", async function () {
                      const userBalanceBefore = await fundUAlice.getWalletBalance(USDC.target)

                      const deposit = erc20Units("10000.0")
                      await fundUAlice.depositOnWallet(deposit, USDC.target)

                      const userBalanceAfter = await fundUAlice.getWalletBalance(USDC.target)

                      assert(userBalanceBefore.toString() < userBalanceAfter.toString())
                  })

                  it("Should update the user usdt wallet balance", async function () {
                      const userBalanceBefore = await fundUAlice.getWalletBalance(USDT.target)

                      const deposit = erc20Units("10000.0")
                      await fundUAlice.depositOnWallet(deposit, USDT.target)

                      const userBalanceAfter = await fundUAlice.getWalletBalance(USDT.target)

                      assert(userBalanceBefore.toString() < userBalanceAfter.toString())
                  })

                  it("Should deposit the usdc tokens on the contract", async function () {
                      const fundUBalanceBefore = await USDC.balanceOf(fundU.target)

                      const deposit = erc20Units("10000.0")
                      await fundUAlice.depositOnWallet(deposit, USDC.target)

                      const fundUBalanceAfter = await USDC.balanceOf(fundU.target)

                      assert(fundUBalanceBefore.toString() < fundUBalanceAfter.toString())
                  })

                  it("Should deposit the usdt tokens on the contract", async function () {
                      const fundUBalanceBefore = await USDT.balanceOf(fundU.target)

                      const deposit = erc20Units("10000.0")
                      await fundUAlice.depositOnWallet(deposit, USDT.target)

                      const fundUBalanceAfter = await USDT.balanceOf(fundU.target)

                      assert(fundUBalanceBefore.toString() < fundUBalanceAfter.toString())
                  })

                  it("Should emit an event", async function () {
                      const deposit = erc20Units("10000.0")
                      expect(await fundUAlice.depositOnWallet(deposit, USDT.target)).to.emit(
                          "WalletDeposit",
                      )
                  })
              })
          })

          describe("Withdraws", function () {
              describe("Revert errors", function () {
                  it("Should revert if there is no amount to withdraw", async function () {
                      await expect(fundU.withdrawFromWallet(0, USDC.target)).to.be.revertedWith(
                          "Wallet: Zero amount",
                      )
                  })
                  it("Should revert if the address is not USDC or USDT", async function () {
                      await expect(
                          fundU.withdrawFromWallet(mintAmount, fundU.target),
                      ).to.be.revertedWith("Wallet: Only  USDC and USDT")
                  })
                  it("Should revert if there is not enough balance on wallet", async function () {
                      await expect(
                          fundU.withdrawFromWallet(mintAmount, USDT.target),
                      ).to.be.revertedWith("Wallet: Not enough balance")
                  })
              })
              describe("Withdrawing", function () {
                  beforeEach(async () => {
                      const deposit = erc20Units("10000.0")

                      await USDC.mintUSDC(Alice.address, deposit)
                      await usdcAlice.approve(fundU.target, deposit)

                      await USDT.mintUSDT(Alice.address, deposit)
                      await usdtAlice.approve(fundU.target, deposit)

                      await fundUAlice.depositOnWallet(deposit, USDC.target)
                      await fundUAlice.depositOnWallet(deposit, USDT.target)
                  })

                  it("Should update the user usdc wallet balance", async function () {
                      const userBalanceBefore = await fundUAlice.getWalletBalance(USDC.target)

                      const amountToWithdraw = erc20Units("10000.0")
                      await fundUAlice.withdrawFromWallet(amountToWithdraw, USDC.target)

                      const userBalanceAfter = await fundUAlice.getWalletBalance(USDC.target)

                      assert(userBalanceAfter.toString() < userBalanceBefore.toString())
                  })

                  it("Should update the user usdt wallet balance", async function () {
                      const userBalanceBefore = await fundUAlice.getWalletBalance(USDT.target)

                      const amountToWithdraw = erc20Units("10000.0")
                      await fundUAlice.withdrawFromWallet(amountToWithdraw, USDT.target)

                      const userBalanceAfter = await fundUAlice.getWalletBalance(USDT.target)

                      assert(userBalanceAfter.toString() < userBalanceBefore.toString())
                  })

                  it("Should withdraw transfer the usdc tokens to the user", async function () {
                      const AliceBalanceBefore = await USDC.balanceOf(Alice.address)

                      const amountToWithdraw = erc20Units("10000.0")
                      await fundUAlice.withdrawFromWallet(amountToWithdraw, USDC.target)

                      const AliceBalanceAfter = await USDC.balanceOf(Alice.address)

                      assert(AliceBalanceBefore.toString() < AliceBalanceAfter.toString())
                  })

                  it("Should withdraw transfer the usdt tokens to the user", async function () {
                      const AliceBalanceBefore = await USDT.balanceOf(Alice.address)

                      const amountToWithdraw = erc20Units("10000.0")
                      await fundUAlice.withdrawFromWallet(amountToWithdraw, USDT.target)

                      const AliceBalanceAfter = await USDT.balanceOf(Alice.address)

                      assert(AliceBalanceBefore.toString() < AliceBalanceAfter.toString())
                  })

                  it("Should emit an event", async function () {
                      const amountToWithdraw = erc20Units("10000.0")
                      expect(
                          await fundUAlice.withdrawFromWallet(amountToWithdraw, USDC.target),
                      ).to.emit("WalletWithdraw")
                  })
              })
          })

          describe("Settings", function () {
              it("Should revert if the new manager is the address zero", async function () {
                  const newManager = ethers.ZeroAddress

                  await expect(fundUAlice.setNewFeeManagerAddress(newManager)).to.be.revertedWith(
                      "Wallet: Invalid Manager address",
                  )
              })

              it("Should revert if the new address is not a new one", async function () {
                  const newManager = feeManager.target

                  await expect(fundUAlice.setNewFeeManagerAddress(newManager)).to.be.revertedWith(
                      "Wallet: Invalid Manager address",
                  )
              })

              it("Should revert if the caller is not the protocol owner", async function () {
                  const newManager = feeManager.target

                  await expect(fundU.setNewFeeManagerAddress(newManager)).to.be.revertedWith(
                      "FeeManager: Only the protocol manager is allowed",
                  )
              })

              it("Should revert if the caller is not the protocol owner", async function () {
                  const newManager = USDC.target

                  await expect(fundUAlice.setNewFeeManagerAddress(newManager)).not.to.be.reverted
              })
          })
      })
