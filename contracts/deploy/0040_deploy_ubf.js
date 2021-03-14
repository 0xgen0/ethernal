module.exports = async ({ethers, deployments, network, getNamedAccounts}) => {
  const dev_forceMine = !network.live;
  const {deploy} = deployments;
  const {deployer, dungeonOwner} = await getNamedAccounts();

  const charactersContract = await ethers.getContract('Characters');

  await deploy('UBF', {
    from: network.live ? deployer : dungeonOwner,
    dev_forceMine,
    log: true,
    proxy: 'postUpgrade',
    args: [charactersContract.address],
  });
};
