import * as ethers from 'ethers';
import * as Sentry from '@sentry/browser';
import nprogress from 'nprogress';

import Cache from 'lib/cache';
import log from 'utils/log';
import PlayerWallet from 'lib/PlayerWallet';
import { locationToCoordinates, coordinatesToLocation } from 'utils/utils';
import cacheUrl from 'lib/cacheUrl';

const config = require('../data/config');

const DIRECTIONS = { '0': {}, '1': {}, '-1': {} };
DIRECTIONS[0][1] = 'north';
DIRECTIONS[1][0] = 'west';
DIRECTIONS[0][-1] = 'south';
DIRECTIONS[-1][0] = 'east';

const REVERSE = {
  north: 'south',
  south: 'north',
  west: 'east',
  east: 'west',
};

class Dungeon {
  constructor({ ethersProvider, wallet, contract, playerContract, transferer, ubf }) {
    this.provider = ethersProvider;
    this.wallet = wallet; // to perform tx on behalf of current user
    this.contract = contract;
    this.playerContract = playerContract;
    this.transferer = transferer;
    this.ubf = ubf;
  }

  static moveToDirection({ from, to }) {
    const [ax, ay] = from.split(',').map(Number);
    const [bx, by] = to.split(',').map(Number);
    const dx = ax - bx;
    const dy = ay - by;
    if (Math.abs(dx) + Math.abs(dy) !== 1) {
      throw new Error(`cannot determine direction of move from ${from} to ${to}`);
    }
    return DIRECTIONS[dx][dy];
  }

  static reverseDirection(direction) {
    return REVERSE[direction];
  }

  async init(player, delegatePrivateKey, wallet) {
    if (this.initializing) {
      throw new Error('cannot initialised Dungeon twice');
    }
    log.info('initializing...');
    this.initializing = true;

    this.player = player;
    this.delegateWallet = new ethers.Wallet(delegatePrivateKey, this.provider);
    this.contract = this.contract.connect(this.delegateWallet);
    this.transferer = this.transferer.connect(this.delegateWallet);

    this.playerWallet = new PlayerWallet({
      playerContract: this.playerContract,
      destinationContract: this.contract,
      playerAddress: this.player,
      delegateWallet: this.delegateWallet,
    });

    this.transferWallet = new PlayerWallet({
      playerContract: this.playerContract,
      destinationContract: this.transferer,
      playerAddress: this.player,
      delegateWallet: this.delegateWallet,
    });

    this.ubfWallet = new PlayerWallet({
      playerContract: this.playerContract,
      destinationContract: this.ubf,
      playerAddress: this.player,
      delegateWallet: this.delegateWallet,
    });

    const chainId = await this.provider.send('eth_chainId', []);
    const gasPrice = ethers.BigNumber.from(config(chainId).gasPrice);
    this.defaultOpts = {
      gas: 4000000,
      gasPrice,
    };

    const characterId = await wallet.contracts.Player.getLastCharacterId(player);
    this.character = characterId.toString();
    this.cache = new Cache(await cacheUrl, this.character, this);

    // @TODO remove debug
    window.cache = this.cache;

    await this.cache.init();
    this.initializing = false;
    log.info('initialized');
  }

  async notifyOnError(metatx) {
    let tx;
    try {
      tx = await metatx;
      await tx.wait();
    } catch (err) {
      this.cache.socket.emit('metatx-error', err);
      // eslint-disable-next-line no-console
      console.log('tx failed', err);
      Sentry.captureException(err, {
        tags: { metatx: err.reason },
        extra: { tx, receipt: err.receipt },
      });
      throw err;
    }
  }

  // @TODO handle transaction errors
  async equip(gear) {
    const slotNum = { attack: 0, defense: 1 };
    const { id, slotType } = gear;
    const slot = slotNum[slotType];
    return nprogress.observe(
      this.notifyOnError(this.playerWallet.tx('multiEquip', this.character, [id], [slot])),
      this.cache.onceEquipped(gear),
    );
  }

