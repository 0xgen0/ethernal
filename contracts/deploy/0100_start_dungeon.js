const {BigNumber} = require('@ethersproject/bignumber');
module.exports = async ({ethers, deployments, network, getNamedAccounts}) => {
  const dev_forceMine = !network.live;
  const {diamond, read, execute, log} = deployments;
  const {deployer, dungeonOwner, backendAddress} = await getNamedAccounts();

  const room0Data = await read(
    'Dungeon',
    'getRoomInfo',
    BigNumber.from('0x8000000000000000000000000000000000000000000000000000000000000000'),
  );
  const started = room0Data.blockNumber.gt(0);
  if (!started) {
    log('starting dungeon...');
    await diamond.executeAsOwner(
      'Dungeon',
      {from: dungeonOwner, dev_forceMine},
      'start',
      (await deployments.get('Characters')).address,
      (await deployments.get('Elements')).address,
      (await deployments.get('Gears')).address,
      (await deployments.get('Rooms')).address,
    );
    log('actualising first room');
    await execute(
      'Dungeon',
      {from: dungeonOwner, dev_forceMine},
      'actualiseRoom',
      '0x8000000000000000000000000000000000000000000000000000000000000000',
    );
    log('dungeon deployed');
  } else {
    log('already started');
  }
};
