const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../../../utils/_networks")
const { StreamStatus, getStatusFromIndex, setTimeFromNow } = require("../../../../utils/_helpers")
const { week, usdtUnits } = require("../../../../utils/units")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Fund-U multipleNewStream function", function () {
          let fundU

          it("Create a new stream", async function () {
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

              const start = await setTimeFromNow(1, week)
              const stop = await setTimeFromNow(3, week)
              const streamDeposit = usdtUnits("10000.0")
              await fundU
                  .connect(Alice)
                  .multipleNewStream(beneficiaries, streamDeposit, start, stop, USDT.target)

              // Checks
              for (let id = 1; id <= beneficiaries.length; id++) {
                  const newStream = await fundU.getStreamById(id)

                  assert.equal(newStream.deposit.toString(), streamDeposit.toString())
                  assert.equal(newStream.balanceLeft.toString(), streamDeposit.toString())
                  assert.equal(newStream.startTime.toString(), start.toString())
                  assert.equal(newStream.stopTime.toString(), stop.toString())
                  assert.equal(newStream.beneficiary, beneficiaries[id - 1])
                  assert.equal(newStream.owner, Alice.address)
                  assert.equal(newStream.tokenAddress, USDT.target)
                  expect(getStatusFromIndex(newStream.status)).to.equal(StreamStatus.Active)
              }
          })
      })
