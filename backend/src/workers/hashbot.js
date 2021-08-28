const { BigNumber } = require('ethers');
const Sentry = require('@sentry/node');

class HashBot {
  constructor(register, provider) {
    this.register = register;
    this.provider = provider;
  }

  async start() {
    this.check();
  }

  async check() {
    let lastBlockNumber;
    try {
      const lastBlock = await this.provider.getBlock('latest');
      lastBlockNumber = BigNumber.from(lastBlock.number);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('failed get latest block', err);
      Sentry.withScope(scope => {
        scope.setExtras({ lastBlockNumber });
        Sentry.captureException(err);
      });
      return setTimeout(this.check.bind(this), 5 * 1000);
    }

    let blockNumberToActualise;
    try {
      blockNumberToActualise = await this.register.getBlockToActualise();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('failed get block to actualise', err);
      Sentry.withScope(scope => {
        scope.setExtras({ lastBlockNumber, blockNumberToActualise });
        Sentry.captureException(err);
      });
      return setTimeout(this.check.bind(this), 5 * 1000);
    }

    if (blockNumberToActualise.gt(0) && lastBlockNumber.gt(blockNumberToActualise.add(200))) {
      // eslint-disable-next-line no-console
      console.log(
        `saving block Hash for ${blockNumberToActualise.toString()} (lastBlock : ${lastBlockNumber.toString()})`,
      );

      let tx;
      try {
        tx = await this.register.save({ gasLimit: '200000', gasPrice: process.env.GAS_PRICE || '1000000000' });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          `failed to send tx to save blockHash for ${blockNumberToActualise.toString()} (lastBlock : ${lastBlockNumber.toString()})`,
          err,
        );
        Sentry.withScope(scope => {
          scope.setExtras({ tx, lastBlockNumber, blockNumberToActualise });
          Sentry.captureException(err);
        });
        return setTimeout(this.check.bind(this), 5 * 1000);
      }

      if (tx) {
        try {
          await tx.wait();
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(
            `failed to save blockHash for ${blockNumberToActualise.toString()} (lastBlock : ${lastBlockNumber.toString()})`,
            err,
          );
          Sentry.withScope(scope => {
            scope.setExtras({ tx, lastBlockNumber, blockNumberToActualise });
            Sentry.captureException(err);
          });
          return setTimeout(this.check.bind(this), 5 * 1000);
        }
      }
    }

    // @TODO: based on block event ?
    return setTimeout(this.check.bind(this), 20 * 5 * 1000);
  }
}
module.exports = HashBot;
