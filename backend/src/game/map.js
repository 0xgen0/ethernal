const { events, db } = require('../db/provider');
const blockHash = require('../db/blockHash.js');
const Promise = require('bluebird');
const retry = require('p-retry');
const jsonDiff = require('json-diff');
const { cleanRoom, monsterLevel, toMap, identity, randomItem } = require('../data/utils');
const {
  coordinatesAt,
  locationToCoordinates,
  locationToBounty,
  coordinatesToLocation,
  decodeDirections,
  decodeExits,
  bfs,
} = require('./utils');
const DungeonComponent = require('./dungeonComponent.js');
const RoomShape = require('./room/shape.js');
const Exits = require('./room/exits.js');

const retryConfig = { retries: 5 };
const checkBackIn = 10 * 1000;

class DungeonMap extends DungeonComponent {
  roomShape = new RoomShape(this);
  exits = new Exits(this);

  constructor(dungeon) {
    super(dungeon);
    this.sockets.onCharacter('subscribe-rooms', this.handleSubscribeRooms.bind(this));
  }

  registerEventHandlers() {
    const { Dungeon } = this.contracts;
    events.on(Dungeon, 'RoomDiscovered', () => {});
    events.on(Dungeon, 'CharacterMoved', this.handleCharacterMoved.bind(this), this.prefetchCharacterMoved.bind(this));
    try {
      events.onConfirmed(Dungeon, 'CharacterMoved', this.handleConfirmedCharacterMoved.bind(this));
      console.log('registered confirmed event listeners');
    } catch (e) {
      console.log('confirmed events not supported');
    }
  }

  async prefetchCharacterMoved(characterId, oldLocation, newLocation, mode, path, event) {
    const { Dungeon } = this.contracts;
    await Promise.all([
      Dungeon.cached.getRoomInfo(oldLocation),
      Dungeon.cached.getRoomInfo(newLocation),
      Dungeon.cached.getAreaTypeForRoom(oldLocation),
      Dungeon.cached.getAreaTypeForRoom(newLocation),
      Dungeon.cached.getCharacterInfo(characterId),
      event && blockHash(event.blockNumber),
    ]);
  }

  async handleCharacterMoved(characterId, oldLocation, newLocation, mode, path, event) {
    const character = characterId.toString();
    const from = locationToCoordinates(oldLocation);
    const to = locationToCoordinates(newLocation);
    console.log('move event received', from, to, path.toHexString(), event.transactionHash);
    if (!events.defer && !events.replaying) {
      setTimeout(async () => {
        const [room, stored] = await Promise.all([
          this.fetchRoomInfo(to),
          this.roomAt(to),
        ]);
        const { monsterBlockHash, hash } = room;
        const diff = jsonDiff.diff(
          { monsterBlockHash: monsterBlockHash || stored.monsterBlockHash, hash },
          { monsterBlockHash: stored.monsterBlockHash, hash: stored.hash },
        );
        if (diff) {
          console.log('reorg detected for room ' + to, diff);
          const update = await this.reorgRoom(room.coordinates);
          this.dungeon.debug.reorgs.push({ date: new Date().toISOString(), to, diff, event, update });
        }
      }, checkBackIn);
    }
    await this.move(character, from, to, mode, decodeDirections(path), event);
  }

  async handleConfirmedCharacterMoved(characterId, oldLocation, newLocation, mode, path, event) {
    const character = characterId.toString();
    const from = locationToCoordinates(oldLocation);
    const to = locationToCoordinates(newLocation);
    const block = Number(event.blockNumber);
    // TODO optimize by special query for just last move
    const moves = await this.dungeon.character.moves(character);
    const lastMove = moves[moves.length - 1];
    if (block >= lastMove.block && to !== lastMove.to) {
      console.log('missing move event finally received', from, to, path.toHexString(), event.transactionHash);
      this.dungeon.debug.moveEvents.push({ character, from, to, date: new Date().toISOString(), event });
      await this.move(character, from, to, mode, decodeDirections(path), event);
    }
  }

