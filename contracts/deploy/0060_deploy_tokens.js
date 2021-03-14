module.exports = async ({ethers, deployments, network, getNamedAccounts}) => {
  const dev_forceMine = !network.live;
  const {deploy} = deployments;
  const {deployer, dungeonOwner} = await getNamedAccounts();

  const dungeonContract = await ethers.getContract('Dungeon');

  async function deployTokenContract(name) {
    return await deploy(name, {
      from: network.live ? deployer : dungeonOwner,
      dev_forceMine,
      proxy: 'postUpgrade',
      args: [dungeonContract.address],
      log: true,
    });
  }
  await deployTokenContract('Elements');
  await deployTokenContract('Gears');
  await deployTokenContract('Rooms');
};
