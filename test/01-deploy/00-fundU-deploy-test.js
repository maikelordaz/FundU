const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../utils/_networks")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Fund-U deploy", function () {
          let fundU, usdc, usdt

          beforeEach(async () => {
              // Get the accounts
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              // Deploy contracts
              await deployments.fixture(["all"])
              fundU = await ethers.getContract("FundU", deployer)
              usdc = await ethers.getContract("tUSDC", deployer)
              usdt = await ethers.getContract("tUSDT", deployer)
          })

          it("Should set the initial id", async function () {
              const id = await fundU.getStreamsNumber()
              assert.equal(id.toString(), "0")
          })

          it("Should revert if the contract receive ethers", async function () {
              await expect(
                  deployer.sendTransaction({
                      to: fundU.target,
                      value: ethers.parseEther("1.0"),
                  }),
              ).to.be.reverted
          })

          describe("Tokens info", function () {
              it("Should get the correct usdc address", async function () {
                  const usdcAddress = await fundU.getUsdcAddress()
                  assert.equal(usdcAddress, usdc.target)
              })

              it("Should get the correct usdt address", async function () {
                  const usdtAddress = await fundU.getUsdtAddress()
                  assert.equal(usdtAddress, usdt.target)
              })
          })
      })
