module.exports = async ({network, deployments, getNamedAccounts}) => {
  const {sendTxAndWait} = deployments;
  let dev_forceMine = false;
  if (network.live) {
    return;
  } else {
    dev_forceMine = true;
  }

  const {deployer, backendAddress} = await getNamedAccounts();
  await sendTxAndWait({from: deployer, to: backendAddress, value: '20000000000000000000', gas: 21000, dev_forceMine});
};
module.exports.skip = async () => true;
