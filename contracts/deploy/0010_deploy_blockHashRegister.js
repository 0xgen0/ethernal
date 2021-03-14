module.exports = async ({deployments, network, getNamedAccounts}) => {
  const dev_forceMine = !network.live;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
  await deploy('BlockHashRegister', {from: deployer, dev_forceMine: true, log: true});
};
