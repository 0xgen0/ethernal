const Promise = require('bluebird');
const retry = require('p-retry');
const { events, pastEvents } = require('../db/provider');
const { uint256, justValues } = require('../data/utils');
const { locationToCoordinates, isAddress } = require('./utils');
const DungeonComponent = require('./dungeonComponent.js');
const Progress = require('../utils/progress.js');

const concurrency = process.env.CONCURRENCY || 20;
const retryConfig = { retries: 5 };

class Character extends DungeonComponent {
  data = {};
  lineage = {};
  _status = {};

  registerEventHandlers() {
    const { Dungeon, Player, UBF } = this.contracts;
    events.on(Dungeon, 'Enter', this.handleEnter.bind(this));
    events.on(Dungeon, 'Equip', this.handleEquip.bind(this));
    events.on(Dungeon, 'LevelUp', this.handleLevelUp.bind(this));
    events.on(Dungeon, 'Heal', this.handleHeal.bind(this));
    events.on(Player, 'Refill', this.handleRefill.bind(this));
    events.on(Dungeon, 'Resurrect', this.handleResurrect.bind(this));
    events.on(Dungeon, 'RoomTaxPay', this.handleRoomTaxPay.bind(this));
    events.on(UBF, 'Claimed', this.handleClaimedUBF.bind(this));
    events.onBlock(() => this.checkUBF());
  }

  async fetchAll(fromBlock = 0, toBlock = 'latest', snapshot) {
    if (snapshot) {
      console.log('getting characters entered after snapshot');
      this.data = {...this.data, ...snapshot.character.data};
    } else {
      console.log('getting all characters');
    }
    const characters = justValues(await pastEvents('Dungeon', 'Enter', [], fromBlock, toBlock));
    console.log(`fetching info about ${characters.length} characters`);
    const progress = new Progress('characters fetched', 10);
    await Promise.map(
      characters,
      async ({ characterId, player, name }) => {
        const character = characterId.toString();
        await retry(() => this.fetchCharacterInfo(character, player.toLowerCase(), name, toBlock), retryConfig);
        await this.dungeon.leaderboard.storeStats(this.data[character]);
        progress.tick();
      },
      { concurrency },
    );
    const rebirths = await pastEvents('Dungeon', 'Resurrect', [], fromBlock, toBlock);
    this.lineage = rebirths.reduce((lineage, { args: { deadCharacterId, newCharacterId } }) => {
      const born = Number(newCharacterId);
      const dead = Number(deadCharacterId);
      return {
        ...lineage,
        [born]: [dead, ...(lineage[dead] || [])],
      };
    }, snapshot ? snapshot.character.lineage : {});
    justValues(await pastEvents('Dungeon', 'RoomTaxPay', [], fromBlock, toBlock))
      .forEach(values => this.handleRoomTaxPay(...values));
  }

  async handleEnter(characterId, playerAddress, name) {
    const character = characterId.toString();
    const player = playerAddress.toLowerCase();
    await this.fetchCharacterInfo(character, player, name);
    console.log('character ' + this.info(character).characterId + ' entered the dungeon');
    this.changeStatus(character, { status: 'exploring', newCharacter: true });
    this.sockets.emit('character-entered', { character, player, characterInfo: this.info(character) });
  }

  handleEquip(characterId, gearId, slotType) {
    const character = characterId.toString();
    if (this.data[character]) {
      const gear = this.dungeon.gear.info(gearId);
      const slot = ['attack', 'defense', 'accessory-1', 'accessory-2', 'accessory-3'][slotType];
      this.data[character][slot + 'Gear'] = gear;
      console.log(`character equipped ${slot}`);
      this.sockets.emit('equip', { character, gear, slot, characterInfo: this.info(character) });
    }
  }

