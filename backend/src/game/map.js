const { events, pastEvents } = require('../db/provider');
const blockHash = require('../db/blockHash.js');
const Promise = require('bluebird');
const retry = require('p-retry');
const jsonDiff = require('json-diff');
const Progress = require('../utils/progress.js');
const { cleanRoom, monsterLevel, mapValues, identity, randomItem } = require('../data/utils');
const {
  coordinatesAt,
  locationToCoordinates,
  coordinatesToLocation,
  decodeDirections,
  decodeExits,
  bfs,
} = require('./utils');
const DungeonComponent = require('./dungeonComponent.js');
const RoomShape = require('./room/shape.js');
const Exits = require('./room/exits.js');

const concurrency = process.env.CONCURRENCY || 20;
const retryConfig = { retries: 5 };
const checkBackIn = 10 * 1000;

class DungeonMap extends DungeonComponent {
  rooms = {};
  moves = {};
  roomShape = new RoomShape(this);
  exits = new Exits(this);

  constructor(dungeon) {
    super(dungeon);
    this.sockets.onCharacter('subscribe-rooms', this.handleSubscribeRooms.bind(this));
  }

  registerEventHandlers() {
    const { Dungeon } = this.dungeon.contracts;
    events.on(Dungeon, 'CharacterMoved', this.handleCharacterMoved.bind(this));
    try {
      events.onConfirmed(Dungeon, 'CharacterMoved', this.handleConfirmedCharacterMoved.bind(this));
      console.log('registered confirmed event listeners');
    } catch (e) {
      console.log('confirmed events not supported');
    }
  }

  async handleCharacterMoved(characterId, oldLocation, newLocation, mode, path, event) {
    const character = characterId.toString();
    const from = locationToCoordinates(oldLocation);
    const to = locationToCoordinates(newLocation);
    console.log('move event received', from, to, path.toHexString(), event.transactionHash);
    const fromRoom = this.rooms[from];
    if (!(fromRoom && fromRoom.hash)) {
      console.log('origin room missing, fetching');
      await this.reloadRoom(from);
    }
    this.dungeon.debug.moveEvents.push({ character, from, to, date: new Date().toISOString(), event });
    if (!events.defer) {
      setTimeout(async () => {
        const room = await this.fetchRoomInfo(to);
        const { monsterBlockHash, hash } = room;
        const diff = jsonDiff.diff(
          { monsterBlockHash: monsterBlockHash || this.rooms[to].monsterBlockHash, hash },
          { monsterBlockHash: this.rooms[to].monsterBlockHash, hash: this.rooms[to].hash },
        );
        if (diff) {
          console.log('reorg detected for room ' + to, diff);
          const update = await this.reorgRoom(room);
          this.dungeon.debug.reorgs.push({ date: new Date().toISOString(), to, diff, event, update });
        }
      }, checkBackIn);
    }
    await this.move(character, from, to, mode, decodeDirections(path), Number(event.blockNumber));
  }

  async handleConfirmedCharacterMoved(characterId, oldLocation, newLocation, mode, path, event) {
    const character = characterId.toString();
    const from = locationToCoordinates(oldLocation);
    const to = locationToCoordinates(newLocation);
    const block = Number(event.blockNumber);
    const moves = this.moves[character];
    const lastMove = moves[moves.length - 1];
    if (block >= lastMove.block && to !== lastMove.to) {
      console.log('missing move event finally received', from, to, path.toHexString(), event.transactionHash);
      const fromRoom = this.rooms[from];
      if (!(fromRoom && fromRoom.hash)) {
        console.log('origin room missing, fetching');
        await this.reloadRoom(from);
      }
      this.dungeon.debug.moveEvents.push({ character, from, to, date: new Date().toISOString(), event });
      await this.move(character, from, to, mode, decodeDirections(path), Number(event.blockNumber));
    }
  }

  handleSubscribeRooms(character, {coordinates = []}) {
    return coordinates
      .map(coords => this.rooms[coords])
      .map(cleanRoom)
      .filter(identity);
  }