  async handleSubscribeRooms(character, {coordinates = []}) {
    const rooms = await this._roomList(coordinates)
    return rooms
      .filter(identity)
      .map(cleanRoom);
  }

  async fetchRoomInfo(coordinates) {
    const { Dungeon, pureCall } = this.contracts;
    const location = coordinatesToLocation(coordinates);
    const roomData = await Dungeon.cached.getRoomInfo(location);
    const { direction, areaAtDiscovery, lastRoomIndex, index, actualised, randomEvent } = roomData;
    const blockNumber = roomData.blockNumber.toNumber();
    const monsterBlockNumber = roomData.monsterBlockNumber.toNumber();
    const roomBlockHash = await blockHash(blockNumber);
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

    const [areaType] = await Dungeon.cached.getAreaTypeForRoom(location);

    let { exits, locks, exitsBits } = await this.generateExits(location, roomBlockHash, direction);

    let hasMonster = false;
    let monsterBlockHash;
    if (monsterBlockNumber !== 0) {
      monsterBlockHash = await blockHash(monsterBlockNumber);
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
      randomEvent: Number(randomEvent),
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

  async move(character, from, to, mode, path, event, init = false) {
    let rooms = await this._roomList([from, to]);
    let [fromRoom, toRoom = { characters: [] }] = rooms;
    const fromCharacters = new Set(fromRoom.characters);
    fromCharacters.delete(character);
    fromRoom.characters = Array.from(fromCharacters);
    toRoom.characters = Array.from(new Set(toRoom.characters).add(character));
    fromRoom.onlineCharacters = this.onlineCharacters(fromRoom);
    toRoom.onlineCharacters = this.onlineCharacters(toRoom);
    if (!init) {
      const discovered = !toRoom.status;
      rooms = await Promise.all([this.reloadRoom(from, fromRoom), this.reloadRoomEnsured(to, toRoom)]);
      toRoom = rooms[1];
      let received = {};
      if (discovered) {
        console.log('new room discovered at ' + to);
        const characterInfo = await this.dungeon.character._info(character);
        received = await this.calculateRoomReward(
          toRoom,
          characterInfo.stats.characterClass,
        );
      }
      // TODO optimize to single write
      await Promise.all([
        this.dungeon.character.reloadPlayerInfo(character),
        this.dungeon.character.reloadCharacterStats(character),
      ]);
      let statusUpdates;
      if (toRoom.hasMonster) {
        statusUpdates = await Promise.all(
          toRoom.characters.map(async character => ([
            character,
            await this.dungeon.character.changeStatus(character, { status: 'blocked by monster' }),
          ])),
        ).then(toMap);
      } else {
        statusUpdates = {
          [character]: await this.dungeon.character.changeStatus(character, { status: 'exploring' }),
        };
      }
      const characterInfo = await this.dungeon.character._info(character);
      characterInfo.coordinates = to;
      await this.dungeon.character.storeCharacter(characterInfo);
      this.sockets.emit('move', {
        character,
        from,
        to,
        mode,
        received,
        path,
        characterInfo: await this.dungeon.character.info(character, characterInfo),
        roomUpdates: rooms.map(cleanRoom),
        statusUpdates,
      });
      this.sockets.move(character, from, to);
      console.log(`player ${character} moved from ${from} to ${to}, ${rooms.length} rooms updated`);

      if (!events.replaying) {
        const move = { from, to, discovered, mode, path };
        await this.dungeon.quests.advanceHandler(character, { move });
      }

      // Emit teleport discovered
      if (discovered && Number(toRoom.kind) === 2) {
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

  async teleportCost(character, destination) {
    const [cost] = await this.contracts.pureCall('teleportTax(uint256,uint256):(uint256)', [
      coordinatesToLocation(await this.dungeon.character.coordinates(character)),
      coordinatesToLocation(destination),
    ]);
    return Number(cost);
  }

  async scavengeCorpses(room) {
    if (room) {
      const characterInfos = await this.dungeon.character.infos(
        room.characters,
        `(info->'status'->>'status' = 'dead' OR info->'status'->>'status' = 'just died')`,
      );
      return characterInfos
        .map(({ character, characterName, stats, gear, coins, keys, fragments, elements }) => {
          if (gear.length > 0 || coins > 0 || keys > 0 || fragments > 0 || elements.reduce((acc, el) => acc + el) > 0) {
            return { character, characterName, stats, gear, coins, keys, fragments, elements };
          } else {
            return null;
          }
        })
        .filter(identity)
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
    if (!room || !room.status) return room;
    const { allExits, allLocks } = await this.exits.forRoom(room);
    room.allExits = allExits;
    room.allLocks = allLocks;
    const [gear, balance, bounty, shape, old = {}] = await Promise.all([
      this.dungeon.gear.balanceOf(room.location),
      this.dungeon.elements.balanceOf(room.location),
      this.dungeon.elements.balanceOf(locationToBounty(room.location)),
      this.roomShape.generate(room),
      await this._room(coordinates),
    ]);
    room.scavenge = { gear, balance, corpses: await this.scavengeCorpses(old) };
    room = { ...old, ...room, ...old.overrides, ...shape, bounty: { ...room.bounty, ...bounty } };
    room = this.dungeon.combat.createCombat(room);
    await this.storeRooms([room]);
    return room;
  }

  async reloadRoomEnsured(coordinates, originalRoom) {
    const { monsterBlockNumber, characters = [], hasMonster } = originalRoom || await this._room(coordinates);
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
    return this.reloadRoom(coordinates, {...originalRoom, ...room});
  }

  async reorgRoom(coordinates, characterInfos = []) {
    const room = await this.reloadRoom(coordinates);
    const characters = await this.dungeon.character._infos(room.characters);
    const statuses = await Promise.all(
      characters
        .filter(({ status }) => !this.dungeon.character.isDead(status) && status.status !== 'claiming rewards')
        .map(async ({ character }) => ([
          character,
          await this.dungeon.character.changeStatus(character, {
            status: room.hasMonster ? 'blocked by monster' : 'exploring',
          }),
        ])),
    );
    const statusUpdates = statuses.reduce((o, [character, status]) => ({ ...o, [character]: status }), null);
    const update = { characterInfos, roomUpdates: [cleanRoom(room)], statusUpdates };
    this.sockets.emit('reorg', update);
    return update;
  }

  toRow(room) {
    return [room.coordinates, room];
  }

  async storeSchema() {
    return db.tx(t => {
      t.query(`
        CREATE TABLE IF NOT EXISTS ${db.tableName('room')} (
            coordinates varchar(100) PRIMARY KEY,
            roomData jsonb)
      `);
      t.query(`
        INSERT INTO ${db.tableName('room')} (coordinates, roomData) VALUES ($1,$2)
                ON CONFLICT (coordinates) DO NOTHING
      `, this.toRow({ coordinates: '0,0', characters: [] }));
    });
  }

  async storeRooms(rooms) {
    return db.tx(t => {
      rooms
        .map(room => this.toRow(room))
        .forEach(row => {
          // try {
          //   throw new Error();
          // } catch (e) {
          //   console.log('room storage', row[1])
          // }
          t.query(
            `INSERT INTO ${db.tableName('room')} (coordinates, roomData) VALUES ($1,$2)
                ON CONFLICT (coordinates) DO UPDATE
                SET roomData = excluded.roomData`,
            row,
          )});
    });
  }

  // TODO online characters synced in memory or only inc or dec
  async updateOnlineCharacters(character) {
    const coords = await this.dungeon.character.coordinates(character);
    if (coords) {
      const room = await this._room(coords);
      room.onlineCharacters = this.onlineCharacters(room);
      await this.storeRooms([room]);
      this.sockets.emit('online', { roomUpdates: [cleanRoom(room)] });
    }
  }

  onlineCharacters(room = { characters: [] }) {
    return room.characters.filter(char => this.sockets.characters[char]);
  }

  async onlineCharactersInfo() {
    return this.dungeon.character.infos(this.sockets.onlineCharacters);
  }

  // TODO optimization - precalculated?
  async randomEntryLocation() {
    const rooms = await this.roomsAround('0,0', 15);
    const valid = Object.values(rooms)
      .filter(room => Number(room.kind) === 2)
      .filter(({ coordinates }) => Object.keys(bfs(rooms, coordinates, 0)).length >= 5)
      .map(({ location }) => location);
    return { location: randomItem(valid), valid };
  }

  async _room(coordinates) {
    const { rows } = await db.query(`SELECT * FROM ${db.tableName('room')} WHERE coordinates = $1`, [coordinates]);
    return rows.length && rows[0].roomdata;
  }

  async _roomList(coordsList) {
    const rooms = await this._rooms(coordsList);
    return coordsList.map(coordinates => rooms[coordinates]);
  }

  async _rooms(coordsList) {
    const { rows } = await db.query(`SELECT * FROM ${db.tableName('room')} WHERE coordinates = ANY ($1)`, [coordsList]);
    return rows
      .map(r => r.roomdata)
      .reduce((res, room) => ({...res, [room.coordinates]: room}), {});
  }

  async roomAt(coordinates) {
    return this._room(coordinates);
  }

  async roomsAround(coordinates = '0,0', radius = 5) {
    const coords = [];
    for (let y = -radius; y <= +radius; y++) {
      for (let x = -radius; x <= +radius; x++) {
        const coord = coordinatesAt(coordinates, x, y);
        coords.push(coord);
      }
    }
    return this._rooms(coords);
  }

  async roomsInChunk(chunk, chunkSize) {
    const [x, y, z] = chunk.split(',').map(Number);
    const minX = x * chunkSize;
    const minY = y * chunkSize;
    const coords = [];

    for (let cy = minY; cy < minY + chunkSize; cy += 1) {
      for (let cx = minX; cx < minX + chunkSize; cx += 1) {
        // strip 0 floor
        const key = [cx, cy, z].join(',').replace(/,0$/, '');
        coords.push(key);
      }
    }
    return this._rooms(coords);
  }

  async roomsByDistance(origin = '0,0', limit = 100) {
    const rooms = await this.roomsAround(origin, limit);
    return Object.values(bfs(rooms, origin, null, limit, true, true))
      .sort((a, b) => a.parent.distance - b.parent.distance);
  }

  async roomsWith(filter, params = []) {
    const { rows } = await db.query(`
        SELECT * FROM ${db.tableName('room')} WHERE ${filter}`,params);
    return rows.map(({roomdata}) => roomdata);
  }

  async floorRooms(floor = 0) {
    const { rows } = await db.query(`
      SELECT C.roomdata as roomdata
      FROM (SELECT regexp_split_to_array(coordinates, E',') AS coords, roomdata FROM ${db.tableName('room')}) as C
      WHERE ${floor === 0 ? 'C.coords[3] IS NULL' : 'C.coords[3]::INTEGER = $1'};`, floor === 0 ? [] : [floor]);
    return rows.map(({roomdata}) => roomdata);
  }

  async viewport(floor = 0) {
    const { rows } = await db.query(`
      SELECT MAX(C.coords[1]::INTEGER) as xa, MAX(C.coords[2]::INTEGER) as ya,
             MIN(C.coords[1]::INTEGER) as xb, MIN(C.coords[2]::INTEGER) as yb, count(*)::INTEGER as count
      FROM (SELECT regexp_split_to_array(coordinates, E',') AS coords FROM ${db.tableName('room')}) as C
      WHERE ${floor === 0 ? 'C.coords[3] IS NULL' : 'C.coords[3]::INTEGER = $1'};`, floor === 0 ? [] : [floor]);
    const { xa, ya, xb, yb, count } = rows[0];
    if (count) {
      return { minX: xb, minY: yb, maxX: xa, maxY: ya, count };
    } else {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, count: 0 };
    }
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
