const Sentry = require('@sentry/node');
const Promise = require('bluebird');
const retry = require('p-retry');
const firstBy = require('thenby');
const { blockchainSimulator } = require('../data/utils');

const retryConfig = { retries: 3 };

class Events {
  defer = false;
  queue = [];
  listeners = [];
  blockNumber = 0;
  targetBlockNumber = 0;
  replaying = false;

  constructor(provider, db) {
    this.provider = provider;
    this.db = db;
  }

  get forwarding() {
    return this.targetBlockNumber >= this.blockNumber + 10000;
  }

  onBlock(callback) {
    throw new Error('not implemented');
  }

  on(contract, eventName, addedCallback, prefetch, confirmed = false) {
    if (!confirmed) {
      this.listeners.push({ contract, eventName, addedCallback, prefetch });
    }
    return this;
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

  useDeferrableCallback(callback, prefetch) {
    const handledCallback = this.useHandledCallback(callback);
    return (...args) => {
      const event = args[args.length - 2];
      const blockNumber = Number(event.blockNumber);
      this.queue.push(async () => {
        if (prefetch) {
          prefetch(...args);
        }
        await handledCallback(...args);
      });
      if (!(this.defer && blockNumber !== this.blockNumber)) {
        return this.processDeferred();
      }
    };
  }

  useHandledCallback(callback) {
    return async (...args) => {
      let event, result;
      try {
        event = args[args.length - 2];
        const blockNumber = Number(event.blockNumber);
        if (blockNumber > this.blockNumber) {
          this.blockNumber = blockNumber;
          if (!this.forwarding) {
            this.provider.clearCache();
          }
        }
        const status = await this.eventStatus(event);
        if (status !== 'processed' && await this.storeEvent(event)) {
          result = await callback(...args);
          await this.updateEvent(event, result || {});
        } else {
          console.log('skipping', event.name);
        }
      } catch (e) {
        console.log(`processing of the event failed: ${e}`, args, e);
        Sentry.withScope(scope => {
          scope.setTag('scope', 'event handling');
          scope.setExtras({ args, callback });
          Sentry.captureException(e);
        });
        await this.updateEvent(event, null, e);
      }
      return result;
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
    const process = async () => {
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
    if (!this.processing) {
      this.processing = process();
      const result = await this.processing;
      this.processing = null;
      return result;
    } else {
      return this.processing;
    }
  }

  async generateBlockChunks(fromBlock = 0, toBlock = 'latest', size = 100000) {
    let chunks = [{ fromBlock, toBlock }];
    if (fromBlock) {
      const from = fromBlock;
      const to = toBlock === 'latest' ? (await this.provider.getBlock('latest')).number : toBlock;
      if (to - from > size) {
        chunks = [];
        let block = from;
        while (block + size < to) {
          chunks.push({ fromBlock: block, toBlock: (block += size) });
          block++;
        }
        if (block < to) {
          chunks.push({ fromBlock: block, toBlock });
        }
      }
    }
    return chunks;
  }

  async replay(fromBlock = 0, toBlock = 'latest', { blockChunk = 10000 } = {}) {
    const chunks = await this.generateBlockChunks(fromBlock, toBlock, blockChunk);
    const lastBlock = chunks[chunks.length - 1].toBlock;
    this.targetBlockNumber = lastBlock;
    this.replaying = true;
    for (let {fromBlock, toBlock} of chunks) {
      console.log('replaying blocks', fromBlock, '/', lastBlock);
      let events = await Promise.all(
        this.listeners.map(({ contract, eventName, addedCallback, prefetch }) =>
          retry(async () => {
            const logs = await this.provider.getLogs({
              fromBlock,
              toBlock,
              address: contract.address,
              topics: [contract.interface.getEventTopic(eventName)],
            });
            return logs.map(log => ({ ...this.parseLog(contract, log), callback: addedCallback, prefetch }));
          }, retryConfig))
      );
      events = events.flat().sort(firstBy('blockNumber').thenBy('transactionIndex').thenBy('logIndex'));
      Promise.all(events.map(e => e.prefetch && e.prefetch(...[...Array.from(e.args), e, false])));
      for (let event of events) {
        const args = [...Array.from(event.args), event, false];
        await this.useHandledCallback(event.callback)(...args);
      }
    }
    this.replaying = false;
    return true;
  }

  async lastProcessedBlock() {
    const { rows } = await this.db.query(`SELECT MAX(block) FROM ${this.db.tableName('event')}`);
    return rows[0].max && Number(rows[0].max);
  }

  async storeSchema() {
    return this.db.tx(t => {
      t.query(`
        CREATE TABLE IF NOT EXISTS ${this.db.tableName('event')} (
            block numeric(256),
            logIndex numeric(256),
            txHash varchar(66),
            event jsonb,
            result jsonb,
            error jsonb,
            PRIMARY KEY (block, logIndex, txHash))
      `);
    });
  }

  toRow(event, result, error) {
    return [
      Number(event.blockNumber),
      Number(event.logIndex),
      event.transactionHash,
      { ...event, args: event.args.map(String), eventFragment: undefined },
      result,
      error
    ];
  }

  async eventStatus(event) {
    const [block, logIndex, txHash] = this.toRow(event);
    const { rows } = await this.db.query(
      `SELECT * FROM ${this.db.tableName('event')}
        WHERE block = $1 AND logindex = $2 AND txhash = $3`,
      [block, logIndex, txHash]);
    if (rows.length) {
      const { result, error } = rows[0];
      if (result) {
        return 'processed';
      }
      if (error) {
        return 'error';
      }
    }
    return null;
  }

  async storeEvent(event) {
    try {
      await this.db.query(
        `INSERT INTO ${this.db.tableName('event')} (block, logIndex, txHash, event, result, error) VALUES ($1,$2,$3,$4,$5,$6)`,
        this.toRow(event, null, null),
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  async updateEvent(event, result = null, error = null) {
    const { rowCount } = await this.db.query(
      `INSERT INTO ${this.db.tableName('event')} (block, logindex, txhash, event, result, error) VALUES ($1,$2,$3,$4,$5,$6)
          ON CONFLICT (block, logindex, txhash) DO UPDATE
          SET event = excluded.event,
              result = excluded.result,
              error = excluded.error`,
      this.toRow(event, result, error),
    );
    return rowCount === 1;
  }
}

module.exports = Events;