  async fetchRoomInfo(coordinates, blockTag = 'latest') {
    const { Dungeon, pureCall } = this.dungeon.contracts;
    const options = { blockTag };
    const location = coordinatesToLocation(coordinates);
    const roomData = await Dungeon.getRoomInfo(location);
    const { direction, areaAtDiscovery, lastRoomIndex, index, actualised, randomEvent } = roomData;
    const blockNumber = roomData.blockNumber.toNumber();
    const monsterBlockNumber = roomData.monsterBlockNumber.toNumber();
    const roomBlockHash = await blockHash(blockNumber, options);
    const [
      ,
      kind,
      areaDiscovered,
    ] = await pureCall('generateRoom(uint256,bytes32,uint8,uint8,uint8,uint8):(uint8,uint8,uint8)', [
      location,
      roomBlockHash,
      direction,
      areaAtDiscovery,
      lastRoomIndex,
      index,
    ]);

    if (blockNumber === 0) {
      return null; // not discovered
    }

    let status = 'discovered';
    if (actualised) {
      status = 'actualised';
    }

    const areaType = await Dungeon.getAreaTypeForRoom(location);

    let { exits, locks, exitsBits } = await this.generateExits(location, roomBlockHash, direction);

    let hasMonster = false;
    let monsterBlockHash;
    if (monsterBlockNumber !== 0) {
      monsterBlockHash = await blockHash(monsterBlockNumber, options);
      const [monsterIndex] = await pureCall('generateMonsterIndex(uint256,bytes32,uint256,bool,uint8):(uint256)', [
        location,
        monsterBlockHash,
        1,
        blockNumber === monsterBlockNumber,
        kind,
      ]);
      hasMonster = monsterIndex.toNumber() !== 0;
    }

    return {
      status,
      location,
      hash: roomBlockHash,
      blockNumber,
      monsterBlockNumber,
      monsterBlockHash,
      randomEvent,
      exits,
      locks,
      exitsBits,
      direction,
      hasMonster,
      kind,
      areaDiscovered,
      areaType,
      coordinates,
      monsterLevel: monsterLevel(coordinates),
    };
  }

  async generateExits(location, hash, direction) {
    const { pureCall } = this.dungeon.contracts;
    if (typeof location === 'object') {
      location = location.toString();
    }
    const [exitsBits] = await pureCall('generateExits(uint256,bytes32,uint8):(uint8)', [location, hash, direction]);
    return {
      ...decodeExits(exitsBits),
      exitsBits,
    };
  }

  async fetchAllRooms(fromBlock = 0, toBlock = 'latest', snapshot) {
    if (snapshot) {
      console.log('getting discovered rooms after snapshot');
      this.rooms = {...this.rooms, ...snapshot.rooms};
    } else {
      console.log('getting all discovered rooms');
    }
    let rooms = await pastEvents('Dungeon', 'RoomDiscovered', [], fromBlock, toBlock, 80000, true);
    const progress = new Progress('rooms fetched', 100);
    console.log(`fetching info about ${rooms.length} rooms`);
    rooms = await Promise.map(
      rooms,
      async ({ args: { location } }) => {
        const coordinates = locationToCoordinates(location);
        const info = await retry(() => this.fetchRoomInfo(coordinates), retryConfig);
        progress.tick();
        return { info, coordinates };
      },
      { concurrency: 200 },
    );
    rooms.forEach(room => (this.rooms[room.coordinates] = room.info));
    rooms.forEach(
      room =>
        (this.rooms[room.coordinates] = {
          characters: [],
          onlineCharacters: [],
          deadCharacters: [],
          scavenge: {
            gear: this.dungeon.gear.balanceOf(room.info.location),
            balance: this.dungeon.elements.balanceOf(room.info.location),
          },
          ...room.info,
          ...this.exits.forRoom(this.rooms[room.coordinates]),
        }),
    );
    Object.values(this.rooms)
      .sort((a, b) => a.blockNumber - b.blockNumber)
      .map(room => {
        this.rooms[room.coordinates] = {
          ...room,
          ...this.dungeon.combat.createCombat(room, null, false),
          ...this.roomShape.generate(this.rooms[room.coordinates]),
        };
      });
  }

