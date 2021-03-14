module.exports = async ({deployments, network, getNamedAccounts}) => {
  const dev_forceMine = !network.live;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
  const PureDungeon = await deploy('PureDungeon', {from: deployer, dev_forceMine, log: true});
  await deploy('ReadOnlyDungeon', {
    from: deployer,
    dev_forceMine,
    libraries: {
      PureDungeon: PureDungeon.address,
    },
    log: true,
  });
};