  async recycle(gearIds) {
    const [first] = gearIds;
    return nprogress.observe(
      this.playerWallet.tx('recycle', this.character, gearIds).then(tx => tx.wait()),
      this.cache.once(
        'gear-removed',
        ({ character, gearId }) => character === this.character && gearId.toString() === first,
      ),
    );
  }

  async levelUp(newLevel) {
    return nprogress.observe(
      this.playerWallet.tx('levelUp', this.character).then(tx => tx.wait()),
      this.cache.onceLevelUp(newLevel),
    );
  }

  async refill(value) {
    // @TODO: gas price
    return nprogress.observe(
      this.wallet.contracts.Player.refill({ ...this.defaultOpts, value }).then(tx => tx.wait()),
      this.cache.onceRefill(),
    );
  }

  async move(direction) {
    this.notifyOnError(this.playerWallet.tx('move', this.character, direction));
    return this.cache.onceMoved();
  }

  async movePath(path) {
    this.notifyOnError(this.playerWallet.tx('movePath', this.character, path));
    return this.cache.onceMoved();
  }

  async teleport(location) {
    console.log(`teleporting to ${location}`);
    this.notifyOnError(this.playerWallet.tx('teleport', this.character, coordinatesToLocation(location)));
    return this.cache.onceMoved();
  }

  async scavengeGear(character, id) {
    try {
      await nprogress.observe(
        this.transferWallet.tx('scavengeGear', this.character, character, id).then(tx => tx.wait()),
      );
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log('scavenging gear failed', err);
      return false;
    }
  }

  async scavengeElements(character, type, amount) {
    try {
      await nprogress.observe(
        this.transferWallet.tx('scavengeElements', this.character, character, type, amount).then(tx => tx.wait()),
      );
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log('scavenging elements failed', err);
      return false;
    }
  }

  /**
   * Request trade from character
   * @function
   * @param to {String,Number} - seller's character id
   * @param buyer {Object} - buyer's offer
   * @param seller {Object} - seller's items
   */
  async requestTrade(to, buyer, seller) {
    await nprogress.observe(
      this.cache.socket.emit('request-trade', { seller: to, deal: { buyer, seller } }),
      (async () => new Promise(resolve => this.cache.socket.once('trade', resolve)))(),
    );
  }

  /**
   * Seller accepts a trade request from a buyer
   * @function
   * @param buyer {String,Number} - buyer's character id
   */
  async acceptTradeRequest(buyer) {
    await nprogress.observe(
      this.cache.socket.emit('accept-trade-request', { buyer }),
      (async () => new Promise(resolve => this.cache.socket.once('trade', resolve)))(),
    );
  }

  /**
   * Buyer cancels a trade request with seller
   * @function
   * @param seller {String,Number} - seller's character id
   */
  async cancelTrade(seller) {
    await nprogress.observe(
      this.cache.socket.emit('cancel-trade', { seller }),
      (async () => new Promise(resolve => this.cache.socket.once('trade', resolve)))(),
    );
  }

  /**
   * Seller cancels a trade request from buyer
   * @function
   * @param buyer {String,Number} - buyer's character id
   */
  async denyTrade(buyer) {
    await nprogress.observe(
      this.cache.socket.emit('deny-trade', { buyer }),
      (async () => new Promise(resolve => this.cache.socket.once('trade', resolve)))(),
    );
  }

  /**
   * Proposed deal between buyer and seller.
   * In a coin-only trade, this will both propose and sell gear to buyer upon seller's proposal.
   * @function
   * @param buyer {String,Number} - buyer's character id
   * @param buyer {String,Number} - buyer's character id
   * @param deal {Object} - proposed deal. must include `{ buyer: { coins: # }, seller: { gear: [1, ...] } }`.
   */
  async proposeTrade(buyer, seller, deal) {
    await nprogress.observe(
      this.cache.socket.emit('propose-trade', { buyer, seller, deal }),
      (async () => new Promise(resolve => this.cache.socket.once('trade', resolve)))(),
    );
  }

