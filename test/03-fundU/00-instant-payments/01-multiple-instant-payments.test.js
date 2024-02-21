const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../../utils/_networks")
const { StreamStatus, getStatusFromIndex } = require("../../../utils/_helpers")
const { usdtUnits } = require("../../../utils/units")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Fund-U multipleInstantPayments function", function () {
          let fundU, USDT

          it("Create new payments", async function () {
              // Get the accounts
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              Alice = accounts[1]
              Bob = accounts[2]
              Charlie = accounts[3]
              Dave = accounts[4]
              beneficiaries = [Bob.address, Charlie.address, Dave.address]

              // Deploy contracts
              await deployments.fixture(["all"])
              fundU = await ethers.getContract("FundU", deployer)
              USDT = await ethers.getContract("tUSDT", deployer)
              // Deposit on wallet
              const deposit = usdtUnits("1000000.0")

              await USDT.mintUSDT(Alice.address, deposit)

              await USDT.connect(Alice).approve(fundU.target, deposit)

              await fundU.connect(Alice).depositOnWallet(deposit, USDT.target)

              // Make the payments
              const payment = usdtUnits("5000.0")

              await fundU
                  .connect(Alice)
                  .multipleInstantPayments(beneficiaries, payment, USDT.target)

              // Checks
              for (let id = 1; id <= beneficiaries.length; id++) {
                  const newInstantPayment = await fundU.getStreamById(id)

                  assert.equal(newInstantPayment.deposit.toString(), payment.toString())
                  assert.equal(newInstantPayment.balanceLeft.toString(), "0")
                  assert.equal(
                      newInstantPayment.startTime.toString(),
                      newInstantPayment.stopTime.toString(),
                  )
                  assert.equal(newInstantPayment.beneficiary, beneficiaries[id - 1])
                  assert.equal(newInstantPayment.owner, Alice.address)
                  assert.equal(newInstantPayment.tokenAddress, USDT.target)
                  expect(getStatusFromIndex(newInstantPayment.status)).to.equal(
                      StreamStatus.Completed,
                  )
              }
          })
      })