  async move(character, from, to, mode, path, block, init = false) {
    if (!this.moves[character]) {
      this.moves[character] = [];
    }
    this.moves[character].push({ from, to, mode, path, block });
    if (!this.rooms[to]) this.rooms[to] = { characters: [] };
    const fromCharacters = new Set(this.rooms[from].characters);
    fromCharacters.delete(character);
    this.rooms[from].characters = Array.from(fromCharacters);
    this.rooms[to].characters = Array.from(new Set(this.rooms[to].characters).add(character));
    this.rooms[from].onlineCharacters = this.onlineCharacters(from);
    this.rooms[to].onlineCharacters = this.onlineCharacters(to);
    if (!init) {
      const discovered = !this.rooms[to].status;
      let rooms = await Promise.all([this.reloadRoom(from), this.reloadRoomEnsured(to)]);
      let received = {};
      if (discovered) {
        console.log('new room discovered at ' + to);
        received = await this.calculateRoomReward(
          this.rooms[to],
          this.dungeon.characters[character].stats.characterClass,
        );
      }
      rooms = rooms.flat();
      this.dungeon.characters[character].location = to;
      await Promise.all([
        this.dungeon.character.reloadPlayerInfo(character),
        this.dungeon.character.reloadCharacterStats(character),
      ]);
      this.sockets.emit('move', {
        character,
        from,
        to,
        mode,
        received,
        path,
        characterInfo: this.dungeon.character.info(character),
        roomUpdates: rooms.map(cleanRoom),
        statusUpdates: this.rooms[to].hasMonster
          ? this.rooms[to].characters.reduce((updates, character) => {
              updates[character] = this.dungeon.character.changeStatus(character, { status: 'blocked by monster' });
              return updates;
            }, {})
          : { [character]: this.dungeon.character.changeStatus(character, { status: 'exploring' }) },
      });
      this.sockets.move(character, from, to);
      const move = { from, to, discovered, mode, path };
      console.log(`player ${character} moved from ${from} to ${to}, ${rooms.length} rooms updated`);
      await this.dungeon.quests.advanceHandler(character, { move });

      // Emit teleport discovered
      if (discovered && Number(this.rooms[to].kind) === 2) {
        this.sockets.emit('teleport-discovered', { coordinates: to });
      }
    }
  }

  async calculateRoomReward(room, characterClass = 0) {
    const { location, hash, areaType } = room;
    if (!hash || !location) {
      console.log('incomplete data for reward calculation', hash, location, room);
    }
    const [
      coins,
      elements,
    ] = await this.contracts.pureCall('computeRoomDiscoveryReward(uint256,bytes32,uint8):(uint256,uint256)', [
      location || coordinatesToLocation('0,0'),
      hash || '0x0000000000000000000000000000000000000000000000000000000000000000',
      characterClass,
    ]);
    const received = {};
    received.elements = [0, 0, 0, 0, 0];
    received.elements[areaType] += elements.toNumber();
    received.coins = coins.toNumber();
    return received;
  }

  async fetchCharacterMovements(fromBlock = 0, toBlock = 'latest', snapshot) {
    if (snapshot) {
      console.log('getting character movements since snapshot');
      this.moves = {...this.moves, ...snapshot.moves};
    } else {
      console.log('getting character movement history');
    }
    const moves = await pastEvents('Dungeon', 'CharacterMoved', [], fromBlock, toBlock, 40000, true);
    const characters = new Set();
    const coordinates = new Set();
    moves.forEach(({ args: {oldLocation, newLocation, mode, characterId, path}, blockNumber }) => {
      const character = characterId.toString();
      characters.add(character);
      const from = locationToCoordinates(oldLocation);
      const to = locationToCoordinates(newLocation);
      coordinates.add(from).add(to);
      this.move(character, from, to, mode, decodeDirections(path), Number(blockNumber), true);
    });
    console.log(`fetched ${moves.length} moves from ${characters.size} players in ${coordinates.size} rooms`);
    if (snapshot) {
      Object.values(this.rooms).filter(({overrides}) => overrides).forEach(room => {
        room.overrides = null;
        coordinates.add(room.coordinates);
      })
      const locations = [...coordinates].map(coord => coordinatesToLocation(coord));
      const players = [...characters].map(character => this.dungeon.characters[character].player);
      const owners = new Set([...locations, ...characters, ...players, this.contracts.Dungeon.address.toLowerCase()]);
      console.log(`refreshing balance of ${owners.size} owners`);
      await Promise.map(owners, async owner => this.dungeon.elements.reloadBalance(owner), { concurrency });
      console.log(`refreshing state of recently changed ${coordinates.size} rooms`);
      await Promise.map(coordinates, coords => this.reloadRoom(coords), { concurrency });
      console.log(`refreshing state of recently moved ${characters.size} characters`);
      await Promise.map(characters, character => this.dungeon.character.reloadCharacterInfo(character), { concurrency });
    }
  }

