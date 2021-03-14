module.exports = async ({deployments, network, getNamedAccounts}) => {
  const dev_forceMine = !network.live;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
  await deploy('DungeonAdmin', {from: deployer, dev_forceMine, args: [deployer], log: true});
};
