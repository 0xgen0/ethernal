const Promise = require('bluebird');
const { events, pastEvents, db } = require('../db/provider');
const { uint256, cleanRoom, copy } = require('../data/utils');
const { locationToCoordinates, isAddress, decodeDirections } = require('./utils');
const DungeonComponent = require('./dungeonComponent.js');

class Character extends DungeonComponent {

  registerEventHandlers() {
    const { Dungeon, Player, UBF, Characters } = this.contracts;
    events.on(Dungeon, 'Enter', this.handleEnter.bind(this), this.prefetchEnter.bind(this));
    events.on(Dungeon, 'Death', this.handleDeath.bind(this));
    events.on(Dungeon, 'Equip', this.handleEquip.bind(this));
    events.on(Dungeon, 'LevelUp', this.handleLevelUp.bind(this));
    events.on(Dungeon, 'Heal', this.handleHeal.bind(this));
    events.on(Player, 'Refill', this.handleRefill.bind(this));
    events.on(Dungeon, 'Resurrect', this.handleResurrect.bind(this));
    events.on(Dungeon, 'RoomTaxPay', this.handleRoomTaxPay.bind(this));
    events.on(UBF, 'Claimed', this.handleClaimedUBF.bind(this));
    events.on(Characters, 'CharacterUpdate', this.handleCharacterUpdate.bind(this));
    events.onBlock(() => this.checkUBF());
  }

  async prefetchEnter(characterId, playerAddress) {
    const { Player } = this.contracts;
    await Player.cached.getPlayerInfo(playerAddress, characterId);
  }

  async handleEnter(characterId, playerAddress, name) {
    console.log('character ' + characterId + ' entered the dungeon');
    const character = characterId.toString();
    const player = playerAddress.toLowerCase();
    const initialInfo = await this.fetchCharacterInfo(character, player, name);
    initialInfo.status = { status: 'exploring', newCharacter: true };
    await this.storeCharacter(initialInfo);
    const characterInfo = await this.info(characterId, initialInfo);
    this.sockets.emit('character-entered', { character, player, characterInfo });
  }

  async handleDeath(characterId) {
    console.log('character ' + characterId + ' died');
    const character = characterId.toString();
    const [info, room] = await Promise.all([
      this.dungeon.character.reloadCharacterStats(character),
      this.room(character),
    ]);
    const { coordinates } = info;
    const { combat } = room;
    console.log('character defeated at ', coordinates);
    let status;
    if (combat) {
      status = await this.dungeon.character.changeStatus(character, {
        status: 'just died',
        combat: copy(combat),
      });
      delete combat.duels[character];
    } else {
      status = await this.dungeon.character.changeStatus(character, { status: 'dead' }, true);
    }
    room.scavenge = { ...room.scavenge, corpses: await this.dungeon.map.scavengeCorpses(room) };
    await this.dungeon.map.storeRooms([room]);
    this.sockets.emit('character-defeated', {
      character,
      coordinates,
      roomUpdates: [cleanRoom(room)],
      statusUpdates: { [character]: status },
    });
  }

  async handleEquip(characterId, gearId, slotType) {
    const character = characterId.toString();
    const [gear, info] = await Promise.all([
      this.dungeon.gear.info(gearId),
      this.reloadPlayerInfo(character),
    ]);
    const slot = ['attack', 'defense', 'accessory-1', 'accessory-2', 'accessory-3'][slotType];
    info[slot + 'Gear'] = gear;
    await this.storeCharacter(info);
    console.log(`character equipped ${slot}`);
    const characterInfo = await this.info(characterId, info);
    this.sockets.emit('equip', { character, gear, slot, characterInfo });
  }

  async handleLevelUp(characterId, newLevel) {
    const character = characterId.toString();
    const info = await this.reloadPlayerInfo(character, await this.reloadCharacterStats(character));
    console.log(`character level up ${newLevel}`);
    const characterInfo = await this.info(characterId, info);
    this.sockets.emit('levelup', { character, newLevel, coordinates: characterInfo.coordinates, characterInfo });
  }

  async handleHeal(characterId, hp) {
    const character = characterId.toString();
    const health = Number(hp);
    const info = await this.reloadPlayerInfo(character, await this.reloadCharacterStats(character));
    console.log(`character ${characterId} healed ${hp} hp`);
    const characterInfo = await this.info(characterId, info);
    this.sockets.emit('heal', { character, health, coordinates: characterInfo.coordinates, characterInfo });
  }