  async fetchDeadCharacters(fromBlock = 0, toBlock = 'latest') {
    console.log('getting dead characters');
    let deaths = await pastEvents('Dungeon', 'Death', [], fromBlock, toBlock);
    const deadCharacters = Array.from(new Set(deaths.map(({ args: { characterId } }) => characterId.toString())));
    deadCharacters.forEach(character => {
      const room = this.rooms[this.dungeon.character.coordinates(character)];
      room.deadCharacters = Array.from(new Set([...(room.deadCharacters || []), character]));
    });
    this.rooms = mapValues(this.rooms, room => ({
      ...room,
      scavenge: {
        ...room.scavenge,
        corpses: this.scavengeCorpses(room.coordinates),
      },
    }));
  }

  async teleportCost(character, destination) {
    const [cost] = await this.contracts.pureCall('teleportTax(uint256,uint256):(uint256)', [
      coordinatesToLocation(this.dungeon.character.coordinates(character)),
      coordinatesToLocation(destination),
    ]);
    return Number(cost);
  }

  scavengeCorpses(coordinates) {
    const room = this.rooms[coordinates];
    if (room && room.deadCharacters) {
      return room.deadCharacters
        .map(character => {
          const { characterName, stats, gear, coins, keys, fragments, elements } = this.dungeon.character.info(character);
          if (gear.length > 0 || coins > 0 || keys > 0 || fragments > 0 || elements.reduce((acc, el) => acc + el) > 0) {
            return { character, characterName, stats, gear, coins, keys, fragments, elements };
          } else {
            return null;
          }
        })
        .filter(v => v)
        .sort((a, b) => b.stats.level - a.stats.level);
    } else {
      return [];
    }
  }

  static exitsToCoordinates(coordinates, exits) {
    let coords = [];
    if (exits.north) coords.push(coordinatesAt(coordinates, 0, 1));
    if (exits.east) coords.push(coordinatesAt(coordinates, 1, 0));
    if (exits.south) coords.push(coordinatesAt(coordinates, 0, -1));
    if (exits.west) coords.push(coordinatesAt(coordinates, -1, 0));
    return coords;
  }

  async reloadRoom(coordinates, prefetchedRoom) {
    let room = prefetchedRoom || (await this.fetchRoomInfo(coordinates));
    if (!room.status) return room;
    const { allExits, allLocks } = this.exits.forRoom(room);
    room.allExits = allExits;
    room.allLocks = allLocks;
    room.scavenge = {
      gear: this.dungeon.gear.balanceOf(room.location),
      balance: this.dungeon.elements.balanceOf(room.location),
      corpses: this.scavengeCorpses(coordinates),
    };
    const old = this.rooms[coordinates] || {};
    room = { ...old, ...room, ...old.overrides, ...this.roomShape.generate(room) };
    this.rooms[coordinates] = this.dungeon.combat.createCombat(room);
    return this.rooms[coordinates];
  }

  async reloadRoomEnsured(coordinates) {
    const { monsterBlockNumber, characters, hasMonster } = this.rooms[coordinates];
    const room = await retry(async () => {
      const r = await this.fetchRoomInfo(coordinates);
      if (
        characters.length === 0 &&
        Number(monsterBlockNumber) === Number(r.monsterBlockNumber) &&
        hasMonster === r.hasMonster
      ) {
        console.log('failed to fetch updated room, trying again...');
        throw new Error('room didnt changed');
      }
      return r;
    }, retryConfig);
    return this.reloadRoom(coordinates, room);
  }

