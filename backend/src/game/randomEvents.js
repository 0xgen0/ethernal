const seedrandom = require('seedrandom');
const blockHash = require('../db/blockHash');
const { events, pastEvents } = require('../db/provider');
const { cleanRoom, createReward, gearBytes, blockchainSimulator, justValues } = require('../data/utils');
const { locationToCoordinates, coordinatesToLocation, generateKeys, generateCoins, bn } = require('./utils');
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
    const { Dungeon } = this.dungeon.contracts;
    events.on(Dungeon, 'RandomEvent', this.handleRandomEvent.bind(this));
  }

  async fetchAll(fromBlock = 0, toBlock = 'latest', snapshot) {
    if (snapshot) {
      this.lastHash = new Map(Object.entries({...snapshot.randomEvents.lastHash}));
    }
    console.log('fetching random events');
    const events = justValues(await pastEvents('Dungeon', 'RandomEvent', [], fromBlock, toBlock)).reduce(
      (lastEvents, event) => {
        lastEvents[event.areaLocation] = event;
        return lastEvents;
      },
      {},
    );
    await Promise.all(
      Object.values(events).map(([areaLocation, blockNumber]) => this.generateRandomEvent(areaLocation, blockNumber)),
    );
    const eventRooms = Object.values(this.dungeon.rooms)
      .filter(({ randomEvent }) => !bn(randomEvent).eq(0))
      .map(room => this.spawn(room.coordinates));
    console.log(`generated ${Object.keys(this.lastHash).length} random events in ${eventRooms.length} rooms`);
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

  async handleRandomEvent(areaLocation, blockNumber) {
    const { coordinates, randomEvent } = await this.generateRandomEvent(areaLocation, blockNumber);
    if (this.dungeon.rooms[coordinates]) {
      console.log(`random event ${randomEvent} generated at ${coordinates}`);
      this.spawn(coordinates);
    }
  }

  spawn(coordinates) {
    const room = this.dungeon.rooms[coordinates];
    if (room && room.coordinates && !room.hasMonster && room.characters.length === 0) {
      const hash = this.lastHash.get(coordinates);
      const generator = hash ? seedrandom(hash) : Math.random;
      const posibilities = {
        npc: () => this.spawnNPC(coordinates, 'recycler', true),
        chest: () => this.spawnChest(coordinates),
        monster: () => this.spawnMonster(coordinates)
      }
      if (room.npc) {
        delete posibilities.npc;
      }
      if (room.chest) {
        delete posibilities.chest;
      }
      if (Number(room.kind) !== 1) {
        delete posibilities.monster;
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
      if (Object.keys(posibilities).length) {
        for (let i = 0; i < 10; i++) {
          const event = posibilities[roll()];
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

  spawnChest(coordinates) {
    const chest = { status: 'closed' };
    const room = this.dungeon.map.addOverride(this.dungeon.rooms[coordinates], { chest });
    this.dungeon.rooms[coordinates] = room;
    const update = { roomUpdates: [cleanRoom(room)] };
    this.sockets.emit('update', update);
    this.sockets.emit('chest-spawned', { coordinates, chest });
    return update;
  }

  async openChest(characterId) {
    const { chest, monsterLevel, coordinates } = this.dungeon.character.room(characterId);
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
          });
        } else {
          const {
            stats: { health },
          } = this.dungeon.character.info(characterId);
          reward = createReward({ characterId, gear: null, hpChange: -Math.floor(health / 5) });
        }
      }
      chest.reward = reward;
      if (!reward.gear && chest.reward.balanceChange.filter(Boolean).length === 0) {
        await this.resolve(coordinates, [reward]);
      } else {
        await blockchainSimulator();
        this.sockets.emit('update', { roomUpdates: [cleanRoom(this.dungeon.rooms[coordinates])] });
      }
      this.sockets.emit('chest-opened', { coordinates, character: characterId, reward });
      return reward;
    } else {
      return {};
    }
  }

  async finishChest(character, { take = true, close = false }) {
    const { chest, coordinates } = this.dungeon.character.room(character);
    if (chest && chest.status === 'opened') {
      // Emit chest update
      let chestUpdate = { coordinates };
      if (take && chest.reward && (chest.reward.gear || chest.reward.balanceChange.filter(Boolean).length)) {
        const reward = { ...chest.reward, characterId: character };
        chest.reward.gear = null;
        chest.reward.balanceChange = [0, 0, 0, 0, 0, 0, 0, 0];
        await this.resolve(coordinates, [reward]);
        chestUpdate = { ...chestUpdate, character, reward };
      } else if (!close) {
        const reward = { ...chest.reward };
        chest.reward.hpChange = 0;
        chestUpdate = { ...chestUpdate, character, reward };
      }
      this.sockets.emit('chest-updated', chestUpdate);

      // Emit room update
      if (close) {
        chest.status = 'closed';
      } else {
        // Keep open for timeout period
        setTimeout(() => {
          const room = this.dungeon.rooms[coordinates];
          if (room && room.chest) {
            room.overrides = null;
            room.chest = null;
            this.dungeon.map.reorgRoom(coordinates);
          }
        }, this.timeout);
      }

      this.sockets.emit('update', { roomUpdates: [cleanRoom(this.dungeon.rooms[coordinates])] });
      return chest;
    } else {
      return null;
    }
  }

  spawnMonster(coordinates, monsterId) {
    const room = this.dungeon.combat.createCombat(
      this.dungeon.map.addOverride(this.dungeon.rooms[coordinates], { hasMonster: true }),
      monsterId && Number(monsterId),
      false,
    );
    const statusUpdates = room.characters.reduce((updates, character) => {
      updates[character] = this.dungeon.character.changeStatus(character, { status: 'blocked by monster' });
      return updates;
    }, {});
    this.dungeon.rooms[coordinates] = room;
    const update = { roomUpdates: [cleanRoom(room)], statusUpdates };
    this.sockets.emit('update', update);
    this.sockets.emit('monster-spawned', { coordinates, combat: room.combat });
    return update;
  }

  spawnClonedNPC(coordinates, type = 'recycler', data = {}) {
    const room = this.dungeon.rooms[coordinates];
    if (!room.npc || room.npc.type !== type) {
      console.log('spawning', type, coordinates);
      this.spawnNPC(room.coordinates, type, false, data);
    } else {
      if (room.npc.clones) {
        room.npc.clones++;
      } else {
        room.npc.clones = 1;
      }
    }
  }

  removeClonedNPC(coordinates, type = 'recycler') {
    const room = this.dungeon.rooms[coordinates];
    if (room.npc && room.npc.type === type) {
      console.log('removing npc', coordinates);
      room.overrides = null;
      room.npc = null;
      this.sockets.emit('npc-killed', { coordinates });
      this.sockets.emit('update', { roomUpdates: [cleanRoom(room)] });
    }
  }

  spawnNPC(coordinates, type = 'recycler', timed = false, data = {}) {
    const npc = { type, ...data };
    const room = this.dungeon.map.addOverride(this.dungeon.rooms[coordinates], { npc });
    this.dungeon.rooms[coordinates] = room;
    const update = { roomUpdates: [cleanRoom(room)] };
    this.sockets.emit('update', update);
    this.sockets.emit('npc-spawned', { coordinates, npc });
    if (timed) {
      setTimeout(() => this.killNPC(coordinates), this.timeout);
    }
    return update;
  }

  async killNPC(coordinates) {
    const room = this.dungeon.rooms[coordinates];
    room.overrides = null;
    room.npc = null;
    const update = await this.resolve(coordinates);
    this.sockets.emit('npc-killed', { coordinates });
    this.dungeon.quests.respawnNPC(coordinates);
    return update;
  }

  get npcRooms() {
    return this.dungeon.map.roomsWith(({ npc }) => npc);
  }

  get chestRooms() {
    return this.dungeon.map.roomsWith(({ chest }) => chest);
  }
}

module.exports = RandomEvents;
