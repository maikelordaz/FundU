const { assert } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../utils/_networks")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Tokens unit tests", function () {
          let USDT, USDC, USDTAlice, USDCAlice, USDTBob, USDCBob
          const mintAmount = 1000

          beforeEach(async () => {
              // Get the accounts
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              alice = accounts[1]
              bob = accounts[2]
              // Deploy contracts
              await deployments.fixture(["tokens"])
              USDT = await ethers.getContract("tUSDT", deployer)
              USDC = await ethers.getContract("tUSDC", deployer)
              // Connect the users to contracts
              USDTAlice = USDT.connect(alice)
              USDCAlice = USDC.connect(alice)
              USDTBob = USDT.connect(bob)
              USDCBob = USDC.connect(bob)
          })

          it("Mint tokens from and to various users", async function () {
              // USDT Balances before minting
              const deployerUSDTBalanceBefore = await USDT.balanceOf(deployer.address)
              const aliceUSDTBalanceBefore = await USDTAlice.balanceOf(alice.address)
              const bobUSDTBalanceBefore = await USDTBob.balanceOf(bob.address)

              // USDC Balances before minting
              const deployerUSDCBalanceBefore = await USDC.balanceOf(deployer.address)
              const aliceUSDCBalanceBefore = await USDCAlice.balanceOf(alice.address)
              const bobUSDCBalanceBefore = await USDCBob.balanceOf(bob.address)

              // Minting USDT
              await USDT.mintUSDT(alice.address, mintAmount)
              await USDTAlice.mintUSDT(bob.address, mintAmount)
              await USDTBob.mintUSDT(deployer.address, mintAmount)

              // Minting USDC
              await USDC.mintUSDC(alice.address, mintAmount)
              await USDCAlice.mintUSDC(bob.address, mintAmount)
              await USDCBob.mintUSDC(deployer.address, mintAmount)

              //USDT Balances after minting
              const deployerUSDTBalanceAfter = await USDT.balanceOf(deployer.address)
              const aliceUSDTBalanceAfter = await USDTAlice.balanceOf(alice.address)
              const bobUSDTBalanceAfter = await USDTBob.balanceOf(bob.address)

              //USDC Balances after minting
              const deployerUSDCBalanceAfter = await USDC.balanceOf(deployer.address)
              const aliceUSDCBalanceAfter = await USDCAlice.balanceOf(alice.address)
              const bobUSDCBalanceAfter = await USDCBob.balanceOf(bob.address)

              // USDT Checks
              assert(deployerUSDTBalanceBefore < deployerUSDTBalanceAfter)
              assert(aliceUSDTBalanceBefore < aliceUSDTBalanceAfter)
              assert(bobUSDTBalanceBefore < bobUSDTBalanceAfter)
              assert.equal(deployerUSDTBalanceAfter, mintAmount)
              assert.equal(aliceUSDTBalanceAfter, mintAmount)
              assert.equal(bobUSDTBalanceAfter, mintAmount)

              // USDC Checks
              assert(deployerUSDCBalanceBefore < deployerUSDCBalanceAfter)
              assert(aliceUSDCBalanceBefore < aliceUSDCBalanceAfter)
              assert(bobUSDCBalanceBefore < bobUSDCBalanceAfter)
              assert.equal(deployerUSDCBalanceAfter, mintAmount)
              assert.equal(aliceUSDCBalanceAfter, mintAmount)
              assert.equal(bobUSDCBalanceAfter, mintAmount)
          })

          it("checks the decimals", async function () {
              const USDTdecimals = await USDT.decimals()
              const USDCdecimals = await USDC.decimals()

              assert.equal(USDTdecimals.toString(), "6")
              assert.equal(USDCdecimals.toString(), "6")
          })
      })
