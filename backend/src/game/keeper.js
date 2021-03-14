const Promise = require('bluebird');
const { events, db } = require('../db/provider');
const { cleanRoom, toAddress, createBalanceFromAmounts, balanceToAmounts, difference, createBalance } = require('../data/utils');
const { locationToCoordinates } = require('./utils');
const DungeonComponent = require('./dungeonComponent.js');
const { specificMonsters } = require('./abilities/monster.js')
const Chest = require('./abilities/chest.js')
const NameRoom = require('./abilities/nameRoom.js')

class Keeper extends DungeonComponent {
  abilities = {};
  updatedData = {};

  constructor(map) {
    super(map);
    this.abilities = {
      ...specificMonsters(this.dungeon),
      33: new Chest(this.dungeon),
      44: new NameRoom(this.dungeon),
    }
    this.lastForeclosedRooms = new Set();
    this.sockets
      .onCharacter('use-ability', this.useAbility.bind(this));
  }

  registerEventHandlers() {
    const { Rooms, Dungeon } = this.contracts;
    events.on(Rooms, 'DataUpdate', this.handleDataUpdate.bind(this));
    events.on(Rooms, 'Transfer', this.handleTransfer.bind(this));
    events.on(Rooms, 'SubTransfer', this.handleSubTransfer.bind(this));
    events.on(Dungeon, 'RoomIncome', this.handleRoomIncome.bind(this));
    events.on(Dungeon, 'RoomName', this.handleRoomName.bind(this));
    events.onBlock(this.handleBlock.bind(this));
  }

  async applyDataUpdates() {
    console.log('applying keeper data updates');
    await Promise.all(
      Object.entries(this.updatedData)
        .map(([coordinates, data]) => this.applyDataUpdate(coordinates, data)),
    );
    this.updatedData = {};
  }

  async handleBlock({ number }) {
    if (number % 30 === 0) {
      await this.checkForeclosures();
    }
  }

  async handleDataUpdate(id, data) {
    id = id.toString();
    const coordinates = locationToCoordinates(id);
    const room = await this.room(coordinates);
    const current = room.customData;
    const next = data.toString();
    room.customData = next;
    await this.store([this.toRow(room)]);
    if (events.replaying) {
      this.updatedData[coordinates] = next;
    } else {
      console.log(`room ${coordinates} changed ${current} -> ${next}`);
      await this.applyDataUpdate(coordinates, next, current);
    }
  }

  async handleTransfer(fromAddress, toAddress, id) {
    id = id.toString();
    const coordinates = locationToCoordinates(id);
    const to = toAddress.toLowerCase();
    const keeper = await this.room(coordinates);
    keeper.holder = to;
    await this.store([this.toRow(keeper)]);
    const room = await this.updateRoomKeeper(coordinates, keeper);
    const update = cleanRoom(room);
    if (update) {
      this.sockets.emit('update', {roomUpdates: [update]});
    }
  }

  async handleSubTransfer(fromId, toId, id) {
    id = id.toString();
    const from = toAddress(fromId.toString());
    const to = toAddress(toId.toString());
    const coordinates = locationToCoordinates(id);
    const keeper = await this.room(coordinates);
    if (await this.isActive(coordinates, keeper)) {
      keeper.owner = to;
      await this.store([this.toRow(keeper)]);
      this.sockets.emit('transfer', { from, to, room: coordinates });
      const room = await this.updateRoomKeeper(coordinates, keeper);
      const update = cleanRoom(room);
      if (update) {
        this.sockets.emit('update', {roomUpdates: [update]});
      }
    }
    const dungeon = this.contracts.Dungeon.address.toLowerCase();
    if (to === dungeon || from === dungeon) {
      await this.checkForeclosures();
    }
  }

  async handleRoomIncome(location, benefactor, id, amount) {
    location = location.toString();
    benefactor = benefactor.toLowerCase();
    amount = Number(amount);
    const type = Number(id) - 1;
    const coordinates = locationToCoordinates(location);
    const [roomIncome, benefactorIncome] = await Promise.all([
      this.income(coordinates).then(balanceToAmounts),
      this.income(benefactor).then(balanceToAmounts),
    ]);
    const amounts = [0,0,0,0,0,0,0,0];
    amounts[type] += amount;
    roomIncome[type] += amount;
    benefactorIncome[type] += amount;
    const roomBalance = createBalanceFromAmounts(roomIncome);
    const benefactorBalance = createBalanceFromAmounts(benefactorIncome);
    await this.storeIncome([
      [coordinates, roomBalance],
      [benefactor, benefactorBalance],
    ]);
    const room = await this.updateRoomKeeper(coordinates);
    this.sockets.emit('income', {
      benefactor,
      coordinates,
      income: createBalanceFromAmounts(amounts),
      total: benefactorBalance,
      roomUpdates: [cleanRoom(room)],
    });
  }

  async handleRoomName(location, name, characterId) {
    const character = characterId.toString();
    const characterInfo = await this.dungeon.character.info(characterId);
    const coordinates = locationToCoordinates(location);
    const room = await this.dungeon.room(coordinates);
    room.customName = name;
    await this.dungeon.map.storeRooms([room]);
    this.sockets.emit('room-name', { coordinates: room.coordinates, character, characterInfo, room: cleanRoom(room) });
    this.sockets.emit('update', { roomUpdates: [cleanRoom(room)] });
  }

  async applyDataUpdate(coordinates, data) {
    Object.values(this.abilities)
      .forEach(ability => ability.applyRoomDataUpdate(coordinates, data));
  }