  async handleLevelUp(characterId, newLevel) {
    const character = characterId.toString();
    await this.reloadCharacterStats(character);
    console.log(`character level up ${newLevel}`);
    const characterInfo = this.info(character);
    this.sockets.emit('levelup', { character, newLevel, coordinates: characterInfo.coordinates, characterInfo });
  }

  async handleHeal(characterId, hp) {
    const character = characterId.toString();
    const health = Number(hp);
    await this.reloadCharacterStats(character);
    console.log(`character ${characterId} healed ${hp} hp`);
    const characterInfo = this.info(character);
    this.sockets.emit('heal', { character, health, coordinates: characterInfo.coordinates, characterInfo });
  }

  async handleRefill(playerAddress, newEnergy) {
    Object.values(this.data)
      .filter(({player}) => player === playerAddress.toLowerCase())
      .forEach(data => {
        const character = data.characterId;
        data.energy = newEnergy.toString();
        console.log(`character ${character} refill, now has ${newEnergy}`);
        this.sockets.emit('refill', {
          character,
          player: playerAddress.toLowerCase(),
          newEnergy: newEnergy.toString,
          characterInfo: this.info(character),
        });
      });
  }

  handleResurrect(deadId, bornId) {
    const dead = Number(deadId);
    const born = Number(bornId);
    this.lineage[born] = [dead, ...(this.lineage[dead] || [])];
    console.log(`character ${born} reborn from lineage ${this.lineage[born]}`);
  }

  handleRoomTaxPay(player, tax, dueDate) {
    const updates = this.byPlayer(player.toLowerCase()).map(({characterId}) => {
      this.data[characterId].taxDueDate = Number(dueDate);
      return this.info(characterId);
    });
    if (updates.length) {
      this.sockets.emit('update', { characterInfos: updates });
    }
  }

  handleClaimedUBF(player, amount, slot) {
    const characters = this.byPlayer(player.toLowerCase());
    amount = amount.toString();
    slot = slot.toString();
    const characterInfo = characters.length ? this.info(characters[0]) : null;
    this.sockets.emit('claimed-ubf', { player, amount, slot, characterInfo });
  }

  async checkUBF() {
    const { UBF } = this.contracts;
    let { slot } = await UBF.getInfo(UBF.address);
    slot = Number(slot);
    if (!this.lastSlot) {
      this.lastSlot = slot;
    }
    if (this.lastSlot !== slot) {
      this.lastSlot = slot;
      this.sockets.emit('ubf-available', { slot });
    }
  }

  async fetchCharacterName(character) {
    const events = await pastEvents('Dungeon', 'Enter', [uint256(Number(character))]);
    if (events.length === 0) {
      return 'unknown';
    } else {
      return events[events.length - 1].args.name;
    }
  }

  async reloadCharacterInfo(character) {
    const { player } = this.info(character);
    await this.fetchCharacterInfo(character, player);
    return this.info(character);
  }

  async reloadPlayerInfo(character) {
    const { Player } = this.contracts;
    const player = this.data[character].player;
    const { energy } = await Player.getPlayerInfo(player, character);
    this.data[character].energy = energy.toString();
  }

