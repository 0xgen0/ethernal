const {enter, walk} = require('../lib');
const {BigNumber} = require('ethers');
const webappConfig = require('../../webapp/src/data/config');

module.exports = async ({getNamedAccounts, getChainId}) => {
  const chainId = await getChainId();
  const config = webappConfig(chainId);
  const gasPrice = BigNumber.from(config.gasPrice);
  const explore = Number(process.env.EXPLORE);
  const {deployer} = await getNamedAccounts();
  const setup = await enter(deployer, config.price, gasPrice);
  setup.opts = {gasPrice};
  console.log('walker is exploring');
  const rooms = await walk(setup, explore);
  console.log('walker finished after ' + Object.keys(rooms).length + ' rooms');
};

module.exports.skip = async () => !process.env.EXPLORE;