  async reorgRoom(coordinatesOrRoom, characterInfos = []) {
    let coordinates = coordinatesOrRoom;
    let prefetchedRoom = null;
    if (typeof coordinatesOrRoom === 'object') {
      prefetchedRoom = coordinatesOrRoom;
      coordinates = prefetchedRoom.coordinates;
    }
    const room = await this.reloadRoom(coordinates, prefetchedRoom);
    const statusUpdates = room.characters.reduce((updates, character) => {
      updates[character] =
        this.dungeon.character.changeStatus(character, {
          status: room.hasMonster ? 'blocked by monster' : 'exploring',
        }) || this.dungeon.character.status(character);
      return updates;
    }, {});
    const update = { characterInfos, roomUpdates: [cleanRoom(room)], statusUpdates };
    this.sockets.emit('reorg', update);
    return update;
  }

  updateOnlineCharacters(character) {
    const coords = this.dungeon.character.coordinates(character);
    if (coords) {
      this.rooms[coords] = { ...this.rooms[coords], onlineCharacters: this.onlineCharacters(coords) };
      this.sockets.emit('online', { roomUpdates: [cleanRoom(this.rooms[coords])] });
    }
  }

  onlineCharacters(coordinates) {
    return this.rooms[coordinates].characters.filter(char => this.sockets.characters[char]);
  }

  get onlineCharactersInfo() {
    return this.sockets.onlineCharacters.map(character => this.dungeon.character.info(character));
  }

  get randomEntryLocation() {
    const valid = Object.values(this.roomsAround('0,0', 9))
      .filter(room => Number(room.kind) === 2)
      .filter(({ coordinates }) => Object.keys(bfs(this.rooms, coordinates, 0)).length >= 5)
      .map(({ location }) => location);
    return { location: randomItem(valid), valid };
  }

  get deadCharacters() {
    return Object.values(this.rooms).reduce((chars, room) => {
      if (room.deadCharacters && room.deadCharacters.length > 0) room.deadCharacters.map(ch => chars.add(ch));
      return chars;
    }, new Set());
  }

  //TODO preferably remove, is setting status usefull somehow insted null?
  roomAt(coordinates) {
    return this.rooms[coordinates] || { status: 'unknown' };
  }

  roomsAround(coordinates = '0,0', radius = 5) {
    let rooms = {};
    for (let y = -radius; y <= +radius; y++) {
      for (let x = -radius; x <= +radius; x++) {
        const coord = coordinatesAt(coordinates, x, y);
        const room = this.rooms[coord];
        if (room) {
          rooms[coord] = room;
        }
      }
    }
    return rooms;
  }

  roomsInChunk(chunk, chunkSize) {
    const [x, y, z] = chunk.split(',').map(Number);
    const minX = x * chunkSize;
    const minY = y * chunkSize;
    const rooms = {};

    for (let cy = minY; cy < minY + chunkSize; cy += 1) {
      for (let cx = minX; cx < minX + chunkSize; cx += 1) {
        // strip 0 floor
        const key = [cx, cy, z].join(',').replace(/,0$/, '');
        if (this.rooms[key]) {
          rooms[key] = this.rooms[key];
        }
      }
    }
    return rooms;
  }

  roomsByDistance(origin = '0,0', limit = 100) {
    return Object.values(bfs(this.rooms, origin, null, limit, true, true))
      .sort((a, b) => a.parent.distance - b.parent.distance);
  }

  roomsWith(filter) {
    return Object.values(this.rooms).filter(filter);
  }

  viewport(floor = 0) {
    const rooms = Object.keys(this.rooms)
      .filter(coords => (coords.split(',').map(Number)[2] || 0 === Number(floor)));
    const viewport = rooms.reduce(
      (prev, key) => {
        const [x, y] = key.split(',').map(Number);
        return {
          minX: Math.min(x, prev.minX),
          minY: Math.min(y, prev.minY),
          maxX: Math.max(x, prev.maxX),
          maxY: Math.max(y, prev.maxY),
        };
      },
      { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    );
    return { ...viewport, count: rooms.length };
  }

  addOverride(room, override) {
    const overrides = { ...(room.overrides || {}), ...override };
    return { ...room, ...override, overrides };
  }

  clearOverride(room, override) {
    const overrides = room.overrides || {};
    Object.keys(override).forEach(k => {
      delete overrides[k];
    });
    return { ...room, overrides };
  }
}

module.exports = DungeonMap;
