const Sentry = require('@sentry/node');
const equal = require('fast-deep-equal');
const { events } = require('../db/provider');
const { createOffer, createBalanceFromAmounts } = require('../data/utils.js');
const DungeonComponent = require('./dungeonComponent.js');

/**
 * Common possible flows:
 *   - created -> request -> negotiation -> consensus -> completed
 *   - created -> request -> denied
 *   - created -> request -> negotiation -> (...negotation) -> denied
 */
const TRANSITIONS = Object.freeze({
  created: ['request'],
  request: ['negotiation', 'denied'],
  denied: [],
  negotiation: ['negotiation', 'consensus', 'denied'],
  consensus: ['completed'],
  completed: [],
});

class Trade {
  buyer;
  seller;
  status = 'created';
  history = [];

  constructor(buyer, seller) {
    this.status = 'created';
    this.buyer = buyer;
    this.seller = seller;
    this.deals = {
      [buyer]: null,
      [seller]: null,
    };
  }

  propose(character, deal) {
    if (['request', 'negotiation'].includes(this.status)) {
      this.history.push({ character, deal });
      this.deals[character] = deal;
    } else {
      throw new Error('cannot propose when ' + this.status);
    }
  }

  isConsensus(character) {
    const { buyer } = this.deals[this.buyer];
    const { seller } = this.deals[this.seller];

    // Don't allow without seller consent
    if (seller === null) {
      return false;
    }

    // Allow single-sided acceptance from seller if coin-only purchase
    if (this.isPurchase && character === this.seller) {
      return true;
    }

    // Otherwise require mutual consensus
    return equal(buyer, seller);
  }

  canTransitionTo(status, revert = false) {
    const from = revert ? status : this.status;
    const to = !revert ? status : this.status;
    return from === to || TRANSITIONS[from].includes(to);
  }

  changeStatus(status, revert) {
    if (this.canTransitionTo(status, revert)) {
      this.status = status;
    } else {
      throw new Error(`invalid state transition ${this.status} -> ${status}`);
    }
    return this.status;
  }

  get deal() {
    return this.history[this.history.length - 1];
  }

  get isPurchase() {
    const { buyer } = this.deals[this.buyer] || {};
    const { amounts, gear = [] } = buyer || {};
    const [, , , , , coins] = amounts;
    const sum = amounts.reduce((a, b) => a + b, 0);
    return coins > 0 && coins === sum && gear.length === 0;
  }
}

class Trading extends DungeonComponent {
  trades = {};

  constructor(map) {
    super(map);
    this.sockets
      .onCharacter('request-trade', this.requestTrade.bind(this))
      .onCharacter('accept-trade-request', this.acceptTradeRequest.bind(this))
      .onCharacter('deny-trade', this.denyTrade.bind(this))
      .onCharacter('cancel-trade', this.cancelTrade.bind(this))
      .onCharacter('propose-trade', this.proposeTrade.bind(this))
      .on('move', this.clearTrades.bind(this))
      .on('left', this.clearTrades.bind(this));
  }

  registerEventHandlers() {
    const { DungeonTokenTransferer } = this.dungeon.contracts;
    events.on(DungeonTokenTransferer, 'Exchange', this.handleExchange.bind(this));
  }

  async handleExchange(sellerId, buyerId, sale, price) {
    const parseOffer = async ({characterId, amounts, gears}) => ({
      character: await this.dungeon.character.info(characterId.toString()),
      balance: createBalanceFromAmounts(amounts.map(Number)),
      gears: await Promise.all(gears.map(id => this.dungeon.gear.info(id))),
    });
    const [seller, buyer] = await Promise.all([sale, price].map(parseOffer));
    this.sockets.emit('exchange', { seller, buyer });
  }

  getTrade(buyer, seller) {
    const key = `${buyer}:${seller}`;
    if (!this.trades[key]) {
      this.trades[key] = new Trade(buyer, seller);
    }
    return this.trades[key];
  }

  clearTrades({ character }) {
    Object.keys(this.trades).forEach(key => {
      const [buyer, seller] = key.split(':');
      if ([buyer, seller].includes(character)) {
        console.log(`clearing trade ${key}`);
        delete this.trades[key];
        this.sockets.emitToGroup([buyer, seller], 'trade', { character: seller, trade: undefined });
      }
    });
  }

  deleteTrade(buyer, seller) {
    const key = `${buyer}:${seller}`;
    delete this.trades[key];
  }

