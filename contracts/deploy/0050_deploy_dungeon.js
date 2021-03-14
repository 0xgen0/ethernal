module.exports = async ({ethers, deployments, network, getNamedAccounts}) => {
  const dev_forceMine = !network.live;
  const {diamond, read, execute, log, getArtifact} = deployments;
  const {deployer, dungeonOwner, backendAddress} = await getNamedAccounts();

  const playerContract = await ethers.getContract('Player');
  const dungeonAdminContract = await ethers.getContract('DungeonAdmin');
  const blockHasRegisterContract = await ethers.getContract('BlockHashRegister');

  const dungeon = await diamond.deploy('Dungeon', {
    from: network.live ? deployer : dungeonOwner,
    dev_forceMine,
    linkedData: {readOnlyDungeon: (await getArtifact('ReadOnlyDungeon')).bytecode},
    facets: [
      'DungeonActionsFacet',
      'DungeonAdminFacet',
      'DungeonCharacterFacet',
      'DungeonInfoFacet',
      'DungeonMovementFacet',
    ],
    execute: {
      methodName: 'postUpgrade',
      args: [blockHasRegisterContract.address, playerContract.address, dungeonOwner, dungeonAdminContract.address],
    },
    log: true,
  });

  const result = await read('DungeonAdmin', 'getDungeonAndBackendAddress');
  if (result.dungeon !== dungeon.address || result.backendAddress !== backendAddress) {
    log(' setting backend address...');
    await execute(
      'DungeonAdmin',
      {from: deployer, dev_forceMine},
      'setDungeonAndBackend',
      dungeon.address,
      backendAddress,
    );
  }
};
