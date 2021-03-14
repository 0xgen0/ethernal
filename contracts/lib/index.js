const {deployments, getNamedAccounts, ethers} = require('@nomiclabs/buidler');
const {assert} = require('chai');
const {Wallet, BigNumber, Contract} = require('ethers');
const PlayerWallet = require('../../webapp/src/lib/PlayerWallet'); // TODO better way to share code
const {
  decodeExits,
  locationToCoordinates,
  coordinatesToLocation,
  bfs,
  encodeDirections,
  order,
} = require('../../backend/src/game/utils');

function waitFor(p) {
  return p.then(tx => tx.wait());
}

async function expectError(tx, reason) {
  try {
    await tx.wait();
  } catch (e) {
    if (typeof reason !== 'undefined') {
      if (e.reason !== reason) {
        throw new Error('' + e.reason + ' is not equal to ' + reason);
      }
    }
    return true;
  }
  throw new Error('error expected');
}

function mergeABIEvents(abi1, abi2) {
  const result = abi1.concat([]);
  for (const fragment2 of abi2) {
    if (fragment2.type == 'event') {
      let found = false;
      for (const fragment1 of abi1) {
        if (fragment1.name === fragment2.name) {
          found = true;
          break;
        }
      }
      if (!found) {
        result.push(fragment2);
      }
    }
  }
  return result;
}

async function enter(playerAddress, config, energy = '1000000000000000000', gasPrice = BigNumber.from('1000000000')) {
  const playerDeployment = await deployments.get('Player', playerAddress);
  const dungeonDeployment = await deployments.get('Dungeon');
  const playerContract = new Contract(
    playerDeployment.address,
    mergeABIEvents(playerDeployment.abi, dungeonDeployment.abi),
    ethers.provider.getSigner(playerAddress),
  );
  const dungeonContract = await ethers.getContract('Dungeon');
  const dungeonAdmin = await ethers.getContract('DungeonAdmin');
  const transfererContract = await ethers.getContract('DungeonTokenTransferer', playerAddress);
  const ubf = await ethers.getContract('UBF', playerAddress);
  const delegateWallet = Wallet.createRandom().connect(ethers.provider);
  const playerWallet = new PlayerWallet({
    playerContract,
    destinationContract: dungeonContract,
    playerAddress,
    delegateWallet,
  });
  const transfererWallet = new PlayerWallet({
    playerContract,
    destinationContract: transfererContract,
    playerAddress,
    delegateWallet,
  });
  const ubfWallet = new PlayerWallet({
    playerContract,
    destinationContract: ubf,
    playerAddress,
    delegateWallet,
  });
  const value = BigNumber.from(energy);
  try {
    const {name = '0x', enterLocation = '0', characterClass = '0'} = config;
    const tx = await playerContract.functions.createAndEnter(
      delegateWallet.address,
      0,
      name,
      characterClass,
      enterLocation,
      {value, gasPrice},
    );
    await tx.wait();
  } catch (_) {
    const tx = await playerContract.functions.addDelegate(delegateWallet.address, {value, gasPrice});
    await tx.wait();
  }
  const characterId = await playerWallet.fetchCharacterId();
  assert.ok(!BigNumber.from(0).eq(characterId), 'character not created');
  return {
    playerContract,
    dungeonContract,
    dungeonAdmin,
    playerWallet,
    transfererContract,
    transfererWallet,
    ubf,
    ubfWallet,
    characterId,
  };
}

// TODO move that in a test only folder
async function setupContracts(config = { useFixture: false }) {
  const {users, backendAddress} = await getNamedAccounts();
  // TODO make most tests work with fixture
  if (config.useFixture) {
    await deployments.fixture();
  } else {
    await deployments.run();
  }
  const playerAddress = users[0];
  const admin = await ethers.getContract('DungeonAdmin', backendAddress);
  const characters = await ethers.getContract('Characters');
  const readOnly = await ethers.getContract('ReadOnlyDungeon');
  const gears = await ethers.getContract('Gears');
  const elements = await ethers.getContract('Elements');
  const rooms = await ethers.getContract('Rooms');
  const enterSetup = await enter(playerAddress, config);
  await waitFor(
    admin.updateCharacter(enterSetup.characterId, '1', '0', '0', '0', '0', ['0', '0', '0', '0', '0', '0', '0', '10000']),
  );
  return {...enterSetup, admin, readOnly, gears, rooms, elements, playerAddress, characters};
}

