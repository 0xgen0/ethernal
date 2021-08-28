const Promise = require('bluebird');
const retry = require('p-retry');
const { events } = require('../db/provider');
const { cleanRoom, createBalance, createBalanceFromAmounts } = require('../data/utils');
const { locationToCoordinates, isLocation, isAddress } = require('./utils');
const DungeonComponent = require('./dungeonComponent.js');
const Progress = require('../utils/progress.js');

const concurrency = process.env.CONCURRENCY || 20;
const retryConfig = { retries: 5 };

class Elements extends DungeonComponent {
  balances = {};

  registerEventHandlers() {
    const { Elements } = this.dungeon.contracts;
    events.on(Elements, 'TransferSingle', this.handleTransfer.bind(this));
    events.on(Elements, 'TransferBatch', this.handleTransferBatch.bind(this));
    events.on(Elements, 'SubTransferSingle', this.handleSubTransfer.bind(this));
    events.on(Elements, 'SubTransferBatch', this.handleSubTransferBatch.bind(this));
  }

  async fetchAll(fromBlock = 0, toBlock = 'latest', snapshot) {
    console.log('getting elements');
    const locations = Object.values(this.dungeon.rooms).map(room => room.location);
    const characters = Object.keys(this.dungeon.characters);
    const addresses = Object.values(this.dungeon.characters).map(character => character.player);
    console.log('fetching balances of ' + (locations.length + characters.length + addresses.length) + ' owners');
    const progress = new Progress('balances fetched', 100);
    const balances = await Promise.map(
      [...locations, ...characters, ...addresses, this.contracts.Dungeon.address.toLowerCase()],
      async owner => {
        const balance = (snapshot && snapshot.balances[owner]) || await this.fetchBalance(owner, toBlock);
        progress.tick();
        return [owner, balance];
      },
      { concurrency },
    );
    balances.forEach(([id, balance]) => {
      this.balances[id] = balance;
      if (isLocation(id)) {
        const room = this.dungeon.rooms[locationToCoordinates(id)];
        if (room) {
          room.scavenge = { ...room.scavenge, balance: this.balanceOf(id) };
        } else {
          console.log('room not found ' + id);
        }
      }
    });
  }

  async fetchBalance(owner, blockTag = 'latest') {
    const { Elements } = this.dungeon.contracts;
    const balanceOf = isAddress(owner) ? Elements.balanceOfBatch : Elements.subBalanceOfBatch;
    const ids = [1, 2, 3, 4, 5, 6, 7, 8];
    const amounts = await retry(() => balanceOf([...ids].fill(owner), ids, { blockTag })).then(balances => balances.map(Number));
    return createBalanceFromAmounts(amounts);
  }

  async reloadBalance(owner, blockTag = 'latest') {
    this.balances[owner] = await this.fetchBalance(owner, blockTag);
    return this.balanceOf(owner);
  }

  handleTransfer(fromAddress, toAddress, id, amount) {
    const from = fromAddress.toLowerCase();
    const to = toAddress.toLowerCase();
    const event = createBalance({ from, to });
    const fromBalance = this.balanceOf(from);
    const toBalance = this.balanceOf(to);
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
    this.balances[from] = fromBalance;
    this.balances[to] = toBalance;
  }

  handleTransferBatch() {
    console.log('elements transfer batch handler not implemented');
  }

  handleSubTransfer(fromId, toId, id, amount) {
    const from = fromId.toString();
    const to = toId.toString();
    const event = createBalance({ from, to });
    const fromBalance = this.balanceOf(from);
    const toBalance = this.balanceOf(to);
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
    this.balances[from] = fromBalance;
    this.balances[to] = toBalance;
    this.sockets.emit('transfer', event);
    const characterInfos = [];
    const roomUpdates = [];
    if (from !== '0') {
      if (isLocation(from)) {
        const room = this.dungeon.rooms[locationToCoordinates(from)];
        room.scavenge = { ...room.scavenge, balance: this.balanceOf(from) };
        roomUpdates.push(cleanRoom(room));
      } else {
        const characterInfo = this.dungeon.character.info(from);
        characterInfos.push(characterInfo);
        if (this.dungeon.map.deadCharacters.has(from)) {
          const coordinates = this.dungeon.character.coordinates(from);
          const character = to;
          const room = this.dungeon.rooms[coordinates];
          room.scavenge = { ...room.scavenge, corpses: this.dungeon.map.scavengeCorpses(coordinates) };
          roomUpdates.push(cleanRoom(room));
          this.sockets.emit('scavenge', { ...event, character, from, coordinates });
        }
      }
    }
    if (to !== '0') {
      if (isLocation(to)) {
        const room = this.dungeon.rooms[locationToCoordinates(to)];
        const balance = this.balanceOf(to);
        room.scavenge = { ...room.scavenge, balance };
        roomUpdates.push(cleanRoom(room));
        const characterInfo = this.dungeon.character.info(from);
        this.sockets.emit('dropped', { character: from, coordinates: room.coordinates, characterInfo, balance })
      } else {
        const characterInfo = this.dungeon.character.info(to);
        characterInfos.push(characterInfo);
      }
    }
    this.sockets.emit('update', { characterInfos, roomUpdates });
  }

  handleSubTransferBatch() {
    console.log('elements sub transfer batch handler not implemented');
  }

  balanceOf(owner) {
    return this.balances[owner] || createBalance();
  }
}

module.exports = Elements;