  async reloadCharacterStats(character) {
    const { Dungeon } = this.contracts;
    const characterInfo = await Dungeon.getCharacterInfo(character);
    const stats = await this.decodeCharacterData(characterInfo.data);
    stats.levelXp = stats.level === 0 ? 0 : (await this.levelInfo(stats.level)).xpRequired;
    const coordinates = locationToCoordinates(characterInfo.location);
    if (!events.defer && coordinates !== this.data[character].location) {
      console.log('character location desync', this.data[character].location, coordinates);
      // TODO fix properly by resyncing character related events
      this.dungeon.debug.desync.push({
        date: new Date().toISOString(),
        character,
        old: this.data[character].location,
        new: coordinates,
      });
    }
    this.data[character] = {
      ...this.data[character],
      stats,
      nextLevel: await this.levelInfo(stats.level + 1),
      attackGear: this.dungeon.gear.info(characterInfo.attackGear),
      defenseGear: this.dungeon.gear.info(characterInfo.defenseGear),
      floors: Number(characterInfo.floors),
    };
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

  status(character) {
    if (!this._status[character]) {
      this._status[character] = this.initialCharacterStatus(character);
    }
    return this._status[character];
  }

  changeStatus(character, status) {
    const current = this._status[character] && this._status[character].status;
    const next = status.status;
    if (!current || new Set(this.transitions[current]).has(next)) {
      this._status[character] = status;
      return this._status[character];
    } else {
      console.log('invalid transition rejected', { current, next });
      // TODO always return some status (behaviour needs to be checked on fe)
      return null;
    }
  }

  initialCharacterStatus(character) {
    const info = this.data[character];
    // @TODO: better not in dungeon check
    if (!info || info.characterId === 0) return { status: 'not in dungeon' };
    if (info.stats.health === 0) return { status: 'dead' };
    const room = this.room(character);
    if (room.hasMonster) return { status: 'blocked by monster' };
    return { status: 'exploring' };
  }

  async fetchCharacterInfo(character, player, name, blockTag = 'latest') {
    const { Player, Dungeon } = this.contracts;
    const [playerInfo, characterInfo, characterName, gear] = await Promise.all([
      Player.getPlayerInfo(player, character, { blockTag }),
      Dungeon.getCharacterInfo(character, { blockTag }),
      name || this.fetchCharacterName(character),
      this.dungeon.gear.balanceOf(character),
    ]);
    const stats = await this.decodeCharacterData(characterInfo.data);
    stats.levelXp = stats.level === 0 ? 0 : (await this.levelInfo(stats.level)).xpRequired;
    const info = {
      character,
      player,
      energy: playerInfo.energy.toString(),
      location: locationToCoordinates(characterInfo.location),
      characterId: character,
      characterName,
      stats,
      nextLevel: await this.levelInfo(stats.level + 1),
      attackGear: this.dungeon.gear.info(characterInfo.attackGear),
      defenseGear: this.dungeon.gear.info(characterInfo.defenseGear),
      taxDueDate: Number(characterInfo.taxDueDate),
      floors: Number(characterInfo.floors),
      gear,
    };
    this.data[character] = info;
    return info;
  }

  room(character) {
    return this.dungeon.map.roomAt(this.coordinates(character));
  }

  coordinates(character) {
    const moves = this.dungeon.map.moves[character];
    const byMoves = moves && moves[moves.length - 1].to;
    const byInfo = this.data[character] && this.data[character].location;
    // TODO are moves coordinates ever needed?
    return byMoves || byInfo;
  }

  info(character) {
    const info = this.data[character] || {};
    return {
      character,
      coordinates: this.coordinates(character),
      status: this.status(character),
      ...info,
      gear: this.dungeon.gear.balanceOf(character),
      attackGear: info.attackGear && this.dungeon.gear.info(info.attackGear.id),
      defenseGear: info.defenseGear && this.dungeon.gear.info(info.defenseGear.id),
      lineage: this.lineage[character] || [],
      ...this.dungeon.elements.balanceOf(character),
    };
  }

  parent(character) {
    const [id] = this.lineage[character] || [];
    return id;
  }

  playerOf(character) {
    const info = this.data[character] || {};
    return info.player;
  }

  byPlayer(address) {
    return Object.values(this.data)
      .filter(({player}) => player.toLowerCase() === address.toLowerCase())
      .sort((a, b) => b.characterId - a.characterId);
  }

  vault(characterOrAddress) {
    let { player: address } = this.dungeon.characters[characterOrAddress] || {};
    if (isAddress(characterOrAddress)) {
      address = characterOrAddress;
    }
    return {
      gear: this.dungeon.gear.balanceOf(address),
      balance: this.dungeon.elements.balanceOf(address),
    };
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