async function giveGear(character, gear = '1') {
  const gears = await ethers.getContract('Gears');
  const {backendAddress} = await getNamedAccounts();
  const admin = await ethers.getContract('DungeonAdmin', backendAddress);
  const receipt = await waitFor(
    admin.updateCharacter(character, '1', '0', '0', gear, '0', ['0', '0', '0', '0', '0', '0', '0', '0']),
  );
  const {id} = receipt.logs
    .map(log => {
      try {
        return gears.interface.parseLog(log);
      } catch (e) {
        return null;
      }
    })
    .find(({name}) => name === 'DataUpdate').args;
  return id.toString();
}

async function characterLocation(characterId) {
  const {location} = await ethers.getContract('Dungeon').then(dungeon => dungeon.getCharacterInfo(characterId));
  return location;
}

async function move(playerWallet, characterId, direction, opts = {}) {
  await waitFor(playerWallet.tx(opts, 'move', characterId, direction));
  return characterLocation(characterId);
}

async function killingMove(playerWallet, characterId, direction, opts = {}) {
  const dungeonAdmin = await ethers.getContract('DungeonAdmin');
  await waitFor(dungeonAdmin.monsterDefeated(await characterLocation(characterId), '1', [], opts));
  await waitFor(playerWallet.tx(opts, 'move', characterId, direction));
  return characterLocation(characterId);
}

async function characterCoordinates(characterId) {
  const location = await characterLocation(characterId);
  return locationToCoordinates(location);
}

async function roomInfo(coordinates) {
  return await ethers.getContract('Dungeon').then(dungeon => dungeon.getRoomInfo(coordinatesToLocation(coordinates)));
}

async function giveKeys(characterId, keys = 10000) {
  await ethers
    .getContract('DungeonAdmin')
    .then(admin =>
      admin.updateCharacter(characterId, '1', '0', '0', '0', '0', ['0', '0', '0', '0', '0', '0', keys.toString(), '0']),
    );
}

async function giveCoins(character, coins = 10000) {
  const {backendAddress} = await getNamedAccounts();
  const admin = await ethers.getContract('DungeonAdmin', backendAddress);
  return await waitFor(
    admin.updateCharacter(character, '1', '0', '0', '0', '0', ['0', '0', '0', '0', '0', coins.toString(), '0', '0']),
  );
}

async function forceMove(direction) {
  for (let i = 0; i < 20; i++) {
    try {
      const {characterId, playerWallet, dungeonContract} = await setupContracts();
      await move(playerWallet, characterId, direction);
      return await dungeonContract.getCharacterInfo(characterId);
    } catch (e) {
      if (e.reason !== 'cant move this way' && e.reason !== 'no key') {
        throw e;
      }
    }
  }
  throw {reason: 'cannot move even after 20 tries'};
}

async function randomMove(setup, killMonsters = false) {
  const {characterId, playerWallet, dungeonContract, dungeonAdmin, opts} = setup;
  const direction = Math.floor(Math.random() * 4);
  for (let i = 0; i < 4; i++) {
    try {
      await move(playerWallet, characterId, (direction + i) % 4, opts);
      return await dungeonContract.getCharacterInfo(characterId);
    } catch (e) {
      if (killMonsters && e.reason === 'monster blocking') {
        const {location} = await dungeonContract.getCharacterInfo(characterId);
        //TODO add gas price override
        await dungeonAdmin.monsterDefeated(location, '1', []);
        i--;
        continue;
      }
      if (e.reason !== 'cant move this way' && e.reason !== 'no key') {
        throw e;
      }
    }
  }
  throw {reason: 'cannot move anywhere'};
}

