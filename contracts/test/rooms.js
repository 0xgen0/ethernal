const {assert} = require('chai');
const {ethers} = require('@nomiclabs/buidler');
const {bfs, encodeDirections, decodeDirections, coordinatesInDirection} = require('../../backend/src/game/utils');
const {setupContracts, walk, characterCoordinates, expectError, giveKeys, moveTo, roomInfo} = require('../lib');

describe('Rooms', function () {
  describe('temple', function () {
    let setup, rooms, temple, playerWallet;

    before(async function () {
      setup = await setupContracts();
      playerWallet = setup.playerWallet;
      rooms = bfs(await walk(setup, 15, 3));
      // TODO compute rooms
      //temple = Object.values(rooms).find(({kind}) => kind === 3);
    });

    // it('found', async function() {
    //   assert.ok(temple);
    // });

    it('cannot heal in other room', async function () {
      await expectError(playerWallet.tx('heal', setup.characterId, '10'));
    });
  });
});
