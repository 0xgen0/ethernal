const {assert} = require('chai');
const {ethers} = require('@nomiclabs/buidler');
const {BigNumber} = require('ethers');
const {
  coordinatesToLocation,
  bfs,
  path,
  isLocation,
  getRing,
  monsterLevel,
  generateXp,
  generateCoins,
  kills,
  range,
  generateKeys,
  share,
} = require('../../backend/src/game/utils');
const {
  bossChance,
} = require('../../backend/src/data/utils');
const {
  setupContracts,
  forceMove,
  randomMove,
  randomWalk,
  expectError,
  characterCoordinates,
  waitFor,
  zeroAddress,
} = require('../lib');

describe('Balance', function () {
  const maxLevel = 10;
  let pure;

  before(async function () {
    await setupContracts();
    pure = await ethers.getContract('ReadOnlyDungeon');
  });

  it('ring', async function () {
    assert.equal(
      Number(await pure.getRing(coordinatesToLocation('0,0'), coordinatesToLocation('100,0'))),
      getRing('100,0'),
    );
  });

  it('monster level', async function () {
    const level = 3;
    const levelWidth = 25;
    const coordinates = levelWidth * level + ',0';
    const levelRing =
      Number(await pure.getRing(coordinatesToLocation('0,0'), coordinatesToLocation(coordinates))) / levelWidth;
    assert.equal(levelRing, level);
  });

  it('big boss spawnrate', async function () {
    const levels = {};
    for (let i = 0; i < maxLevel; i++) {
      levels[i] = bossChance(i);
    }
    console.table(levels);
  });

  it('level up requirements', async function () {
    const levels = {};
    for (let i = 0; i <= maxLevel; i++) {
      const {xpRequired, coinsRequired, hpIncrease} = await pure.toLevelUp(i);
      levels[i] = {xpRequired, coinsRequired: Number(coinsRequired), hpIncrease};
    }
    console.table(levels);
    assert.equal(levels[8].xpRequired, 1269);
    assert.equal(levels[8].coinsRequired, 153);
    assert.equal(levels[8].hpIncrease, 10);
  });

  it('kills', async function () {
    const levels = {};
    for (let i = 0; i <= maxLevel; i++) {
      levels[i] = {
        trash: kills(i),
        'mini boss': kills(i, 'mini boss'),
        'big boss': kills(i, 'big boss'),
      };
    }
    console.table(levels);
    assert.equal(levels[8].trash, 32);
    assert.equal(levels[8]['mini boss'], 10);
  });

  it('range', async function () {
    const results = [];
    for (let i = 0; i < 10000; i++) {
      results.push(range(10));
    }
    const average = Math.round(results.reduce((a, b) => a + b) / results.length);
    assert.equal(average, 10);
  });

  it('generates xp', async function () {
    const levels = {};
    for (let i = 0; i <= maxLevel - 1; i++) {
      levels[i] = {
        trash: generateXp(i, 'trash', true),
        'mini boss': generateXp(i, 'mini boss', true),
        'big boss': generateXp(i, 'big boss', true),
        'trash (range)': generateXp(i),
        'mini boss (range)': generateXp(i, 'mini boss'),
        'big boss (range)': generateXp(i, 'big boss'),
      };
    }
    console.table(levels);
    assert.equal(levels[8].trash, 10.3828125);
  });

  it('generates coins', async function () {
    const levels = {};
    for (let i = 0; i <= maxLevel - 1; i++) {
      levels[i] = {
        trash: generateCoins(i, 'trash', true),
        'mini boss': generateCoins(i, 'mini boss', true),
        'big boss': generateCoins(i, 'big boss', true),
        'trash (range)': generateCoins(i),
        'mini boss (range)': generateCoins(i, 'mini boss'),
        'big boss (range)': generateCoins(i, 'big boss'),
      };
    }
    console.table(levels);
    assert.equal(levels[0].trash, 0.82);
    assert.equal(levels[8].trash, 4.80625);
  });

  it('generates keys', async function () {
    let keys = 0;
    for (let i = 0; i <= 1000 - 1; i++) {
      keys += generateKeys();
    }
    assert.equal(Math.round(keys / 100), 4);
  });

  it('rewards room discovery', async function () {
    const levelWidth = 25;
    const levels = {};
    for (let i = 0; i <= maxLevel * 5 - 1; i++) {
      const coordinates = '0,' + i * levelWidth;
      const {numGold, numElements} = await pure.computeRoomDiscoveryReward(
        coordinatesToLocation(coordinates),
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        0,
      );
      levels[i] = {coordinates, gold: Number(numGold), elements: Number(numElements)};
    }
    console.table(levels);
  });
});