  async handleRefill(playerAddress, newEnergy) {
    const player = playerAddress.toLowerCase();
    const energy = newEnergy.toString();
    console.log(`player ${player} refill, now has ${energy}`);
    const characters = await this.byPlayer(player);
    const updates = characters.map(character => ({ ...character, energy }));
    if (updates.length) {
      await this.storeCharacters(updates);
      const characterInfos = await this.mapAdditionalData(updates);
      characterInfos.forEach(characterInfo =>
        this.sockets.emit('refill', {
          character: characterInfo.character,
          player,
          newEnergy: energy,
          characterInfo,
        }));
    }
  }

  async handleResurrect(deadId, bornId) {
    const dead = Number(deadId);
    const born = Number(bornId);
    const [deadInfo, bornInfo] = await Promise.all([
      this._info(dead),
      this._info(born),
    ]);
    bornInfo.lineage = [dead, ...(deadInfo.lineage || [])];
    console.log(`character ${born} reborn from lineage ${bornInfo.lineage}`);
    await this.storeCharacter(bornInfo);
  }

  async handleRoomTaxPay(player, tax, dueDate) {
    const characters = await this.byPlayer(player);
    const updates = characters.map(character => ({ ...character, taxDueDate: Number(dueDate) }));
    if (updates.length) {
      await this.storeCharacters(updates);
      const [characterInfos] = await Promise.all([
        this.mapAdditionalData(updates),
        this.dungeon.keeper.checkForeclosures(),
      ]);
      this.sockets.emit('update', { characterInfos });
    }
  }

  async handleCharacterUpdate(id, owner, data) {
    const character = Number(id);
    await this.reloadCharacterStats(character, data);
  }

  handleClaimedUBF(player, amount, slot) {
    const characters = this.byPlayer(player.toLowerCase());
    amount = amount.toString();
    slot = slot.toString();
    const characterInfo = characters.length ? this.info(characters[0]) : null;
    this.sockets.emit('claimed-ubf', { player, amount, slot, characterInfo });
  }

  // TODO mutex multinode
  async checkUBF() {
    const { UBF } = this.contracts;
    let { slot } = await UBF.cached.getInfo(UBF.address);
    if (slot) {
      slot = Number(slot);
      if (!this.lastSlot) {
        this.lastSlot = slot;
      }
      if (this.lastSlot !== slot) {
        this.lastSlot = slot;
        this.sockets.emit('ubf-available', {slot});
      }
    }
  }

  async storeSchema() {
    return db.tx(t => {
      t.query(`
        CREATE TABLE IF NOT EXISTS ${db.tableName('character')} (
            id numeric PRIMARY KEY,
            player varchar(100),
            info jsonb
        )
      `);
    });
  }

  async storeCharacters(characters) {
    return db.tx(t => {
      characters
        .map(character => this.toRow(character))
        .forEach(row => {
          // console.log('character storage', row[0]);
          t.query(
            `INSERT INTO ${db.tableName('character')} (id, player, info) VALUES ($1,$2,$3)
                ON CONFLICT (id) DO UPDATE
                SET player = excluded.player,
                    info = excluded.info`,
            row,
          );
      });
    });
  }

  async storeCharacter(info) {
    return this.storeCharacters([info]);
  }

  async fetchCharacterName(character) {
    const events = await pastEvents('Dungeon', 'Enter', [uint256(Number(character))]);
    if (events.length === 0) {
      return 'unknown';
    } else {
      return events[events.length - 1].args.name;
    }
  }

  async reloadPlayerInfo(character, preloaded = null) {
    const { Player } = this.contracts;
    const info = preloaded || await this._info(character);
    const { energy } = await Player.cached.getPlayerInfo(info.player, character);
    info.energy = energy.toString();
    await this.storeCharacter(info);
    return info;
  }

  async reloadCharacterStats(character, data) {
    const { Dungeon } = this.contracts;
    const characterInfo = await Dungeon.cached.getCharacterInfo(character);
    const stats = await this.decodeCharacterData(data || characterInfo.data);
    stats.levelXp = stats.level === 0 ? 0 : (await this.levelInfo(stats.level)).xpRequired;
    const coordinates = locationToCoordinates(characterInfo.location);
    const [nextLevel, attackGear, defenseGear, info] = await Promise.all([
      this.levelInfo(stats.level + 1),
      this.dungeon.gear.info(characterInfo.attackGear),
      this.dungeon.gear.info(characterInfo.defenseGear),
      this._info(character),
    ]);
    const newInfo = {
      character,
      characterId: character,
      player: characterInfo.player.toLowerCase(),
      lineage: [],
      ...info,
      stats,
      coordinates,
      nextLevel,
      attackGear,
      defenseGear,
      floors: Number(characterInfo.floors),
    };
    await this.storeCharacter(newInfo);
    return newInfo;
  }

