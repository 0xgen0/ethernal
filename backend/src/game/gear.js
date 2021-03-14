const Promise = require('bluebird');
const { events, db } = require('../db/provider');
const { gearBytes, cleanRoom } = require('../data/utils');
const { locationToCoordinates, isLocation } = require('./utils');
const DungeonComponent = require('./dungeonComponent.js');
const UniqueGear = require('../game/uniqueGear.js');

class Gear extends DungeonComponent {
  constructor(map) {
    super(map);
    this.unique = new UniqueGear(map);
  }

  registerEventHandlers() {
    const { Gears, Dungeon } = this.contracts;
    events.on(Gears, 'DataUpdate', this.handleDataUpdate.bind(this));
    events.on(Gears, 'Transfer', this.handleTransfer.bind(this));
    events.on(Gears, 'SubTransfer', this.handleSubTransfer.bind(this));
    events.on(Dungeon, 'Recycle', this.handleRecycle.bind(this));
  }

  async handleDataUpdate(id, data) {
    id = Number(id);
    const owner = await this.ownerOf(id);
    await this.store([[id, owner, data]]);
    const gear = gearBytes.toJSON(data);
    if (gear.durability <= 0) {
      console.log('gear broken', id);
      const character = owner;
      const coordinates = await this.dungeon.character.coordinates(character);
      this.sockets.emit('gear-broken', { character, gear, coordinates });
    }
  }

  async handleTransfer(fromAddress, toAddress, id) {
    id = Number(id);
    const to = toAddress.toLowerCase();
    const dungeon = this.contracts.Dungeon.address.toLowerCase();
    if (to !== dungeon) {
      const { data } = await this.info(id);
      await this.store([[id, to, data]]);
    }
  }

  async handleSubTransfer(fromId, toId, id) {
    id = Number(id);
    const gear = await this.info(id);
    const from = fromId.toString();
    const to = toId.toString();
    await this.store([[id, to, gear.data]]);
    this.sockets.emit('transfer', { from, to, gearId: id, gear });
    const characterInfos = [];
    const roomUpdates = [];
    if (from !== '0') {
      if (isLocation(from)) {
        const coordinates = locationToCoordinates(from);
        const room = await this.dungeon.room(coordinates);
        if (room) {
          room.scavenge = { ...room.scavenge, gear: await this.balanceOf(from) };
          roomUpdates.push(cleanRoom(room));
          await this.dungeon.map.storeRooms([room]);
          this.sockets.emit('scavenge', { character: to, from, coordinates, gear });
        }
      } else {
        const [characterInfo, coordinates] = await Promise.all([
          this.dungeon.character.info(from),
          this.dungeon.character.coordinates(to),
        ]);
        characterInfos.push(characterInfo);
        if (this.dungeon.character.isDead(characterInfo.status)) {
          const { coordinates } = characterInfo;
          const character = to;
          const room = await this.dungeon.room(coordinates);
          if (room) {
            room.scavenge = { ...room.scavenge, corpses: await this.dungeon.map.scavengeCorpses(room) };
            await this.dungeon.map.storeRooms([room]);
            roomUpdates.push(cleanRoom(room));
          }
          this.sockets.emit('scavenge', { character, from, coordinates, gear });
        }
        this.sockets.emit('gear-removed', { character: from, gearId: id, coordinates, characterInfo, gear });
      }
    }
    if (to !== '0') {
      if (isLocation(to)) {
        const [characterInfo, room] = await Promise.all([
          this.dungeon.character.info(from),
          this.dungeon.room(locationToCoordinates(to)),
        ]);
        if (room) {
          room.scavenge = { ...room.scavenge, gear: await this.balanceOf(to) };
          roomUpdates.push(cleanRoom(room));
          await this.dungeon.map.storeRooms([room]);
          this.sockets.emit('dropped', { character: from, coordinates: room.coordinates, characterInfo, gear });
        }
      } else {
        const characterInfo = await this.dungeon.character.info(to);
        const { coordinates } = characterInfo;
        characterInfos.push(characterInfo);
        this.sockets.emit('gear-received', { character: to, gearId: id, coordinates, characterInfo, gear });
      }
    }
    if (characterInfos.length || roomUpdates.length) {
      this.sockets.emit('update', { characterInfos, roomUpdates });
    }
  }

  async handleRecycle(characterId, gearId) {
    const id = Number(gearId);
    const character = characterId.toString();
    const gear = await this.info(id);
    const coordinates = await this.dungeon.character.coordinates(character);
    this.sockets.emit('recycle', { character, coordinates, gear });
  }

  async storeSchema() {
    return db.tx(t => {
      t.query(`
        CREATE TABLE IF NOT EXISTS ${db.tableName('gear')} (
            id numeric PRIMARY KEY,
            owner varchar(100),
            data numeric
        )
      `);
    });
  }

  async store(gears) {
    return db.tx(t => {
      gears.forEach(gear => {
        t.query(
          `INSERT INTO ${db.tableName('gear')}(id, owner, data) VALUES ($1,$2,$3)
              ON CONFLICT (id) DO UPDATE
              SET owner = excluded.owner,
                  data = excluded.data`,
          gear.map(g => g.toString()),
        );
      });
    });
  }

  fromRow(row) {
    const { data, owner, id } = row;
    return {
      ...gearBytes.toJSON(data),
      data,
      owner,
      id: String(id),
    };
  }

  async info(id) {
    const { rows } = await db.query(`SELECT * FROM ${db.tableName('gear')} WHERE id = $1`, [String(id)]);
    const gears = rows.map(r => this.fromRow(r));
    return gears.length && gears[0];
  }

  async balanceOf(holder) {
    const { rows } = await db.query(`SELECT * FROM ${db.tableName('gear')} WHERE owner = $1`, [String(holder)]);
    return rows.map(r => this.fromRow(r))
      .sort((a, b) => b.level - a.level);
  }

  async ownerOf(id) {
    const info = await this.info(id);
    return info && info.owner;
  }
}

module.exports = Gear;