  /**
   * Send a chat message to a room.
   * @function
   * @param message {Object} - message
   */
  async sendRoomMessage(message) {
    await this.cache.socket.emit('chat-message', message);
  }

  /**
   * Accept a quest
   * @function
   * @param id {String} - quest id
   */
  async acceptQuest(id) {
    await nprogress.observe(
      this.cache.socket.emit('accept-quest', { id }),
      (async () =>
        new Promise((resolve, reject) => {
          this.cache.socket.once('accept-quest-reply', resp => {
            resp.error ? reject(resp.error) : resolve(resp);
          });
        }))(),
    );
  }

  /**
   * Advance a quest's goal
   * @function
   * @param id {String} - quest id
   * @param data {Object} - quest goal data
   */
  async advanceQuest(id, data = {}) {
    await nprogress.observe(
      this.cache.socket.emit('advance-quest', { id, data }),
      (async () =>
        new Promise((resolve, reject) => {
          this.cache.socket.once('advance-quest-reply', resp => {
            resp.error ? reject(resp.error) : resolve(resp);
          });
        }))(),
    );
  }

  /**
   * Finish a quest
   * @function
   * @param id {String} - quest id
   * @param data {Object} - quest goal data
   */
  async finishQuest(id, data = {}) {
    await nprogress.observe(
      this.cache.socket.emit('claim-quest-reward', { id, data }),
      (async () =>
        new Promise((resolve, reject) => {
          this.cache.socket.once('claim-quest-reward-reply', resp => {
            resp.error ? reject(resp.error) : resolve(resp);
          });
        }))(),
    );
  }

  async addDelegate() {
    const gasEstimate = 4000000;
    return this.wallet.contracts.Dungeon.addDelegate(
      this.delegateWallet.address,
      { ...this.defaultOpts, gasLimit: gasEstimate + 15000 }
    );
  }

  async createNewCharacter(characterName, characterClass) {
    // eslint-disable-next-line no-console
    console.log('creating new character');
    return nprogress.observe(
      this.wallet.contracts.Player.createAndEnter(
          '0x0000000000000000000000000000000000000000',
          '0',
          characterName,
          characterClass,
          await this.cache.entry(),
          { ...this.defaultOpts }
        )
        .then(tx => tx.wait()),
    );
  }

  async resurrect(characterName) {
    const fn = async () => {
      const receipt = await this.playerWallet.tx('resurrectFrom', this.character).then(tx => tx.wait());
      const { newCharacterId } = receipt.logs
        .map(item => {
          try {
            return this.contract.interface.parseLog(item);
          } catch (_) {
            return null;
          }
        })
        .filter(i => i)
        .filter(({ name }) => name === 'Resurrect')[0].args;
      // eslint-disable-next-line no-console
      console.log('resurrected character id', Number(newCharacterId));
      return this.wallet
        .tx(
          { ...this.defaultOpts },
          'Player',
          'enter',
          '0x0000000000000000000000000000000000000000',
          newCharacterId,
          '0',
          characterName,
          '0',
          await this.cache.entry(),
        )
        .then(tx => tx.wait());
    };
    return nprogress.observe(fn());
  }

  async heal(hp) {
    return nprogress.observe(this.playerWallet.tx('heal', this.character, hp).then(tx => tx.wait()));
  }

  async drop(gear) {
    return nprogress.observe(
      this.transferWallet.tx('drop', this.character, gear.id).then(tx => tx.wait()),
      this.cache.once(
        'gear-removed',
        ({ character, gearId }) => character === this.character && gearId.toString() === gear.id,
      ),
    );
  }

  async pick(gearId) {
    return nprogress.observe(this.transferWallet.tx('pick', this.character, gearId).then(tx => tx.wait()));
  }

  /**
   * convert items from object to array of items in required order:
   *  > [fire, air, electricity, earth, water, coins, keys, fragments]
   *
   * @param amounts of different tokens to be transferred in order
   *        { fire, air, electricity, earth, water, coins, keys, fragments }
   * @returns {Promise<void>} resolutions means tx success, rejection fail
   */
  convertConsumablesToArray(items = {}) {
    const { fire = 0, air = 0, electricity = 0, earth = 0, water = 0, coins = 0, keys = 0, fragments = 0 } = items;
    return [fire, air, electricity, earth, water, coins, keys, fragments];
  }