  transitions = {
    'not in dungeon': ['exploring'],
    'exploring': ['blocked by monster', 'exploring'],
    'blocked by monster': ['attacking monster', 'just died', 'exploring'],
    'attacking monster': ['claiming rewards', 'exploring', 'just died', 'attacking monster'],
    'claiming rewards': ['exploring', 'blocked by monster'],
    'just died': ['dead'],
    'dead': [],
  };

  async status(character) {
    const { status } = await this._info(character);
    return status;
  }

  async changeStatus(character, status, force = false) {
    const info = await this._info(character);
    const current = info.status && info.status.status;
    const next = status.status;
    if (force || !current || new Set(this.transitions[current]).has(next)) {
      info.status = status;
      await this.storeCharacter(info);
      return info.status;
    } else {
      console.log('invalid transition rejected', { current, next });
      return info.status;
    }
  }

  async initialCharacterStatus(info) {
    // @TODO: better not in dungeon check
    if (!info || info.characterId === 0) return { status: 'not in dungeon' };
    if (info.stats.health === 0) return { status: 'dead' };
    const room = await this.dungeon.map._room(info.coordinates);
    if (room.hasMonster) return { status: 'blocked by monster' };
    return { status: 'exploring' };
  }

  // TODO simplify, reuse refresh
  async fetchCharacterInfo(character, player, name) {
    const { Player, Dungeon } = this.contracts;
    const characterInfo = await Dungeon.cached.getCharacterInfo(character);
    const [initialInfo, playerInfo, characterName, gear, stats, attackGear, defenseGear] = await Promise.all([
      this._info(character),
      Player.cached.getPlayerInfo(player, character),
      name || this.fetchCharacterName(character),
      this.dungeon.gear.balanceOf(character),
      this.decodeCharacterData(characterInfo.data),
      this.dungeon.gear.info(characterInfo.attackGear),
      this.dungeon.gear.info(characterInfo.defenseGear),
    ]);
    stats.levelXp = stats.level === 0 ? 0 : (await this.levelInfo(stats.level)).xpRequired;
    const info = {
      ...initialInfo,
      character,
      player,
      energy: playerInfo.energy.toString(),
      coordinates: locationToCoordinates(characterInfo.location),
      characterId: character,
      characterName,
      stats,
      attackGear,
      defenseGear,
      taxDueDate: Number(characterInfo.taxDueDate),
      floors: Number(characterInfo.floors),
      gear,
    };
    const [status, nextLevel] = await Promise.all([
      this.initialCharacterStatus(info),
      this.levelInfo(stats.level + 1),
    ]);
    return { ...info, status, nextLevel };
  }

  async reorgCharacter(character, status = false) {
    await this.reloadPlayerInfo(character);
    const info = await this.reloadCharacterStats(character);
    if (status) {
      info.status = await this.initialCharacterStatus(info);
      await this.storeCharacter(info);
    }
    const update = { characterInfos: [await this.info(character, info)] };
    if (status) {
      update.statusUpdates = { [character]: info.status };
    }
    this.sockets.emit('update', update)
    return info;
  }

  toRow(info) {
    const { characterId, player } = info;
    return [characterId.toString(), player && player.toString(), info];
  }

  fromRow(row) {
    const { info, owner } = row;
    return { ...info, owner };
  }

  async room(character) {
    return this.dungeon.map.roomAt(await this.coordinates(character));
  }

  async coordinates(character) {
    const info = await this._info(character);
    return info && info.coordinates;
  }

  isDead({status}) {
    return ['just died', 'dead'].includes(status)
  }

  async count() {
    const { rows } = await db.query(`SELECT count(id) FROM ${db.tableName('character')}`);
    return Number(rows[0].count);
  }

  async ids() {
    const count = await this.count();
    return [...Array(count + 1).keys()].slice(1).map(String);
  }

  async players() {
    const { rows } = await db.query(`SELECT distinct(player) FROM ${db.tableName('character')}`);
    return rows.map(r => r.player);
  }

  async _info(character) {
    const { rows } = await db.query(`SELECT * FROM ${db.tableName('character')} WHERE id = $1`, [character]);
    return rows.length ? this.fromRow(rows[0]) : { characterId: character };
  }

