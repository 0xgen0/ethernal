const { events, pastEvents } = require('../db/provider');
const { gearBytes, cleanRoom, justValues, identity, mapValues } = require('../data/utils');
const { locationToCoordinates, isLocation } = require('./utils');
const DungeonComponent = require('./dungeonComponent.js');
const UniqueGear = require('../game/uniqueGear.js');

class Gear extends DungeonComponent {
  data = {};
  balances = {};

  constructor(map) {
    super(map);
    this.unique = new UniqueGear(map);
  }

  registerEventHandlers() {
    const { Gears, Dungeon } = this.dungeon.contracts;
    events.on(Gears, 'DataUpdate', this.handleDataUpdate.bind(this));
    events.on(Gears, 'Transfer', this.handleTransfer.bind(this));
    events.on(Gears, 'SubTransfer', this.handleSubTransfer.bind(this));
    events.on(Dungeon, 'Recycle', this.handleRecycle.bind(this));
  }

  async fetchAll(fromBlock = 0, toBlock = 'latest', snapshot) {
    console.log('getting all gear');
    const updates = justValues(await pastEvents('Gears', 'DataUpdate', [], fromBlock, toBlock));
    const data = updates.reduce((d, { id, data }) => {
      d[id] = data;
      return d;
    }, snapshot ? snapshot.gear.data : {});
    console.log('fetched data of ' + Object.keys(data).length + ' gear');
    const gears = Array.from(new Set(Object.values(data))).map(gearBytes.toJSON);
    const unique = gears.map(gear => this.unique.give(gear)).filter(identity);
    console.log(`fetched ${unique.length} unique gears given, ${this.unique.available.length} remaining`);
    const transfers = justValues(await pastEvents('Gears', 'SubTransfer', [], fromBlock, toBlock));
    const balances = transfers.reduce((b, { from, to, id }) => {
      id = Number(id);
      if (Number(from) !== 0) b[from].delete(id);
      if (!b[to]) b[to] = new Set();
      b[to].add(id);
      return b;
    }, snapshot ? mapValues(snapshot.gear.balances, gears => new Set(gears)) : {});
    this.balances = balances;
    this.data = data;
    justValues(await pastEvents('Gears', 'Transfer', [], fromBlock, toBlock)).forEach(({ from, to, id }) =>
      this.handleTransfer(from, to, id),
    );
    console.log('fetched gear from ' + Object.keys(balances).length + ' owners');
  }

  handleDataUpdate(id, data) {
    id = Number(id);
    this.data[id] = data;
    const gear = gearBytes.toJSON(data);
    if (gear.durability <= 0) {
      console.log('gear broken', id);
      const character = this.ownerOf(id);
      const coordinates = this.dungeon.character.coordinates(character);
      this.sockets.emit('gear-broken', { character, gear, coordinates });
    }
  }

  handleTransfer(fromAddress, toAddress, id) {
    id = Number(id);
    const from = fromAddress.toLowerCase();
    const to = toAddress.toLowerCase();
    const dungeon = this.contracts.Dungeon.address.toLowerCase();
    if (from !== dungeon && this.balances[from]) {
      this.balances[from].delete(id);
    }
    if (to !== dungeon) {
      if (!this.balances[to]) {
        this.balances[to] = new Set();
      }
      this.balances[to].add(id);
    }
  }

  handleSubTransfer(fromId, toId, id) {
    id = Number(id);
    const gear = this.info(id);
    const from = fromId.toString();
    const to = toId.toString();
    if (from !== '0' && this.balances[from]) {
      const removed = this.balances[from].delete(id);
      if (!removed) {
        console.log('failed to substract ' + id + ' from ' + from);
      }
    }
    if (!this.balances[to]) {
      this.balances[to] = new Set();
    }
    this.balances[to].add(id);
    this.sockets.emit('transfer', { from, to, gearId: id, gear });
    const characterInfos = [];
    const roomUpdates = [];
    if (from !== '0') {
      if (isLocation(from)) {
        const coordinates = locationToCoordinates(from);
        const room = this.dungeon.rooms[coordinates];
        if (room) {
          room.scavenge = { ...room.scavenge, gear: this.balanceOf(from) };
          roomUpdates.push(cleanRoom(room));
          this.sockets.emit('scavenge', { character: to, from, coordinates, gear });
        }
      } else {
        const characterInfo = this.dungeon.character.info(from);
        const coordinates = this.dungeon.character.coordinates(to);
        characterInfos.push(characterInfo);
        if (this.dungeon.map.deadCharacters.has(from)) {
          const coordinates = this.dungeon.character.coordinates(from);
          const character = to;
          const room = this.dungeon.rooms[coordinates];
          if (room) {
            room.scavenge = { ...room.scavenge, corpses: this.dungeon.map.scavengeCorpses(coordinates) };
            roomUpdates.push(cleanRoom(room));
          }
          this.sockets.emit('scavenge', { character, from, coordinates, gear, });
        }
        this.sockets.emit('gear-removed', { character: from, gearId: id, coordinates, characterInfo, gear });
      }
    }
    if (to !== '0') {
      if (isLocation(to) && this.dungeon.rooms[locationToCoordinates(to)]) {
        const characterInfo = this.dungeon.character.info(from);
        const room = this.dungeon.rooms[locationToCoordinates(to)];
        if (room) {
          room.scavenge = { ...room.scavenge, gear: this.balanceOf(to) };
          roomUpdates.push(cleanRoom(room));
          this.sockets.emit('dropped', { character: from, coordinates: room.coordinates, characterInfo, gear })
        }
      } else {
        const characterInfo = this.dungeon.character.info(to);
        const coordinates = this.dungeon.character.coordinates(to);
        characterInfos.push(characterInfo);
        this.sockets.emit('gear-received', { character: to, gearId: id, coordinates, characterInfo, gear });
      }
    }
    if (characterInfos.length || roomUpdates.length) {
      this.sockets.emit('update', { characterInfos, roomUpdates });
    }
  }

  handleRecycle(characterId, gearId) {
    const id = Number(gearId);
    const character = characterId.toString();
    this.sockets.emit('recycle', { character, coordinates: this.dungeon.character.coordinates(character), gear: this.info(id) });
  }

  info(id) {
    const data = this.data[id];
    return {
      ...(data ? gearBytes.toJSON(data) : { bytes: null }),
      id: id.toString(),
    };
  }

  balanceOf(holder) {
    return Array.from(this.balances[holder] || [])
      .map(this.info.bind(this))
      .sort((a, b) => b.level - a.level);
  }

  ownerOf(id) {
    return Object.keys(this.balances).find(owner => this.balances[owner].has(id));
  }
}

module.exports = Gear;
