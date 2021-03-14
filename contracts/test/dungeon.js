const {assert} = require('chai');
const {ethers} = require('@nomiclabs/buidler');
const {BigNumber} = require('ethers');
const {locationToCoordinates, coordinatesToLocation, isLocation} = require('../../backend/src/game/utils');
const {setupContracts, forceMove, randomMove, randomWalk, expectError, characterCoordinates} = require('../lib');

describe('Dungeon', function () {
  it('coordinates to location', function () {
    assert.equal(locationToCoordinates(coordinatesToLocation('0,0')), '0,0');
  });

  it('first room actualized', async function () {
    const {dungeonContract, characterId} = await setupContracts();
    const {actualised} = await dungeonContract.getRoomInfo(
      '0x8000000000000000000000000000000000000000000000000000000000000000',
    );
    assert.equal(actualised, true);
  });

  it('first character created', async function () {
    const {characterId} = await setupContracts();
    assert.equal(characterId.toString(), '1');
  });

  it('origin location', async function () {
    const origin = BigNumber.from('0x8000000000000000000000000000000000000000000000000000000000000000');
    assert.equal(locationToCoordinates(origin), '0,0');
    assert.ok(origin.eq(coordinatesToLocation('0,0')));
  });

  it('is location', async function () {
    assert.ok(isLocation(coordinatesToLocation('0,0')));
    assert.equal(isLocation('0'), false);
  });

  it('correct enter location', async function () {
    const {characterId} = await setupContracts({enterLocation: '1'});
    assert.equal(await characterCoordinates(characterId), '0,0');
  });

  describe('pure functions', function () {
    let readOnly;

    before(async function () {
      readOnly = await ethers.getContract('ReadOnlyDungeon');
    });

    it('location to coordinates', async function () {
      const [x, y, z] = await readOnly.toCoordinates('0');
      assert.equal(x, 0);
      assert.equal(y, 0);
      assert.equal(z, 0);
    });

    it('coordinates to location', async function () {
      const location = await readOnly.toLocation('0', '0', '0');
      assert.ok(location.eq('0x8000000000000000000000000000000000000000000000000000000000000000'));
    });

    it('coordinates to location to coordinates', async function () {
      const location = await readOnly.toLocation('4', '20', '1');
      const [x, y, z] = await readOnly.toCoordinates(location);
      assert.equal(x, 4);
      assert.equal(y, 20);
      assert.equal(z, 1);
    });

    it('reward for discovery', async function () {
      const {numGold, numElements} = await readOnly.computeRoomDiscoveryReward(
        coordinatesToLocation('0,0'),
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        0,
      );
      assert(Number(numGold) > 0);
      assert(Number(numElements) > 0);
    });

    it('class bonus for discovery', async function () {
      const {numGold} = await readOnly.computeRoomDiscoveryReward(
        '1000',
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        0,
      );
      const {numGold: goldWithBonus} = await readOnly.computeRoomDiscoveryReward(
        '1000',
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        1,
      );
      assert(Number(goldWithBonus) > Number(numGold));
    });

    it('hp cost', async function () {
      assert.equal(Number(await readOnly.hpCost('1000')), 1000);
      assert.equal(Number(await readOnly.hpCost('0')), 0);
    });

    it('teleport cost', async function () {
      assert.equal(
        Number(await readOnly.teleportTax(coordinatesToLocation('0,0'), coordinatesToLocation('0,100'))),
        40,
      );
      assert.equal(Number(await readOnly.teleportTax(coordinatesToLocation('0,0'), coordinatesToLocation('0,1'))), 1);
    });

    it('area location', async function () {
      const getAreaCoordinates = async coord =>
        locationToCoordinates(await readOnly.getAreaLoc(coordinatesToLocation(coord)));
      const cases = [
        ['0,0', '0,0'],
        ['4,0', '0,0'],
        ['5,0', '1,0'],
        ['14,0', '2,0'],
        ['0,0', '0,0'],
        ['0,4', '0,0'],
        ['0,5', '0,1'],
        ['0,14', '0,2'],
        ['-1,0', '0,0'],
        ['0,-1', '0,0'],
        ['0,-5', '0,-1'],
        ['-5,0', '-1,0'],
        ['-14,0', '-2,0'],
        ['-22,0', '-2,0'],
        ['-23,0', '-3,0'],
      ];
      for (const [coords, areaCoords] of cases) {
        assert.equal(await getAreaCoordinates(coords), areaCoords, 'wrong conversion of ' + coords);
      }
    });

    it('dont generate special area close to center', async function () {
      const location = coordinatesToLocation('3,-15');
      const blockHash = '0x255cca29c60b2f031cc5079321cd3182da40fa36d435d68a6dbead1a39510cb0';
      const areaLoc = await readOnly.getAreaLoc(location);
      const generatedAreaType = await readOnly.generateArea(areaLoc, blockHash, 0);
      assert.equal(Number(generatedAreaType), Number(6));
    });
  });

  describe('move', function () {
    it('anywhere', async function () {
      const setup = await setupContracts();
      const {location} = await randomMove(setup);
    });

    it('north', async function () {
      const info = await forceMove(0);
      assert.equal(locationToCoordinates(info.location), '0,-1');
    });

    it('east', async function () {
      const info = await forceMove(1);
      assert.equal(locationToCoordinates(info.location), '1,0');
    });

    it('south', async function () {
      const info = await forceMove(2);
      assert.equal(locationToCoordinates(info.location), '0,1');
    });

    it('west', async function () {
      const info = await forceMove(3);
      assert.equal(locationToCoordinates(info.location), '-1,0');
    });

    it('cannot move other direction', async function () {
      const {characterId, playerWallet} = await setupContracts();
      const tx = await playerWallet.tx('move', characterId, 6);
      await expectError(tx, 'impossible direction');
    });
  });

  describe('monster', function () {
    let setup, path;

    beforeEach(async function () {
      setup = await setupContracts();
      path = ['0,0'];
      try {
        for (let moves = 0; moves < 100; moves++) {
          await randomMove(setup);
          path.push(await characterCoordinates(setup.characterId));
        }
      } catch ({reason}) {
        assert.equal(reason, 'monster blocking');
        return;
      }
      assert.fail('monster not found even after 100 moves');
    });

    it('found', async function () {
      assert.ok(setup);
    });

    it('killed', async function () {
      await randomMove(setup, true);
    });

    it('escaped', async function () {
      const {admin, characterId} = setup;
      await admin.characterEscaped(characterId, '1', '0', '0');
      const escapedTo = await characterCoordinates(characterId);
      assert.equal(path[path.length - 2], escapedTo, 'escaped to the wrong room');
    });
  });

  describe('discovery', function () {
    it('5 rooms', async function () {
      const setup = await setupContracts();
      const rooms = await randomWalk(setup, 5);
      assert.equal(Object.keys(rooms).length, 5);
    });
  });
});
