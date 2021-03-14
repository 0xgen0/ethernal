const {assert} = require('chai');
const {ethers} = require('@nomiclabs/buidler');
const {
  bfs,
  encodeDirections,
  decodeDirections,
  coordinatesInDirection,
  coordinatesToLocation,
} = require('../../backend/src/game/utils');
const {setupContracts, walk, expectError, giveKeys, moveTo, roomInfo, waitFor} = require('../lib');

describe('Movement', function () {
  it('cannot path from not actualized room', async function () {
    const {playerWallet, characterId} = await setupContracts();
    await giveKeys(characterId);
    for (let dir = 0; dir < 4; dir++) {
      const tx = await playerWallet.tx('movePath', characterId, [dir, dir, dir]);
      await expectError(tx, 'cant move this way');
    }
  });

  // TODO finish test after movement fixes merge
  // it('path reported for single move', async function() {
  //   const {playerWallet, characterId} = await setupContracts();
  //   const receipt = await playerWallet.tx('move', characterId, '0').then(tx => tx.wait());
  // });

  describe('move multiple rooms', function () {
    let setup, rooms, playerWallet;

    before(async function () {
      setup = await setupContracts();
      playerWallet = setup.playerWallet;
      rooms = bfs(await walk(setup, 25));
    });

    beforeEach(async function () {
      await ethers
        .getContract('DungeonAdmin')
        .then(admin => admin.teleportCharacter(setup.characterId, coordinatesToLocation('0,0')));
    });

    it('atleast 1 direction needed', async function () {
      const tx = await playerWallet.tx('movePath', setup.characterId, []);
      await expectError(tx, 'invalid number of directions');
    });

    it('move 2', async function () {
      const destination = Object.values(rooms)
        .filter(({parent}) => parent.path && parent.path.length === 2)
        .reverse()[0];
      const {receipt, blocked} = await moveTo(setup, destination);
      if (!blocked) {
        const {path} = receipt.events.find(({event}) => event === 'CharacterMoved').args;
        assert.deepEqual(decodeDirections(path), destination.parent.path);
      }
    });

    it('move 5', async function () {
      const destination = Object.values(rooms).filter(({parent}) => parent.path && parent.path.length === 5)[0];
      const {receipt, blocked} = await moveTo(setup, destination);
      if (!blocked) {
        const {path} = receipt.events.find(({event}) => event === 'CharacterMoved').args;
        assert.deepEqual(decodeDirections(path), destination.parent.path);
      }
    });

    it('cannot move more than 5', async function () {
      const tx = await playerWallet.tx('movePath', setup.characterId, [1, 1, 1, 1, 1, 1]);
      await expectError(tx, 'invalid number of directions');
    });
  });

  describe('discover', function () {
    let setup, rooms, playerWallet;

    const blockNumber = async destination =>
      roomInfo(destination.coordinates).then(({blockNumber}) => Number(blockNumber));

    beforeEach(async function () {
      setup = await setupContracts();
      playerWallet = setup.playerWallet;
      rooms = bfs(await walk(setup, 1));
    });

    it('discover cost', async function () {
      assert.equal(Number(await setup.readOnly.discoveryCost(coordinatesToLocation('0,1'))), 1);
    });

    it('has to have elements', async function () {
      await waitFor(
        setup.admin.updateCharacter(setup.characterId, '0', '0', '0', '0', '0', ['0', '0', '0', '0', '0', '0', '0', '-10000']),
      );
      const destination = Object.values(rooms).filter(({status}) => status === 'undiscovered')[0];
      assert.equal(await blockNumber(destination), 0);
      try {
        await moveTo(setup, destination);
        assert.fail();
      } catch (e) {
        assert.ok(true);
      }
      assert.equal(await blockNumber(destination), 0);
    });

    it('room on path', async function () {
      const destination = Object.values(rooms).filter(({status}) => status === 'undiscovered')[0];
      assert.equal(await blockNumber(destination), 0);
      await moveTo(setup, destination);
      assert.notEqual(await blockNumber(destination), 0);
    });

    it('cannot discover 2 rooms in one move', async function () {
      const destination = Object.values(rooms).filter(({status}) => status === 'undiscovered')[0];
      const {path} = destination.parent;
      const extraMove = path[path.length - 1];
      const undiscovered2 = {coordinates: coordinatesInDirection(destination.coordinates, extraMove)};
      assert.equal(await blockNumber(destination), 0);
      assert.equal(await blockNumber(undiscovered2), 0);
      const directions = encodeDirections([...path, extraMove]);
      await expectError(playerWallet.tx('movePath', setup.characterId, directions));
      assert.equal(await blockNumber(destination), 0);
      assert.equal(await blockNumber(undiscovered2), 0);
    });
  });
});
