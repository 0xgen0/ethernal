const Sentry = require('@sentry/node');
const Promise = require('bluebird');
const { blockchainSimulator } = require('../data/utils');

class Events {
  defer = false;
  queue = [];
  blockNumber = 0;

  constructor(provider) {
    this.provider = provider;
  }

  onBlock(callback) {
    throw new Error('not implemented');
  }

  on(contract, eventName, addedCallback, removedCallback = () => true) {
    throw new Error('not implemented');
  }

  parseLog(contract, log) {
    try {
      const event = contract.interface.parseLog(log);
      return { ...log, ...event };
    } catch (e) {
      console.log('failed to parse log', log, e);
      Sentry.withScope(scope => {
        scope.setExtras({ contract, log });
        Sentry.captureException(e);
      });
      return log;
    }
  }

  useDeferrableCallback(callback) {
    const handledCallback = this.useHandledCallback(callback);
    return (...args) => {
      const event = args[args.length - 2];
      const blockNumber = Number(event.blockNumber);
      if (this.defer && blockNumber !== this.blockNumber) {
        this.queue.push(async () => await handledCallback(...args));
      } else {
        return handledCallback(...args);
      }
    };
  }

  useHandledCallback(callback) {
    return async (...args) => {
      try {
        const event = args[args.length - 2];
        const blockNumber = Number(event.blockNumber);
        if (blockNumber > this.blockNumber) {
          this.blockNumber = blockNumber;
        }
        return await callback(...args);
      } catch (e) {
        console.log(`processing of the event failed: ${e}`, args, e);
        Sentry.withScope(scope => {
          scope.setTag('scope', 'event handling');
          scope.setExtras({ args, callback });
          Sentry.captureException(e);
        });
      }
    };
  }

  async onceBlock() {
    return Promise.race([
      new Promise(resolve => this.provider.on('block', blockNumber => resolve(blockNumber))),
      blockchainSimulator(5)
        .then(() => this.provider.send('eth_getBlockByNumber', ['latest', false]))
        .then(({ number }) => Number(number))
    ]);
  }

  async deferEvents() {
    const blockNumber = await this.onceBlock();
    this.defer = true;
    await this.onceBlock();
    return blockNumber;
  }

  takeDeferredEvents() {
    const queue = [...this.queue];
    this.queue = [];
    return queue;
  }

  async processDeferred() {
    let processed = 0;
    let queue = this.takeDeferredEvents();
    while (queue.length) {
      for (let callback of queue) {
        await callback();
        processed++;
      }
      queue = this.takeDeferredEvents();
    }
    this.defer = false;
    return processed;
  }
}

module.exports = Events;
