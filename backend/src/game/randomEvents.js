const seedrandom = require('seedrandom');
const moment = require('moment');
const blockHash = require('../db/blockHash');
const { events } = require('../db/provider');
const { cleanRoom, createReward, gearBytes, blockchainSimulator, toMap } = require('../data/utils');
const { locationToCoordinates, coordinatesToLocation, generateKeys, generateCoins } = require('./utils');
const DungeonComponent = require('./dungeonComponent.js');

class RandomEvents extends DungeonComponent {
  timeout = 60 * 60 * 1000; // 1 hour
  lastHash = new Map();

  constructor(map) {
    super(map);
    this.sockets
      .onCharacter('open-chest', this.openChest.bind(this))
      .onCharacter('finish-chest', this.finishChest.bind(this));
  }

  registerEventHandlers() {
    const { Dungeon } = this.contracts;
    events.on(Dungeon, 'RandomEvent', this.handleRandomEvent.bind(this));
    events.onBlock(this.handleBlock.bind(this));
  }

  async handleRandomEvent(areaLocation, blockNumber) {
    const { coordinates } = await this.generateRandomEvent(areaLocation, blockNumber);
    await this.spawn(coordinates);
  }

  async handleBlock({ number }) {
    if (number % 30 === 0) {
      const [npcs, chests] = await Promise.all([
        this.dungeon.map.roomsWith(`(roomdata->'npc'->>'timeout')::INTEGER < extract(epoch from now())`),
        this.dungeon.map.roomsWith(`(roomdata->'chest'->>'timeout')::INTEGER < extract(epoch from now())`),
      ]);
      const result = await Promise.all([
        npcs.map(({coordinates, npc}) => this.removeClonedNPC(coordinates, npc.type)),
        chests.map(async room => {
          room.overrides = null;
          room.chest = null;
          await this.dungeon.map.storeRooms([room]);
          await this.dungeon.map.reorgRoom(room.coordinates);
        }),
      ].flat());
      if (result.length) {
        console.log('despawned events', result.length);
      }
    }
  }

  async generateRandomEvent(areaLocation, blockNumber) {
    const hash = await blockHash(blockNumber);
    const [
      roomLocation,
      randomEvent,
    ] = await this.contracts.pureCall('generateRandomEvent(uint256,bytes32):(uint256,uint64)', [
      areaLocation.toString(),
      hash,
    ]);
    const coordinates = locationToCoordinates(roomLocation);
    this.lastHash[coordinates] = hash;
    return { coordinates, randomEvent, hash };
  }

  async spawn(coordinates) {
    console.log('random event at', coordinates);
    const room = await this.dungeon.room(coordinates);
    if (
      room
      && room.coordinates
      && !room.hasMonster
      && !room.chest
      && !room.npc
      && room.characters.length === 0
      && (events.defer || events.replaying ? room.randomEvent === 2 : true)
    ) {
      const hash = this.lastHash.get(coordinates);
      const generator = hash ? seedrandom(hash) : Math.random;
      const possibilities = {
        npc: () => this.spawnNPC(coordinates, 'recycler', true),
        chest: () => this.spawnChest(coordinates),
        monster: () => this.spawnMonster(coordinates)
      }
      if (room.npc) {
        delete possibilities.npc;
      }
      if (room.chest) {
        delete possibilities.chest;
      }
      if (Number(room.kind) !== 1) {
        delete possibilities.monster;
      }
      const roll = () => {
        const value = generator();
        if (value < 0.25) {
          return 'npc';
        } else if (value < 0.5) {
          return 'chest';
        } else {
          return 'monster';
        }
      }
      if (Object.keys(possibilities).length) {
        for (let i = 0; i < 10; i++) {
          const type = roll();
          console.log('spawning', type);
          const event = possibilities[type];
          if (event) {
            return event();
          }
        }
      }
    }
  }

  async resolve(coordinates, rewards = []) {
    const tx = await this.contracts.DungeonAdmin.monsterDefeated(
      coordinatesToLocation(coordinates),
      0,
      rewards.map(reward => ({ ...reward, gear: reward.gear ? gearBytes.toBytes(reward.gear) : '0x00' })),
      { gasLimit: 700000 },
    );
    await tx.wait();
    let characterInfos = [];
    if (rewards.length) {
      characterInfos = await Promise.all(
        rewards.map(async ({ characterId }) => {
          await this.dungeon.character.reloadCharacterStats(characterId);
          return this.dungeon.character.info(characterId);
        }),
      );
    }
    return this.dungeon.map.reorgRoom(coordinates, characterInfos);
  }

  async spawnChest(coordinates) {
    const chest = { status: 'closed' };
    const room = this.dungeon.map.addOverride(await this.dungeon.room(coordinates), { chest });
    await this.dungeon.map.storeRooms([room]);
    const update = { roomUpdates: [cleanRoom(room)] };
    this.sockets.emit('update', update);
    this.sockets.emit('chest-spawned', { coordinates, chest });
    return update;
  }

