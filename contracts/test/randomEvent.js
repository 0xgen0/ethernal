const {assert} = require('chai');
const {ethers} = require('@nomiclabs/buidler');
const {isLocation} = require('../../backend/src/game/utils');
const {setupContracts, giveKeys, waitFor} = require('../lib');

describe('Random Event', function () {
  let event, pure;

  beforeEach(async function () {
    const {characterId, playerWallet, readOnly} = await setupContracts();
    await giveKeys(characterId);
    while (2 !== (await ethers.provider.getBlockNumber()) % 3) {
      await giveKeys(characterId);
    }
    pure = readOnly;
    const {events} = await waitFor(playerWallet.tx('move', characterId, 0));
    event = events.find(({event}) => event === 'RandomEvent');
  });

  it('is emitted on third block move', async function () {
    const blockNumber = await ethers.provider.getBlockNumber();
    assert.equal(blockNumber % 3, 0);
    assert.ok(event);
  });

  it('generates location and type', async function () {
    const {areaLocation, blockNumber} = event.args;
    const {hash} = await ethers.provider.getBlock(Number(blockNumber));
    const {roomLocation, randomEvent} = await pure.generateRandomEvent(areaLocation, hash);
    assert.ok(isLocation(roomLocation));
    assert.equal(Number(randomEvent), 2);
  });
});