async function randomWalk(setup, roomLimit = 20) {
  await giveKeys(setup.characterId);
  let tries = 0;
  let error;
  const locations = new Set([coordinatesToLocation('0,0')]);
  while (locations.size < roomLimit && tries < 10) {
    try {
      const {location} = await randomMove(setup, true);
      locations.add(location.toString());
    } catch (e) {
      error = e;
      tries++;
    }
  }
  if (tries === 10) {
    throw error;
  }
  const rooms = {};
  await Promise.all(Array.from(locations).map(async location => computeRoom(setup, rooms, location)));
  return rooms;
}

async function walk(setup, roomLimit = 20) {
  const {characterId, dungeonAdmin, playerWallet, opts = {}} = setup;
  await giveKeys(characterId);
  let rooms = {};
  await computeRoom(setup, rooms, coordinatesToLocation('0,0'));
  rooms = bfs(rooms, '0,0', null, roomLimit * roomLimit);
  let undiscovered = rooms['0,1'];
  let discovered = 1;
  while (discovered < roomLimit && undiscovered) {
    const {coordinates, exit} = undiscovered.parent;
    const location = coordinatesToLocation(coordinates);
    try {
      await waitFor(dungeonAdmin.teleportCharacter(characterId, location), opts);
    } catch (_) {
      await waitFor(
        dungeonAdmin.monsterDefeated(coordinatesToLocation(await characterCoordinates(characterId)), '1', [], opts),
      );
      await waitFor(dungeonAdmin.teleportCharacter(characterId, location), opts);
    }
    try {
      await waitFor(playerWallet.tx(opts, 'move', characterId, order.indexOf(exit)));
    } catch (_) {
      await waitFor(
        dungeonAdmin.monsterDefeated(coordinatesToLocation(await characterCoordinates(characterId)), '1', [], opts),
      );
      await waitFor(playerWallet.tx(opts, 'move', characterId, order.indexOf(exit)));
    }
    const room = await computeRoom(setup, rooms, coordinatesToLocation(undiscovered.coordinates));
    discovered++;
    rooms = bfs(rooms, '0,0', null, roomLimit * roomLimit);
    undiscovered = Object.values(rooms)
      .filter(({status}) => status === 'undiscovered')
      .sort((a, b) => a.parent.distance - b.parent.distance)[0];
  }
  return rooms;
}

async function computeRoom(setup, rooms, location) {
  const readOnly = await ethers.getContract('ReadOnlyDungeon');
  const {blockNumber, direction} = await setup.dungeonContract.getRoomInfo(location);
  const {hash} = await ethers.provider.getBlock(Number(blockNumber));
  const exitBits = await readOnly.generateExits(location, hash, direction);
  const {exits, locks} = decodeExits(exitBits);
  const coordinates = locationToCoordinates(location);
  rooms[coordinates] = {
    coordinates,
    teleportCost: Number(await readOnly.teleportTax('0', location)),
    blockNumber: Number(blockNumber),
    allExits: exits,
    locks,
  };
  return rooms[coordinates];
}

const moveTo = async (setup, destination) => {
  const {characterId, playerWallet} = setup;
  const directions = encodeDirections(destination.parent.path);
  const receipt = await playerWallet.tx('movePath', characterId, directions).then(tx => tx.wait());
  const coordinates = await characterCoordinates(characterId);
  let blocked = false;
  if (coordinates !== destination.coordinates) {
    await expectError(playerWallet.tx('movePath', setup.characterId, directions.reverse()), 'blocked by monster');
    blocked = true;
  }
  return {receipt, blocked, coordinates};
};

const increaseTime = async seconds => {
  await ethers.provider.send('evm_increaseTime', [seconds]);
  await ethers.provider.send('evm_mine', []);
};

const getEnergy = async address => {
  const player = await ethers.getContract('Player');
  const { energy } = await player.getPlayerInfo(address, 0);
  return energy;
}

const ether = wei => BigNumber.from(wei).div('1000000000000000').toNumber() / 1000;

module.exports = {
  characterCoordinates,
  moveTo,
  roomInfo,
  giveKeys,
  increaseTime,
  walk,
  randomWalk,
  randomMove,
  setupContracts,
  expectError,
  forceMove,
  move,
  killingMove,
  giveGear,
  giveCoins,
  enter,
  waitFor,
  ether,
  getEnergy,
  zeroAddress: '0x0000000000000000000000000000000000000000',
};
