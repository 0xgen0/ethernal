module.exports = async ({network, getNamedAccounts, deployments, ethers}) => {
  const {execute, deploy, log} = deployments;

  const dev_forceMine = !network.live;
  const {deployer, dungeonOwner, backendAddress} = await getNamedAccounts();

  const dungeon = await deployments.get('Dungeon');
  const player = await deployments.get('Player');
  const gears = await deployments.get('Gears');
  const elements = await deployments.get('Elements');
  const characters = await deployments.get('Characters');

  log('DungeonTokenTransferer...');
  const dungeonTokenTransferer = await deploy('DungeonTokenTransferer', {
    from: network.live ? deployer : dungeonOwner,
    proxy: 'postUpgrade',
    dev_forceMine,
    args: [dungeon.address, player.address, gears.address, elements.address, characters.address],
    log: true,
  });

  const gearsContract = await ethers.getContract('Gears');
  const areGearsAlreadypproved = await gearsContract.callStatic.isApprovedForAll(
    dungeon.address,
    dungeonTokenTransferer.address,
  );
  const elementsContract = await ethers.getContract('Elements');
  const areElementsAlreadypproved = await elementsContract.callStatic.isApprovedForAll(
    dungeon.address,
    dungeonTokenTransferer.address,
  );

  const {data: approvallData} = await gearsContract.populateTransaction.setApprovalForAll(
    dungeonTokenTransferer.address,
    true,
  );
  if (!areGearsAlreadypproved) {
    log('appoving gears for transfers...');
    await execute(
      'DungeonAdmin',
      {from: backendAddress, gas: 4000000, dev_forceMine},
      'forward',
      gears.address,
      approvallData,
    );
    log('gears are approved for transfers');
  }
  if (!areElementsAlreadypproved) {
    log('appoving elements for transfers...');
    await execute(
      'DungeonAdmin',
      {from: backendAddress, gas: 4000000, dev_forceMine},
      'forward',
      elements.address,
      approvallData,
    );
    log('elements are approved for transfers');
  }

  // TEST (should not be necessary)
  const isApproved = await gearsContract.callStatic.isApprovedForAll(dungeon.address, dungeonTokenTransferer.address);
  if (!isApproved) {
    log('failed to approve gears for transfers');
  }
};
module.exports.tags = ['Dungeon'];