  async openChest(characterId) {
    const room = await this.dungeon.character.room(characterId);
    const { chest, monsterLevel, coordinates } = room;
    return await this.runExclusive(coordinates, async () => {
      if (chest && chest.status === 'closed') {
        chest.status = 'opened';
        let reward = chest.reward;
        if (!reward) {
          if (Math.random() < 0.65) {
            const gear = this.dungeon.combat.pickRandomGear(
              1,
              monsterLevel,
              { sameLevel: 10, levelPlusOne: 20 },
              'chest',
            );
            const keys = generateKeys(monsterLevel) * 2 + 1;
            const coins = generateCoins(monsterLevel);
            reward = createReward({
              characterId,
              gear: gearBytes.toJSON(gear),
              balanceChange: [0, 0, 0, 0, 0, coins, keys, 0],
              bounty: [0, 0, 0, 0, 0, 0, 0, 0],
            });
          } else {
            const {
              stats: { health },
            } = await this.dungeon.character.info(characterId);
            reward = createReward({
              characterId,
              gear: null,
              hpChange: -Math.floor(health / 5),
              balanceChange: [0, 0, 0, 0, 0, 0, 0, 0],
              bounty: [0, 0, 0, 0, 0, 0, 0, 0],
            });
          }
        }
        chest.reward = reward;
        room.overrides = { ...(room.overrides || {}), chest };
        await this.dungeon.map.storeRooms([room]);
        if (!reward.gear && chest.reward.balanceChange.filter(Boolean).length === 0) {
          await this.resolve(coordinates, [reward]);
        } else {
          await blockchainSimulator();
          this.sockets.emit('update', { roomUpdates: [cleanRoom(await this.dungeon.room(coordinates))] });
        }
        this.sockets.emit('chest-opened', { coordinates, character: characterId, reward });
        return reward;
      } else {
        return {};
      }
    });
  }

  async finishChest(character, { take = true, close = false }) {
    const room = await this.dungeon.character.room(character);
    const { chest, coordinates } = room;
    return await this.runExclusive(coordinates, async () => {
      if (chest && chest.status === 'opened') {
        // Emit chest update
        let chestUpdate = { coordinates };
        if (take && chest.reward && (chest.reward.gear || chest.reward.balanceChange.filter(Boolean).length)) {
          const reward = { ...chest.reward, characterId: character };
          chest.reward.gear = null;
          chest.reward.balanceChange = [0, 0, 0, 0, 0, 0, 0, 0];
          room.overrides.chest = chest;
          await this.dungeon.map.storeRooms([room]);
          await this.resolve(coordinates, [reward]);
          chestUpdate = { ...chestUpdate, character, reward };
        } else if (!close) {
          const reward = { ...chest.reward };
          chest.reward.hpChange = 0;
          room.overrides.chest = chest;
          await this.dungeon.map.storeRooms([room]);
          chestUpdate = { ...chestUpdate, character, reward };
        }
        this.sockets.emit('chest-updated', chestUpdate);

        // Emit room update
        if (close) {
          chest.status = 'closed';
          room.overrides.chest = chest;
          console.log({chest})
          await this.dungeon.map.storeRooms([room]);
        } else {
          // Keep open for timeout period
          chest.timeout = moment().add(this.timeout, 'ms').unix();
        }

        this.sockets.emit('update', { roomUpdates: [await this.dungeon.room(coordinates)] });
        return chest;
      } else {
        return null;
      }
    });
  }

  async spawnMonster(coordinates, monsterId) {
    const room = this.dungeon.combat.createCombat(
      this.dungeon.map.addOverride(await this.dungeon.room(coordinates), { hasMonster: true }),
      monsterId && Number(monsterId),
      false,
    );
    const statusUpdates = await Promise.all(
      room.characters.map(async character => ([
        character,
        await this.dungeon.character.changeStatus(character, { status: 'blocked by monster' }),
      ]))
    ).then(toMap);
    await this.dungeon.map.storeRooms([room]);
    const update = { roomUpdates: [cleanRoom(room)], statusUpdates };
    this.sockets.emit('update', update);
    this.sockets.emit('monster-spawned', { coordinates, combat: room.combat });
    return update;
  }

  async spawnClonedNPC(coordinates, type = 'recycler', data = {}) {
    const room = await this.dungeon.room(coordinates);
    if (!room.npc || room.npc.type !== type) {
      console.log('spawning', type, coordinates);
      await this.spawnNPC(room.coordinates, type, false, data);
    }
  }

  async removeClonedNPC(coordinates, type = 'recycler') {
    const room = await this.dungeon.room(coordinates);
    if (room.npc && room.npc.type === type) {
      console.log('removing npc', coordinates);
      room.overrides = null;
      room.npc = null;
      await this.dungeon.map.storeRooms([room]);
      this.sockets.emit('npc-killed', { coordinates });
      this.sockets.emit('update', { roomUpdates: [cleanRoom(room)] });
    }
  }

  async spawnNPC(coordinates, type = 'recycler', timed = false, data = {}) {
    if (timed && events.forwarding) {
      return null;
    }
    const npc = { type, ...data };
    if (timed) {
      npc.timeout = moment().add(this.timeout, 'ms').unix();
    }
    let room = await this.dungeon.room(coordinates);
    room = this.dungeon.map.addOverride(room, { npc });
    await this.dungeon.map.storeRooms([room]);
    const update = { roomUpdates: [cleanRoom(room)] };
    this.sockets.emit('update', update);
    this.sockets.emit('npc-spawned', { coordinates, npc });
    return update;
  }

  async killNPC(coordinates) {
    const room = await this.dungeon.room(coordinates);
    room.overrides = null;
    room.npc = null;
    await this.dungeon.map.storeRooms([room]);
    const update = await this.resolve(coordinates);
    this.sockets.emit('npc-killed', { coordinates });
    return update;
  }

  async npcRooms() {
    return this.dungeon.map.roomsWith(`roomdata->>'npc' != 'null'`);
  }

  async chestRooms() {
    return this.dungeon.map.roomsWith(`roomdata->>'chest' != 'null'`);
  }
}

module.exports = RandomEvents;
