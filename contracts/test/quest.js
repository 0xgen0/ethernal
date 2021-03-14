const {assert} = require('chai');
const {ethers} = require('@nomiclabs/buidler');
const {bfs, encodeDirections, decodeDirections, coordinatesInDirection} = require('../../backend/src/game/utils');
const {setupContracts, waitFor, characterCoordinates, expectError, giveKeys, moveTo, roomInfo} = require('../lib');

describe('Quest', function () {
  let dungeon, admin, character;

  beforeEach(async function () {
    const setup = await setupContracts();
    admin = setup.admin;
    dungeon = setup.dungeonContract;
    character = setup.characterId;
  });

  it('get non existent', async function () {
    const {status, data} = await dungeon.getQuest(character, 1);
    assert.equal(data, '');
    assert.equal(status, 0);
  });

  it('update', async function () {
    await waitFor(admin.updateQuest(character, 1, 1, '1,2,3'));
    const {data} = await dungeon.getQuest(character, 1);
    assert.equal(data, '1,2,3');
  });
});
