const RPSCoin = artifacts.require("RPSCoin");
const RPS = artifacts.require("RPS");

module.exports = async function (deployer, network, accounts) {
  // Deploy RPSCoin with initial supply
  // const initialSupply = web3.utils.toWei("1000000", "ether"); // 1 million RPSCoin
  await deployer.deploy(RPSCoin);
  const rpsCoin = await RPSCoin.deployed();

  // Deploy RockPaperScissors with RPSCoin address
  await deployer.deploy(RPS, rpsCoin.address);
};
