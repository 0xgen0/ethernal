module.exports = async ({deployments, network, getNamedAccounts}) => {
  const dev_forceMine = !network.live;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
  await deploy('Characters', {
    from: deployer,
    dev_forceMine,
    proxy: 'postUpgrade',
    log: true,
  });
};
