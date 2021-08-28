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

  constructor(provider, configuration = {}) {
    super(provider);
    console.log('listening for events with blockstream');
    this.configuration = { ...this.defaultConfig, ...configuration };
    this.blockAndLogStreamer = new BlockAndLogStreamer(
      this.getBlockByHash.bind(this),
      this.getLogs.bind(this),
      error => console.log('event processing error: ' + error, error),
      this.configuration,
    );
    this.eventListeners = [];
    this.blockAndLogStreamer.addLogFilter({});
    this.blockAndLogStreamer.subscribeToOnLogsAdded((blockHash, logs) => this.emitLogs(blockHash, logs));
    this.blockAndLogStreamer.subscribeToOnLogsRemoved((blockHash, logs) => this.emitLogs(blockHash, logs, true));
    if (this.configuration.start) {
      this.start();
    }
  }

  emitLogs(blockHash, logs, removed = false) {
    if (logs.length) {
      this.eventListeners.map(({ contract, eventName, addedCallback, removedCallback }) => {
        const callback = removed ? removedCallback : addedCallback;
        logs
          .filter(({ address }) => address === contract.address.toLowerCase())
          .map(log => this.parseLog(contract, log))
          .filter(({ name }) => name === eventName)
          .map(event => this.useDeferrableCallback(callback)(...Array.from(event.args), event, removed));
      });
    }
  }

  on(contract, eventName, addedCallback, removedCallback = () => true) {
    this.eventListeners.push({ contract, eventName, addedCallback, removedCallback });
    return this;
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
