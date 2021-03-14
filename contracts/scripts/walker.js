const {enter, walk} = require('../lib');
const {BigNumber} = require('ethers');
const webappConfig = require('../../webapp/src/data/config');
const {ethers, deployments, getNamedAccounts, getChainId} = require('@nomiclabs/buidler');

const walker = async () => {
  const dungeonAdmin = await ethers.getContract('DungeonAdmin');
  const [dungeon, backendAddress] = await dungeonAdmin.callStatic.getDungeonAndBackendAddress();
  console.log('dungeon ' + dungeon);
  const {deployer} = await getNamedAccounts();
  if (backendAddress.toLowerCase() !== deployer.toLowerCase()) {
    throw new Error('unauthorized ' + deployer + ', expected ' + backendAddress);
  }
  console.log('using address ' + deployer);
  const chainId = await getChainId();
  const config = webappConfig(chainId);
  const gasPrice = BigNumber.from(config.gasPrice);
  const explore = Number(process.env.EXPLORE);
  const setup = await enter(deployer, config.price, gasPrice);
  setup.opts = {gasPrice};
  console.log('walker is exploring');
  const rooms = await walk(setup, 1000);
  console.log('walker finished after ' + Object.keys(rooms).length + ' rooms');
};

walker()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