  /**
   * transfer tokens (elements, coins, keys and fragments) to the current room
   *
   * @param amounts of different tokens to be transferred
   * @returns {Promise<void>} resolutions means tx success, rejection fail
   */
  async dropElements(amounts) {
    const elements = this.convertConsumablesToArray(amounts);
    if (elements.filter(Boolean).length === 0) {
      return;
    }
    console.log('dropping', elements);
    return nprogress.observe(this.transferWallet.tx('dropElements', this.character, elements).then(tx => tx.wait()));
  }

  /**
   * transfers elements of particular type (id) from the current room
   *
   * this is not done as batch to work similar as scavenging from the corpse (one token type per tx)
   *
   * @param id of the token 1-5: elements 6: coins 7: keys 8: fragments
   * @param amount to be transferred
   * @returns {Promise<void>}
   */
  async pickElement(id, amount) {
    return nprogress.observe(this.transferWallet.tx('pickElement', this.character, id, amount).then(tx => tx.wait()));
  }

  async recyclingReward(gears) {
    const cost = await this.wallet.contracts.ReadOnlyDungeon.recyclingReward(
      gears.map(gear => gear.bytes)
    );
    return Number(cost);
  }

  async carrierCost() {
    const cost = await this.wallet.contracts.ReadOnlyDungeon.carrierCost(this.cache.currentRoom.location);
    return Number(cost);
  }

  async sendGearsToVault(gearIds) {
    return nprogress.observe(
      this.transferWallet
        .tx('batchTransferGearOut', this.character, this.wallet.address, gearIds)
        .then(tx => tx.wait()),
    );
  }

  /**
   * transfers tokens (elements, coins, keys and fragments) to vault by carrier
   *
   * @param amounts of different tokens to be transferred
   * @returns {Promise<void>} resolutions means tx success, rejection fail
   */
  async sendElementsToVault(amounts) {
    const elements = this.convertConsumablesToArray(amounts);
    if (elements.filter(Boolean).length === 0) {
      return;
    }
    return nprogress.observe(
      this.transferWallet
        .tx('batchTransferElementsOut', this.character, this.wallet.address, elements)
        .then(tx => tx.wait()),
    );
  }

  /**
   * check whenever transfers by carrier from vault of Gears or Elements is approved
   *
   * @param nft contract approved - Gears or Elements
   * @returns {Promise<Boolean>} is approved?
   */
  async isCarrierApproved(nft = 'Gears') {
    return this.wallet.contracts[nft].isApprovedForAll(this.wallet.address, this.transferer.address);
  }

  /**
   * approves transfers from vault by carrier of Gears or Elements
   *
   * @param nft contract to be approved - Gears or Elements
   * @returns {Promise<*>} resolution
   */
  async approveCarrier(nft = 'Gears') {
    return this.wallet.contracts[nft].setApprovalForAll(this.transferer.address, true).then(tx => tx.wait());
  }

  async retrieveGearsFromVault(gearIds) {
    return nprogress.observe(
      this.wallet.contracts.DungeonTokenTransferer.batchTransferGearIn(this.character, gearIds).then(tx => tx.wait()),
    );
  }

  /**
   * transfers tokens (elements, coins, keys and fragments) from vault by carrier
   *
   * carrier has to be approved to facilitate this transfer
   *
   * this function triggers portis wallet signature request as this has to be triggered directly from wallet
   * and not as usual meta transaction
   *
   * @param amounts of different tokens to be transferred
   * @returns {Promise<void>} resolutions means tx success, rejection fail
   */
  async retrieveElementsFromVault(amounts) {
    const elements = this.convertConsumablesToArray(amounts);
    if (elements.filter(Boolean).length === 0) {
      return;
    }
    return nprogress.observe(
      this.wallet
        .tx('DungeonTokenTransferer', 'batchTransferElementsIn', this.character, elements)
        .then(tx => tx.wait()),
    );
  }

