const moment = require('moment');
const { events, pastEvents } = require('../db/provider');
const { cleanRoom, justValues, toAddress, mapValues, createBalanceFromAmounts, difference } = require('../data/utils');
const { bn, locationToCoordinates, coordinatesToLocation } = require('./utils');
const DungeonComponent = require('./dungeonComponent.js');
const { Monster, MiniBoss, specificMonsters } = require('./abilities/monster.js')
const Chest = require('./abilities/chest.js')
const NameRoom = require('./abilities/nameRoom.js')

class Keeper extends DungeonComponent {
  data = {};
  balances = {};
  benefactor = {};
  income = {
    rooms: {},
    benefactors: {}
  };
  abilities = {};

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
    const { Rooms, Dungeon } = this.dungeon.contracts;
    events.on(Rooms, 'DataUpdate', this.handleDataUpdate.bind(this));
    events.on(Rooms, 'Transfer', this.handleTransfer.bind(this));
    events.on(Rooms, 'SubTransfer', this.handleSubTransfer.bind(this));
    events.on(Dungeon, 'RoomIncome', this.handleRoomIncome.bind(this));
    events.on(Dungeon, 'RoomName', this.handleRoomName.bind(this));
    events.onBlock(this.handleBlock.bind(this));
  }

  async fetchAll(fromBlock = 0, toBlock = 'latest', snapshot) {
    if (snapshot) {
      console.log('restoring keeper from snapshot');
      const { data, balances, benefactor, income } = snapshot.keeper;
      this.data = data;
      this.balances = mapValues(balances, rooms => new Set(rooms));
      this.benefactor = benefactor;
      this.income = income;
    }
    console.log('getting keeper data');
    justValues(await pastEvents('Rooms', 'DataUpdate', [], fromBlock, toBlock))
      .forEach(({ id, data }) => this.handleDataUpdate(id, data, null, true));
    console.log('getting room transactions');
    justValues(await pastEvents('Rooms', 'Transfer', [], fromBlock, toBlock, 80000, true))
      .forEach(({ from, to, id }) => this.handleTransfer(from, to, id));
    console.log('getting room sub-transactions');
    justValues(await pastEvents('Rooms', 'SubTransfer', [], fromBlock, toBlock, 80000, true))
      .forEach(({ from, to, id }) => this.handleSubTransfer(from, to, id));
    console.log('getting room income');
    justValues(await pastEvents('Dungeon', 'RoomIncome', [], fromBlock, toBlock, 40000, true))
      .forEach(values => this.handleRoomIncome(...values));
    console.log('getting custom room names');
    justValues(await pastEvents('Dungeon', 'RoomName', [], fromBlock, toBlock))
      .forEach(values => this.handleRoomName(...values));
    mapValues(this.data, (data, location) => this.applyDataUpdate(locationToCoordinates(location), data));
    mapValues(this.dungeon.rooms, ({coordinates}) => {
      this.dungeon.rooms[coordinates].keeper = this.ofRoom(coordinates);
    });
    this.initialized = true;
    console.log('rooms from ' + Object.keys(this.balances).length + ' keepers loaded');
  }

  handleBlock({ number }) {
    if (number % 30 === 0) {
      this.checkForeclosures();
    }
  }

  handleDataUpdate(id, data, event, init = false) {
    id = id.toString();
    const current = this.data[id];
    const next = data.toString();
    this.data[id] = next;
    if (!init) {
      const coordinates = locationToCoordinates(id);
      console.log(`room ${coordinates} changed ${current} -> ${next}`);
      this.applyDataUpdate(coordinates, next, current);
    }
  }

  handleTransfer(fromAddress, toAddress, id) {
    id = id.toString();
    const from = fromAddress.toLowerCase();
    const to = toAddress.toLowerCase();
    if (this.balances[from]) {
      this.balances[from].delete(id);
    }
    if (!this.balances[to]) {
      this.balances[to] = new Set();
    }
    this.balances[to].add(id);
    const coordinates = locationToCoordinates(id);
    const room = this.dungeon.rooms[coordinates];
    room.keeper = this.ofRoom(coordinates);
    const update = cleanRoom(room);
    if (update) {
      this.sockets.emit('update', {roomUpdates: [update]});
    }
  }

  handleSubTransfer(fromId, toId, id) {
    id = id.toString();
    const from = fromId.toString();
    const to = toId.toString();
    const coordinates = locationToCoordinates(id);
    if (this.isActive(coordinates)) {
      if (this.balances[from]) {
        this.balances[from].delete(id);
      }
      if (!this.balances[to]) {
        this.balances[to] = new Set();
      }
      this.balances[to].add(id);
      this.benefactor[id] = to;
      this.sockets.emit('transfer', {from: toAddress(from), to: toAddress(to), room: coordinates});
      const room = this.dungeon.rooms[coordinates];
      room.keeper = this.ofRoom(coordinates);
      const update = cleanRoom(room);
      if (update) {
        this.sockets.emit('update', {roomUpdates: [update]});
      }
    }
  }

  handleRoomIncome(location, benefactor, id, amount) {
    location = location.toString();
    benefactor = benefactor.toLowerCase();
    amount = Number(amount);
    const type = Number(id) - 1;
    const { rooms, benefactors } = this.income;
    const amounts = [0,0,0,0,0,0,0,0];
    amounts[type] += amount;
    if (!rooms[location]) {
      rooms[location] = [...amounts];
    } else {
      rooms[location][type] += amount;
    }
    if (!benefactors[benefactor]) {
      benefactors[benefactor] = [...amounts];
    } else {
      benefactors[benefactor][type] += amount;
    }
    const coordinates = locationToCoordinates(location);
    const room = this.dungeon.rooms[coordinates];
    room.keeper = this.ofRoom(coordinates);
    const income = createBalanceFromAmounts(amounts);
    this.sockets.emit('income', {
      benefactor,
      coordinates,
      income,
      total: createBalanceFromAmounts(this.income.benefactors[benefactor]),
    });
  }

  handleRoomName(location, name, characterId) {
    const character = characterId.toString();
    const characterInfo = this.dungeon.character.info(characterId);
    const coordinates = locationToCoordinates(location);
    const room = this.dungeon.rooms[coordinates];
    room.customName = name;
    this.sockets.emit('room-name', { coordinates: room.coordinates, character, characterInfo, room: cleanRoom(room) });
    this.sockets.emit('update', { roomUpdates: [cleanRoom(room)] });
  }

  applyDataUpdate(coordinates, data, previous) {
    Object.values(this.abilities)
      .forEach(ability => ability.applyRoomDataUpdate(coordinates, data, previous));
  }

  async useAbility(character, { coordinates, ability }) {
    const { player } = this.dungeon.characters[character];
    if (player !== this.ownerOf(coordinates)) {
      throw new Error('not room keeper');
    }
    if (!this.isActive(coordinates)) {
      throw new Error('room not active');
    }
    ability = this.abilities[ability];
    await ability.use(character, coordinates);
    this.sockets.emit('ability-used', { character, coordinates, ability })
    return true;
  }

  room(coordinates) {
    return this.data[coordinatesToLocation(coordinates)];
  }

  characterIncome(character) {
    const player = this.dungeon.character.playerOf(character);
    return createBalanceFromAmounts(this.income.benefactors[player]);
  }

  roomIncome(coordinates) {
    const location = coordinatesToLocation(coordinates);
    return createBalanceFromAmounts(this.income.rooms[location]);
  }

  isActive(coordinates) {
    const dungeon = this.contracts.Dungeon.address.toLowerCase();
    const location = coordinatesToLocation(coordinates);
    return this.balances[dungeon].has(location);
  }

  checkForeclosures() {
    if (this.initialized) {
      const abandoned = [
        ...(this.balances[0] || []),
        ...(this.balances[bn(this.contracts.Dungeon.address).toString()] || []),
      ].map(locationToCoordinates);
      const foreclosed = new Set(Object.values(this.dungeon.characters)
        .filter(({ taxDueDate }) => moment.unix(taxDueDate).isBefore(moment()))
        .map(({ characterId }) => this.balanceOf(characterId))
        .flat());
      const rooms = new Set([...abandoned, ...foreclosed]);
      const diff = difference(this.lastForeclosedRooms, rooms);
      if (diff) {
        this.lastForeclosedRooms = rooms;
        this.sockets.emit('foreclosure-update', diff);
      }
      return diff;
    }
  }

  get foreclosedRooms() {
    if (!this.lastForeclosedRooms) {
      this.checkForeclosures();
    }
    return Array.from(this.lastForeclosedRooms);
  }

  balanceOf(character) {
    const player = this.dungeon.character.playerOf(character);
    if (!player) {
      return [];
    } else {
      return Array.from(this.balances[bn(player).toString()] || this.balances[player] || [])
        .map(locationToCoordinates);
    }
  }

  ownerOf(coordinates) {
    const location = coordinatesToLocation(coordinates);
    return toAddress(this.benefactor[location] || Object.keys(this.balances).find(owner => this.balances[owner].has(location)) || 0);
  }

  ofRoom(coordinates) {
    const player = this.ownerOf(coordinates);
    const characters = this.dungeon.character.byPlayer(player);
    const character = characters.length ? characters[0].characterId : undefined;
    return {
      player,
      character,
      active: this.isActive(coordinates),
      income: this.roomIncome(coordinates)
    }
  }

  toJSON() {
    const { data, balances, benefactor, income } = this;
    return { data, balances, benefactor, income };
  }
}

module.exports = Keeper;
