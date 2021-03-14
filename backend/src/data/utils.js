const Sentry = require('@sentry/node');
const { arrayify, zeroPad, hexlify } = require('ethers').utils;
const { BigNumber } = require('ethers');
const gears = require('./gears');
const config = require('./config');
const uniqueGears = require('./uniqueGears');
const { parseCoordinates, distribute } = require('../game/utils.js');

const uint256 = number => hexlify(zeroPad(arrayify(hexlify(BigNumber.from(number))), 32));
const toAddress = number => hexlify(zeroPad(arrayify(hexlify(BigNumber.from(number))), 20)).toLowerCase();

const createReward = reward => ({
  characterId: 0,
  hpChange: 0,
  xpGained: 0,
  // gear: '0x00',
  durabilityChange: 0,
  balanceChange: [0, 0, 0, 0, 0, 0, 0, 0],
  ...reward,
});

const createBalance = balance => ({
  coins: 0,
  keys: 0,
  fragments: 0,
  elements: [0, 0, 0, 0, 0],
  ...balance,
});

const createBalanceFromAmounts = (amounts = [0, 0, 0, 0, 0, 0, 0, 0]) => {
  const elements = amounts.slice(0, 5);
  const [coins, keys, fragments] = amounts.slice(5);
  return { coins, keys, fragments, elements };
};

const balanceToAmounts = balance => {
  const { coins, keys, fragments, elements } = createBalance(balance);
  return [...elements, coins, keys, fragments];
};

const distributeBalance = (ratios, balance) => {
  const bounty = createBalance(balance);
  const distributedBounty = balanceToAmounts(bounty).map(value => distribute(ratios, value));
  return mapValues(ratios, (_, id) => createBalanceFromAmounts(distributedBounty.map(d => d[id])));
}

const isZeroBalance = balance => {
  return balanceToAmounts(balance).reduce((a,b) => a + b) === 0;
};

const createOffer = offer => ({
  characterId: 0,
  gears: [],
  amounts: [0, 0, 0, 0, 0, 0, 0, 0],
  ...offer,
});

function normalizeMonster(monster) {
  monster.attacks = monster.attacks.map((attack, id) => ({ target: 'health', ...attack, id }));
  monster.defenses = monster.defenses.map((defense, id) => ({ ...defense, id }));
  monster.stats = { ...config.player.stats, ...monster.stats };
  monster.full = { ...monster.stats };
  return monster;
}

function monsterLevel(coordinates) {
  const { z } = parseCoordinates(coordinates);
  return z;
}

function bossChance(level) {
  return 7;
}

function pickMonsterType(bigBossAvailable = true, level = 0) {
  const roll = Math.random() * 100;
  if (bigBossAvailable && roll < bossChance(level)) {
    return 'big boss';
  } else if (roll < 35) {
    return 'mini boss';
  } else {
    return 'trash';
  }
}

function pickGear(ratio, monsterLevel, gearDrop, monsterType) {
  const levelPlusOne = Math.ceil(gearDrop.levelPlusOne * ratio);
  const sameLevel = Math.ceil(gearDrop.sameLevel * ratio);
  const levelRoll = Math.random() * 100;
  let gearLevel = monsterLevel;
  if (levelRoll < levelPlusOne) {
    gearLevel = monsterLevel + 1;
  } else if (levelRoll >= levelPlusOne + sameLevel) {
    return null;
  }
  const rarity = rollRarity(monsterType);
  return rarity
    .map(r => randomGear(gearLevel, r))
    .filter(v => v)
    .shift();
}

function gearById(gearId) {
  const gear = gears.flat().find(({ id }) => gearId === id);
  return gear ? gearBytes.toBytes(gear) : 0;
}

function rollRarity(monsterType = 'trash') {
  const roll = Math.random() * 100;
  const rarity = ['common', 'uncommon', 'rare'];
  const dropRate = {
    'trash': [95, 5, 0],
    'mini boss': [65, 34, 1],
    'big boss': [5, 55, 40],
    'chest': [48, 50, 2],
  };
  const passed = rarity.filter((r, i) => roll < dropRate[monsterType][i]);
  return [...passed.reverse(), 'common'];
}

function randomGear(level, rarity) {
  const maxLevel = gears.length - 1;
  const gearLevel = level > maxLevel ? maxLevel : level;
  const gearsToPickFrom = gears
    .flat()
    .filter(({ level }) => level === gearLevel)
    .filter(gear => rarity === gear.rarity);
  return randomItem(gearsToPickFrom);
}

const randomItem = arr => arr[Math.floor(Math.random() * arr.length)];