  async useAbility(character, { coordinates, ability }) {
    const [player, room] = await Promise.all([
      this.dungeon.character.playerOf(character),
      this.room(coordinates),
    ]);
    if (player !== room.owner) {
      throw new Error('not room keeper');
    }
    if (!(await this.isActive(coordinates, room))) {
      throw new Error('room not active');
    }
    ability = this.abilities[ability];
    await ability.use(character, coordinates);
    this.sockets.emit('ability-used', { character, coordinates, ability })
    return true;
  }

  async storeSchema() {
    return db.tx(t => {
      t.query(`
        CREATE TABLE IF NOT EXISTS ${db.tableName('income')} (
            benefactor varchar(100) PRIMARY KEY,
            e1 numeric,
            e2 numeric,
            e3 numeric,
            e4 numeric,
            e5 numeric,
            coins numeric,
            keys numeric,
            fragments numeric
        )
      `);
      t.query(`
        CREATE TABLE IF NOT EXISTS ${db.tableName('keeper')} (
            coordinates varchar(100) PRIMARY KEY,
            owner varchar(100),
            holder varchar(100),
            customData varchar)
      `);
    });
  }

  async storeIncome(rows) {
    return db.tx(t => {
      rows.forEach(([benefactor, balance]) => {
        t.query(
          `INSERT INTO ${db.tableName('income')} VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
              ON CONFLICT (benefactor) DO UPDATE
              SET e1 = excluded.e1,
                  e2 = excluded.e2,
                  e3 = excluded.e3,
                  e4 = excluded.e4,
                  e5 = excluded.e5,
                  coins = excluded.coins,
                  keys = excluded.keys,
                  fragments = excluded.fragments`,
          [String(benefactor), ...balanceToAmounts(balance)],
        );
      });
    });
  }

  async store(rows) {
    return db.tx(t => {
      rows.forEach(row =>
        t.query(
          `INSERT INTO ${db.tableName('keeper')} (coordinates, owner, holder, customData) VALUES ($1,$2,$3,$4)
              ON CONFLICT (coordinates) DO UPDATE
              SET owner = excluded.owner,
                  holder = excluded.holder,
                  customData = excluded.customData`,
          row,
        ));
    });
  }

  async updateRoomKeeper(coordinates, roomKeeper) {
    const [room, keeper] = await Promise.all([
      this.dungeon.room(coordinates),
      this.ofRoom(coordinates, roomKeeper),
    ]);
    if (room) {
      room.keeper = keeper;
      await this.dungeon.map.storeRooms([room]);
      return room;
    }
  }

  toRow(room) {
    const { owner, holder, customData, coordinates } = room;
    return [coordinates, owner, holder, customData];
  }

  async room(coordinates) {
    const { rows } = await db.query(`SELECT * FROM ${db.tableName('keeper')} WHERE coordinates = $1`, [coordinates]);
    if (rows.length) {
      const { owner, holder, customdata, coordinates } = rows[0];
      return { owner, holder, customData: customdata, coordinates};
    }
    return { owner: null, holder: null, customData: null , coordinates };
  }

  async data(coordinates) {
    const { roomData } = await this.room(coordinates);
    return roomData;
  }

  async income(benefactor) {
    const { rows } = await db.query(`SELECT * FROM ${db.tableName('income')} WHERE benefactor = $1`, [String(benefactor)]);
    if (rows.length) {
      const [, ...amounts] = Object.values(rows[0]).map(Number);
      return createBalanceFromAmounts(amounts);
    } else {
      return createBalance();
    }
  }

  async characterIncome(character) {
    return this.income(await this.dungeon.character.playerOf(character));
  }

  async roomIncome(coordinates) {
    return this.income(coordinates);
  }

  async isActive(coordinates, preloadedKeeperRoom) {
    const room = preloadedKeeperRoom || await this.room(coordinates);
    if (room) {
      const dungeon = this.contracts.Dungeon.address.toLowerCase();
      return dungeon === room.holder;
    } else {
      return null;
    }
  }

  async checkForeclosures() {
    if (!events.replaying) {
      const { rows } = await db.query(`
        SELECT coordinates FROM ${db.tableName('keeper')}
          WHERE (owner IN (SELECT player FROM ${db.tableName('character')}
                            WHERE (info->>'taxDueDate')::INTEGER < extract(epoch from now())))
          OR (owner = LOWER('${this.contracts.Dungeon.address}'))`);
      const coordinates = new Set(rows.map(r => r.coordinates));
      const diff = difference(this.lastForeclosedRooms, coordinates);
      if (diff) {
        this.lastForeclosedRooms = coordinates;
        // TODO only one node should send this
        this.sockets.emit('foreclosure-update', diff);
      }
    }
  }

  async foreclosedRooms() {
    if (!this.lastForeclosedRooms) {
      await this.checkForeclosures();
    }
    return Array.from(this.lastForeclosedRooms);
  }

  async balanceOf(character) {
    const player = await this.dungeon.character.playerOf(character);
    if (!player) {
      return [];
    } else {
      const { rows } = await db.query(`SELECT * FROM ${db.tableName('keeper')} WHERE owner = $1`, [player]);
      return rows.map(r => r.coordinates);
    }
  }

  async ownerOf(coordinates) {
    const room = await this.room(coordinates);
    return room && room.owner;
  }

  async ofRoom(coordinates, keeper) {
    const room = keeper || await this.room(coordinates);
    const player = room.owner;
    const characters = await this.dungeon.character.byPlayer(player);
    const character = characters.length ? characters[0].characterId : undefined;
    return {
      player,
      character,
      active: await this.isActive(coordinates, room),
      income: await this.roomIncome(coordinates)
    }
  }
}

module.exports = Keeper;