  /**
   * cost in fragments of the room discovery at coordinates
   *
   * @param coordinates
   * @returns {Promise<number>} fragments
   */
  async discoveryCost(coordinates) {
    const fragments = await this.wallet.contracts.ReadOnlyDungeon.discoveryCost(coordinatesToLocation(coordinates));
    return Number(fragments);
  }

  /**
   * dungeon has to be approved to transfer character coins from vault to pay for keeping rooms
   *
   * @param nft
   * @returns {Promise<*>}
   */
  async approveDungeon(nft = 'Elements') {
    return this.wallet.contracts[nft].setApprovalForAll(this.contract.address, true).then(tx => tx.wait());
  }

  async isDungeonApproved(nft = 'Elements') {
    return this.wallet.contracts[nft].isApprovedForAll(this.wallet.address, this.contract.address);
  }

  /**
   * buys foreclosed room, fee is paid directly by character
   *
   * @returns {Promise<void>}
   */
  async buyRoom() {
    return nprogress.observe(this.playerWallet.tx('buyRoom', this.character).then(tx => tx.wait()));
  }

  /**
   * abandons room - transfers it to dungeon therefore foreclosing it
   *
   * @param coordinates
   * @returns {Promise<void>}
   */
  async abandonRoom(coordinates) {
    return nprogress.observe(
      this.playerWallet.tx('abandonRoom', this.character, coordinatesToLocation(coordinates)).then(tx => tx.wait()),
    );
  }

  /**
   * deactivates room - transfers it out of the dungeon
   *
   * dungeon has to be approved for elements transfers to deduct the fee from vault
   *
   * @param coordinates
   * @returns {Promise<void>}
   */
  async deactivateRoom(coordinates) {
    return nprogress.observe(
      this.playerWallet.tx('deactivateRoom', this.character, coordinatesToLocation(coordinates)).then(tx => tx.wait()),
    );
  }

  /**
   * activates room - transfers room to the dungeon
   *
   * @param coordinates
   * @returns {Promise<void>}
   */
  async activateRoom(coordinates) {
    return nprogress.observe(
      this.playerWallet.tx('activateRoom', this.character, coordinatesToLocation(coordinates)).then(tx => tx.wait()),
    );
  }

  /**
   * tax for kept rooms in coins
   *
   * @param periods to pay for
   * @returns {Promise<*>} number of coins
   */
  async roomsTax(periods = 1) {
    return Number(await this.wallet.contracts.ReadOnlyDungeon.roomsTax(this.cache.keeperRooms.length, periods));
  }

  /**
   * pay tax for rooms and extend due date
   *
   * dungeon has to be approved for elements transfers to deduct the fee from vault
   *
   * @param periods to pay for
   * @returns {Promise<void>}
   */
  async payRoomsTax(periods = 1) {
    return nprogress.observe(this.playerWallet.tx('payRoomsTax', this.character, periods).then(tx => tx.wait()));
  }

  /**
   * name room
   *
   * dungeon has to be approved for elements transfers to deduct the fee from vault
   *
   * @returns {Promise<void>}
   */
  async nameRoom(coordinates, name) {
    return nprogress.observe(
      this.playerWallet.tx('nameRoom', this.character, coordinatesToLocation(coordinates), name).then(tx => tx.wait()),
    );
  }

  /**
   * gets all UBF related data necessary for food screen
   *
   * @return {Promise<*>} { amount, ubfBalance, slot, claimed, untilNextSlot }
   */
  async ubfInfo() {
    return this.wallet.contracts.UBF.getInfo(this.wallet.address);
  }

  /**
   * claims ubf by using character metatransaction
   *
   * @return {Promise<*>}
   */
  async claimUbf() {
    return nprogress.observe(
      this.ubfWallet.tx('claimUBFAsCharacter', this.character).then(tx => tx.wait()),
    );
  }
}

export default Dungeon;
