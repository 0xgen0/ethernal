const { BlockAndLogStreamer } = require('ethereumjs-blockstream');
const retry = require('p-retry');
const Events = require('./events');

const retryConfig = { retries: 3 };

class Blockstream extends Events {
  defaultConfig = {
    poolingInterval: 1000,
    blockRetention: 1000,
    start: true,
  };
  contracts = {};

  constructor(provider, db, configuration = {}) {
    super(provider, db);
    console.log('listening for events with blockstream');
    this.configuration = { ...this.defaultConfig, ...configuration };
    this.blockAndLogStreamer = new BlockAndLogStreamer(
      this.getBlockByHash.bind(this),
      this.getLogs.bind(this),
      error => console.log('event processing error: ' + error, error),
      this.configuration,
    );
    this.blockAndLogStreamer.addLogFilter({});
    this.blockAndLogStreamer.subscribeToOnLogsAdded((blockHash, logs) => this.emitLogs(blockHash, logs));
    this.blockAndLogStreamer.subscribeToOnLogsRemoved((blockHash, logs) => this.emitLogs(blockHash, logs, true));
    if (this.configuration.start) {
      this.start();
    }
  }

  async emitLogs(blockHash, logs, removed = false) {
    for (let log of logs) {
      const address = log.address.toLowerCase();
      const contract = this.contracts[address];
      if (contract) {
        const event = this.parseLog(contract, log);
        const listener = this.listeners.find(({ eventName, contract }) =>
          event.name === eventName && contract.address.toLowerCase() === address);
        if (listener) {
          const { addedCallback, prefetch } = listener;
          await this.useDeferrableCallback(addedCallback, prefetch)(...Array.from(event.args), event, removed);
        }
      }
    }
  }

  on(contract, eventName, addedCallback, prefetch, confirmed = false) {
    this.contracts[contract.address.toLowerCase()] = contract;
    return super.on(contract, eventName, addedCallback, prefetch, confirmed);
  }

  onBlock(callback) {
    this.blockAndLogStreamer.subscribeToOnBlockAdded(callback);
    return this;
  }

  onBlockRemoved(callback) {
    this.blockAndLogStreamer.subscribeToOnBlockRemoved(callback);
    return this;
  }

  async getLatestBlock() {
    return this.provider.send('eth_getBlockByNumber', ['latest', false]);
  }

  async getBlockByHash(hash) {
    return this.provider.send('eth_getBlockByHash', [hash, false]);
  }

  async getLogs(filterOptions) {
    return this.provider.send('eth_getLogs', [filterOptions]);
  }

  async reconcileNewBlock() {
    const latest = await this.getLatestBlock();
    await retry(() => this.blockAndLogStreamer.reconcileNewBlock(latest), retryConfig);
    return latest;
  }

  start() {
    this.timer = setInterval(() => this.reconcileNewBlock().catch(console.log), this.configuration.poolingInterval);
  }

  stop() {
    clearInterval(this.timer);
  }
}

module.exports = Blockstream;