function cleanRoom(room) {
  if (!room || !room.coordinates) return null;
  try {
    const {
      status,
      location,
      npc,
      customName,
      bounty,
      chest,
      hash,
      blockNumber,
      scavenge,
      hasMonster,
      keeper,
      kind,
      areaType,
      coordinates,
      characters,
      onlineCharacters,
      deadCharacters,
      allExits,
      allLocks,
      combat,
      monsterLevel,
      corridor,
      expansions,
    } = room;
    return {
      status,
      hash,
      hasMonster,
      kind,
      areaType,
      customName,
      coordinates,
      bounty,
      scavenge,
      onlineCharacters,
      keeper,
      allExits,
      location,
      npc,
      chest,
      combat,
      deadCharacters,
      monsterLevel,
      corridor,
      expansions,
      blockNumber,
      characters: (characters && characters.length) || 0,
      locks: allLocks,
    };
  } catch (e) {
    console.log('failed to clean room', room, e);
    Sentry.withScope(scope => {
      scope.setExtras({ room });
      Sentry.captureException(e);
    });
    return {
      ...room,
      characters: (room.characters && room.characters.length) || 0,
      locks: room.allLocks,
    };
  }
}

function justValues(events) {
  return events.map(({ args }) => args);
}

function copy(o) {
  try {
    return JSON.parse(JSON.stringify(o));
  } catch (e) {
    console.log('copy failed:', o);
    return null;
  }
}

async function delay(ms) {
  await new Promise(r => setTimeout(r, ms));
}

async function blockchainSimulator(blocktime = process.env.BLOCKTIME || 2) {
  await delay(Math.floor(Math.random() * blocktime * 2 * 1000 + 1));
}

const mapValues = (o, fn) => Object.fromEntries(Object.entries(o).map(([k, v], i) => [k, fn(v, k, i)]));

const toMap = entries => entries.reduce((o, [k, v]) => ({ ...o, [k]: v }), {});

const difference = (a = new Set(), b = new Set()) => {
  const removed = [...a].filter(x => !b.has(x));
  const added = [...b].filter(x => !a.has(x));
  if (removed.length || added.length) {
    return { added, removed };
  } else {
    return null;
  }
};

const classOrder = ['warrior', 'explorer', 'mage', 'barbarian'];
const two = BigNumber.from(2);

// @TODO: use ReadOnlyDungeon
class GearBytes {
  toBytes(json) {
    let num = BigNumber.from(json.id);
    const classBits = json.classes ? json.classes.reduce((a, c) => a + 2 ** classOrder.indexOf(c), 0) : 0b1111;
    num = num.add(BigNumber.from(classBits).mul(two.pow(248)));
    num = num.add(BigNumber.from(json.level).mul(two.pow(232)));
    let slotTypeEnum = 0;
    if (json.slotType === 'attack') {
      slotTypeEnum = 0;
    } else if (json.slotType === 'defense') {
      slotTypeEnum = 1;
    } else {
      slotTypeEnum = 2;
    }
    num = num.add(BigNumber.from(slotTypeEnum).mul(two.pow(224)));
    const durability = BigNumber.from(json.durability || json.maxDurability || 0);
    const maxDurability = BigNumber.from(json.maxDurability || 0);
    num = num.add(durability.mul(two.pow(208)));
    num = num.add(maxDurability.mul(two.pow(192)));
    return num.toHexString();
  }

  toJSON(bytes32) {
    let num = BigNumber.from(bytes32);
    const classBits = num.div(two.pow(248)).mod(two.pow(4)).toNumber();
    const classes = [...classOrder].filter((_, i) => classBits & (2 ** i));
    const durability = num.div(two.pow(208)).mod(two.pow(16)).toNumber();
    const maxDurability = num.div(two.pow(192)).mod(two.pow(16)).toNumber();
    const slotType = ['attack', 'defense'][num.div(two.pow(224)).mod(two.pow(8)).toNumber()];
    num = num.mod(two.pow(32));
    const id = num.toNumber();
    for (const row of gears) {
      for (const gear of row) {
        if (gear.id === id) {
          return {
            ...gear,
            durability,
            slotType,
            templateSlotType: gear.slotType,
            maxDurability,
            classes,
            bytes: bytes32,
          };
        }
      }
    }
    for (const row of uniqueGears) {
      for (const gear of row) {
        if (gear.id === id) {
          return {
            ...gear,
            durability,
            slotType,
            templateSlotType: gear.slotType,
            maxDurability,
            classes,
            bytes: bytes32,
          };
        }
      }
    }
  }
}

const gearBytes = new GearBytes();

const identity = i => i;

module.exports = {
  justValues,
  copy,
  delay,
  classOrder,
  normalizeMonster,
  monsterLevel,
  blockchainSimulator,
  gearBytes,
  mapValues,
  toMap,
  identity,
  cleanRoom,
  gearById,
  pickGear,
  bossChance,
  randomItem,
  pickMonsterType,
  uint256,
  toAddress,
  isZeroBalance,
  createBalance,
  createBalanceFromAmounts,
  distributeBalance,
  balanceToAmounts,
  createReward,
  createOffer,
  difference,
};
