const Promise = require('bluebird');
const { events, db } = require('../db/provider');
const { cleanRoom, createBalance, createBalanceFromAmounts, balanceToAmounts, isZeroBalance } = require('../data/utils');
const { locationToCoordinates, isLocation, isBounty, bountyToLocation } = require('./utils');
const DungeonComponent = require('./dungeonComponent.js');

class Elements extends DungeonComponent {

  registerEventHandlers() {
    const { Elements } = this.dungeon.contracts;
    events.on(Elements, 'TransferSingle', this.handleTransfer.bind(this));
    events.on(Elements, 'TransferBatch', this.handleTransferBatch.bind(this));
    events.on(Elements, 'SubTransferSingle', this.handleSubTransfer.bind(this));
    events.on(Elements, 'SubTransferBatch', this.handleSubTransferBatch.bind(this));
  }

  async storeSchema() {
    return db.tx(t => {
      t.query(`
        CREATE TABLE IF NOT EXISTS ${db.tableName('elements')} (
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
    });
  }

  async storeBalances(balances) {
    const table = db.tableName('elements');
    return db.tx(t => {
      balances.forEach(([benefactor, balance]) => {
        t.query(
          `INSERT INTO ${table} VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
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

  async handleTransfer(fromAddress, toAddress, id, amount) {
    const from = fromAddress.toLowerCase();
    const to = toAddress.toLowerCase();
    const event = createBalance({ from, to });
    const [fromBalance, toBalance] = await Promise.all([
      this.balanceOf(from),
      this.balanceOf(to),
    ]);
    const type = id.toNumber();
    const number = amount.toNumber();
    if (type === 6) {
      event.coins = number;
      fromBalance.coins -= number;
      toBalance.coins += number;
    } else if (type === 7) {
      event.keys = number;
      fromBalance.keys -= number;
      toBalance.keys += number;
    } else if (type === 8) {
      event.fragments = number;
      fromBalance.fragments -= number;
      toBalance.fragments += number;
    } else {
      event.elements = Array(5);
      event.elements[type - 1] = number;
      fromBalance.elements[type - 1] -= number;
      toBalance.elements[type - 1] += number;
    }
    await this.storeBalances([
      [from, fromBalance],
      [to, toBalance],
    ]);
  }

  handleTransferBatch() {
    console.log('elements transfer batch handler not implemented');
  }

  async handleSubTransfer(fromId, toId, id, amount) {
    const from = fromId.toString();
    const to = toId.toString();
    const event = createBalance({ from, to });
    const [fromBalance, toBalance] = await Promise.all([
      this.balanceOf(from),
      this.balanceOf(to),
    ]);
    const type = id.toNumber();
    const number = amount.toNumber();
    if (type === 6) {
      event.coins = number;
      fromBalance.coins -= number;
      toBalance.coins += number;
    } else if (type === 7) {
      event.keys = number;
      fromBalance.keys -= number;
      toBalance.keys += number;
    } else if (type === 8) {
      event.fragments = number;
      fromBalance.fragments -= number;
      toBalance.fragments += number;
    } else {
      event.elements = Array(5);
      event.elements[type - 1] = number;
      fromBalance.elements[type - 1] -= number;
      toBalance.elements[type - 1] += number;
    }
    await this.storeBalances([
      [from, fromBalance],
      [to, toBalance],
    ]);
    this.sockets.emit('transfer', event);
    const characterInfos = [];
    const roomUpdates = [];
    if (from !== '0') {
      if (isLocation(from)) {
        const room = await this.dungeon.room(locationToCoordinates(from));
        room.scavenge = { ...room.scavenge, balance: fromBalance };
        await this.dungeon.map.storeRooms([room]);
        roomUpdates.push(cleanRoom(room));
      } else if (isBounty(from)) {
        const room = await this.dungeon.room(locationToCoordinates(bountyToLocation(from)));
        room.bounty = { ...room.bounty, ...fromBalance };
        if (isZeroBalance(fromBalance)) {
          room.bounty.sponsors = [];
        }
        await this.dungeon.map.storeRooms([room]);
        roomUpdates.push(cleanRoom(room));
        const characterInfo = await this.dungeon.character.info(to);
        this.sockets.emit('bounty-claimed', { character: to, coordinates: room.coordinates, characterInfo, room: cleanRoom(room), ...event });
      } else {
        const characterInfo = await this.dungeon.character.info(from);
        characterInfos.push(characterInfo);
        if (this.dungeon.character.isDead(characterInfo.status)) {
          const room = await this.dungeon.character.room(from);
          const { coordinates, scavenge } = room;
          const character = to;
          room.scavenge = { ...scavenge, corpses: await this.dungeon.map.scavengeCorpses(room) };
          await this.dungeon.map.storeRooms([room]);
          roomUpdates.push(cleanRoom(room));
          this.sockets.emit('scavenge', { ...event, character, from, coordinates });
        }
      }
    }
    if (to !== '0') {
      if (isLocation(to)) {
        const room = await this.dungeon.room(locationToCoordinates(to));
        const balance = toBalance;
        room.scavenge = {...room.scavenge, balance};
        await this.dungeon.map.storeRooms([room]);
        roomUpdates.push(cleanRoom(room));
        const characterInfo = await this.dungeon.character.info(from);
        this.sockets.emit('dropped', { character: from, coordinates: room.coordinates, characterInfo, balance, ...event });
      } else if (isBounty(to)) {
        const room = await this.dungeon.room(locationToCoordinates(bountyToLocation(to)));
        room.bounty = { ...room.bounty, ...toBalance };
        room.bounty.sponsors = [...new Set([...(room.bounty.sponsors || []), from])];
        await this.dungeon.map.storeRooms([room]);
        roomUpdates.push(cleanRoom(room));
        const characterInfo = await this.dungeon.character.info(from);
        this.sockets.emit('bounty-added', { character: from, coordinates: room.coordinates, characterInfo, room: cleanRoom(room), ...event });
      } else {
        const characterInfo = await this.dungeon.character.info(to);
        characterInfos.push(characterInfo);
      }
    }
    this.sockets.emit('update', { characterInfos, roomUpdates });
  }

  handleSubTransferBatch() {
    console.log('elements sub transfer batch handler not implemented');
  }

  async balanceOf(benefactor) {
    const { rows } = await db.query(`SELECT * FROM ${db.tableName('elements')} WHERE benefactor = $1`, [String(benefactor)]);
    if (rows.length) {
      const [, ...amounts] = Object.values(rows[0]).map(Number);
      return createBalanceFromAmounts(amounts);
    } else {
      return createBalance();
    }
  }

  async balances(benefactors) {
    const { rows } = await db.query(`SELECT * FROM ${db.tableName('elements')} WHERE benefactor in ($1)`, [benefactors.map(v => v.toString())]);
    return rows.reduce((res, [benefactor, ...amounts]) => ({...res, [benefactor]: createBalanceFromAmounts(amounts)}), {});
  }
}

module.exports = Elements;