  async info(character, prefetched) {
    character = Number(character);
    const info = prefetched || await this._info(character);
    const [balance, gear, attackGear, defenseGear] = await Promise.all([
      this.dungeon.elements.balanceOf(character),
      this.dungeon.gear.balanceOf(character),
      info.attackGear && this.dungeon.gear.info(info.attackGear.id),
      info.defenseGear && this.dungeon.gear.info(info.defenseGear.id),
    ]);
    return {
      character,
      status: { status: 'not in dungeon' },
      ...info,
      gear,
      attackGear,
      defenseGear,
      ...balance,
    };
  }

  async mapAdditionalData(_infos) {
    return Promise.all(_infos.map(info => this.info(info.characterId, info)));
  }

  async _infos(ids = [], filter = '') {
    if (!ids || ids.length === 0) {
      return [];
    }
    if (filter.length) {
      filter = ' AND ' + filter;
    }
    const { rows } = await db.query(`SELECT * FROM ${db.tableName('character')} WHERE id = ANY ($1) ${filter}`, [ids.map(Number)]);
    return rows.map(r => this.fromRow(r));
  }

  async infos(ids, filter = '') {
    return this.mapAdditionalData(await this._infos(ids, filter));
  }

  async moves(character) {
    const { rows } = await db.query(
      `SELECT block, event->'args' as move FROM ${db.tableName('event')}
        WHERE event->>'name' = 'CharacterMoved' AND event->'args'->>0 = $1`,
      [character]);
    return rows.map(({ block, move }) => {
      const [, from, to, mode, path] = move;
      return {
        block: Number(block),
        from: locationToCoordinates(from),
        to: locationToCoordinates(to),
        mode: Number(mode),
        path: decodeDirections(path),
      };
    });
  }

  async parent(character) {
    const { lineage } = await this._info(character) || {};
    const [id] = lineage || [];
    return id;
  }

  async playerOf(character) {
    const { player } = await this._info(character) || {};
    return player;
  }

  async byPlayer(address) {
    if (!address) {
      return [];
    }
    const { rows } = await db.query(`SELECT * FROM ${db.tableName('character')} WHERE player = $1`, [address.toLowerCase()]);
    return rows.map(r => this.fromRow(r))
      .sort((a, b) => b.characterId - a.characterId);
  }

  async vault(characterOrAddress) {
    let address;
    if (isAddress(characterOrAddress)) {
      address = characterOrAddress;
    } else {
      address = await this.playerOf(characterOrAddress);
    }
    const [balance, gear] = await Promise.all([
      this.dungeon.elements.balanceOf(address),
      this.dungeon.gear.balanceOf(address),
    ]);
    return { gear, balance };
  }

  async hallOfFame() {
    const { rows } = await db.query(`
      SELECT * FROM ${db.tableName('character')}
      WHERE (info->'stats'->>'health')::INTEGER > 0
      ORDER BY (info->'stats'->>'xp')::INTEGER DESC
    `);
    return rows.map((r, i) => ({ ...this.fromRow(r), hallOfFame: i + 1 }));
  }

  async weeklyLeaderboard() {
    //TODO optimize scan (sort by the last change block)
    const { rows } = await db.query(`
      SELECT * FROM ${db.tableName('character')}
      WHERE (info->'stats'->>'health')::INTEGER > 0
    `);
    return rows
      .map(r => this.fromRow(r))
      .map(info => ({ ...info, weeklyXp: this.dungeon.leaderboard.weeklyXp(info) }))
      .sort((a, b) => b.weeklyXp - a.weeklyXp)
      .map((info, i) => ({ ...info, weeklyRank: i + 1}));
  }

  async levelInfo(level) {
    const [
      xpRequired,
      coinsRequired,
      hpIncrease,
    ] = await this.contracts.pureCall('toLevelUp(uint8):(uint16,uint256,uint8)', [level]).then(res => res.map(Number));
    return { xpRequired, coinsRequired, hpIncrease, level };
  }

  async healCost(_, hp) {
    const [cost] = await this.contracts.pureCall('hpCost(uint16):(uint256)', [hp]);
    return Number(cost);
  }

  async decodeCharacterData(data) {
    const decoded = await this.contracts.pureCall('decodeCharacterData(uint256):(uint16,uint16,uint16,uint32,uint8)', [
      data.toString(),
    ]);
    const [level, health, fullHealth, xp, characterClass] = decoded.map(Number);
    return { level, health, fullHealth, xp, characterClass };
  }
}

module.exports = Character;