  requestTrade(buyer, { seller, deal }) {
    console.log(`request trade with ${buyer} and ${seller} -> ${JSON.stringify(deal)}`);
    const trade = this.getTrade(buyer, seller);
    const { status: lastStatus } = trade;
    try {
      trade.changeStatus('request');
      trade.propose(buyer, deal);
      this.sockets.emitToGroup([buyer, seller], 'trade', { character: buyer, trade });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      trade.changeStatus(lastStatus, true);
      this.sockets.emitToGroup([buyer, seller], 'trade', { character: buyer, trade, error: err });
    }
    return trade;
  }

  acceptTradeRequest(seller, { buyer }) {
    console.log(`seller ${seller} accepted trade request with ${buyer}`);
    const trade = this.getTrade(buyer, seller);
    const { status: lastStatus } = trade;
    try {
      trade.changeStatus('negotiation');
      this.sockets.emitToGroup([buyer, seller], 'trade', { character: seller, trade });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      trade.changeStatus(lastStatus, true);
      this.sockets.emitToGroup([buyer, seller], 'trade', { character: seller, trade, error: err });
    }
    return trade;
  }

  cancelTrade(buyer, { seller }) {
    console.log(`buyer ${buyer} cancelled trade request with ${seller}`);
    const trade = this.getTrade(buyer, seller);
    const { status: lastStatus } = trade;
    try {
      trade.changeStatus('denied');
      this.sockets.emitToGroup([buyer, seller], 'trade', { character: buyer, trade });
      this.deleteTrade(buyer, seller);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      trade.changeStatus(lastStatus, true);
      this.sockets.emitToGroup([buyer, seller], 'trade', { character: buyer, trade, error: err });
    }
    return trade;
  }

  denyTrade(seller, { buyer }) {
    console.log(`seller ${seller} denied trade request with ${buyer}`);
    const trade = this.getTrade(buyer, seller);
    const { status: lastStatus } = trade;
    try {
      trade.changeStatus('denied');
      this.sockets.emitToGroup([buyer, seller], 'trade', { character: seller, trade });
      this.deleteTrade(buyer, seller);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      trade.changeStatus(lastStatus, true);
      this.sockets.emitToGroup([buyer, seller], 'trade', { character: seller, trade, error: err });
    }
    return trade;
  }

  async proposeTrade(character, { buyer, seller, deal }) {
    console.log(`trader ${character} proposes trade with ${buyer} and ${seller} -> ${JSON.stringify(deal)}`);
    const trade = this.getTrade(buyer, seller);
    const { status: lastStatus } = trade;
    try {
      trade.propose(character, deal);

      // Check if consensus or if seller accepted a purchase-only trade
      if (trade.isConsensus(character)) {
        trade.changeStatus('consensus');
        await this.executeTrade(trade);
      }

      this.sockets.emitToGroup([buyer, seller], 'trade', { character, trade });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      trade.changeStatus(lastStatus, true);
      this.sockets.emitToGroup([buyer, seller], 'trade', { character, trade, error: err });
    }
    return trade;
  }

  async executeTrade(trade) {
    const {
      buyer,
      seller,
      deal: { deal },
    } = trade;
    const [buyerCoordinates, sellerCoordinates] = await Promise.all([
      this.dungeon.character.coordinates(buyer),
      this.dungeon.character.coordinates(seller),
    ]);
    if (buyerCoordinates !== sellerCoordinates) {
      return this.clearTrades({ character: seller });
    }

    if (trade.canTransitionTo('completed')) {
      await this.sellGear(seller, buyer, deal);
      trade.changeStatus('completed');
      this.deleteTrade(buyer, seller);
    }
  }

  async sellGear(seller, buyer, deal) {
    console.log(`selling gear -> ${JSON.stringify({ seller, buyer, deal })}`);
    const { DungeonTokenTransferer, DungeonAdmin } = this.dungeon.contracts;

    const buyerDeal = createOffer({ characterId: buyer, ...deal.buyer });
    const sellerDeal = createOffer({ characterId: seller, ...deal.seller });
    console.log(` - buyer data ${JSON.stringify(buyerDeal)}`);
    console.log(` - seller data ${JSON.stringify(sellerDeal)}`);

    const { data } = await DungeonTokenTransferer.populateTransaction.exchange(sellerDeal, buyerDeal);
    const tx = await DungeonAdmin.forward(DungeonTokenTransferer.address, data);
    try {
      await tx.wait();
    } catch (e) {
      console.log('sell gear tx failed', e);
      Sentry.withScope(scope => {
        scope.setExtras({ ...event, tx });
        Sentry.captureException(e);
      });
      throw e;
    }
  }
}

module.exports = Trading;
