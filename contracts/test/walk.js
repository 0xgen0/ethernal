const {assert} = require('chai');
const {ethers} = require('@nomiclabs/buidler');
const {bfs, encodeDirections, decodeDirections, coordinatesInDirection} = require('../../backend/src/game/utils');
const {setupContracts, walk, characterCoordinates, expectError, giveKeys, moveTo, roomInfo} = require('../lib');

describe('Walk', function () {
  it('it walks!', async function () {
    const setup = await setupContracts();
    const rooms = await walk(setup, 10);
    assert.equal(Object.values(rooms).filter(({status}) => status !== 'undiscovered').length, 10);
  });
});
