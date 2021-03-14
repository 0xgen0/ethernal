/* eslint-disable no-throw-literal */
const { BigNumber, utils } = require('ethers');

const { arrayify, hexlify, defaultAbiCoder } = utils;
const log = require('../utils/log');

const config = require('../data/config');

class PlayerWallet {
  constructor({ playerContract, destinationContract, playerAddress, delegateWallet, characterId }) {
    this.characterId = characterId;
    this.playerAddress = playerAddress;
    this.destinationContract = destinationContract;
    this.delegateWallet = delegateWallet;
    this.provider = delegateWallet.provider;
    this.playerContract = playerContract.connect(delegateWallet);
  }

  async fetchCharacterId() {
    if (!this.characterId) {
      this.characterId = await this.playerContract.callStatic.getLastCharacterId(this.playerAddress);
    }
    return this.characterId;
  }

  async getBalance() {
    return this.provider.getBalance(this.delegateWallet.address);
  }

  // @TODO: better estimation
  async reserveGas({ limit = 400000, gasPrice = null }) {
    if (gasPrice === null) {
      const chainId = await this.provider.send('eth_chainId', []);
      gasPrice = BigNumber.from(config(chainId).gasPrice);
    }
    const gasEstimate = BigNumber.from(limit);
    const gasLimit = gasEstimate.add(100000); // @TODO:: more accurate fix

    const fee = gasPrice.mul(gasLimit);

    if (fee.gt(await this.getBalance())) {
      throw new Error(`not enough balance, needed: ${fee}`);
    }

    return { gasLimit, gasPrice };
  }

  async tx(options, methodName, ...args) {
    if (typeof options === 'string') {
      if (typeof args === 'undefined') {
        args = [methodName];
      } else {
        args = [methodName].concat(args);
      }
      methodName = options;
      options = {};
    }

    const { data } = await this.destinationContract.populateTransaction[methodName](...args);
    const overrides = await this.reserveGas(options);

    const tx = await this.playerContract.functions.callAsCharacter(
      this.destinationContract.address,
      overrides.gasLimit,
      data,
      overrides,
    );
    const oldWait = tx.wait.bind(tx);
    tx.wait = async () => {
      const receipt = await oldWait();
      receipt.methodName = methodName;
      receipt.args = args;
      if (receipt.events && receipt.events.length > 0) {
        const callEvent = receipt.events.find(({ event }) => event === 'Call');
        if (callEvent && !callEvent.args.success) {
          const bytes = arrayify(callEvent.args[1]);
          if (hexlify(bytes.slice(0, 4)) === '0x08c379a0') {
            const reason = defaultAbiCoder.decode(['string'], bytes.slice(4));
            throw { reason: reason[0], receipt };
          }
          throw { receipt, errorData: callEvent.args[1] };
        } else {
          // eslint-disable-next-line prefer-destructuring
          receipt.returnData = callEvent.args[1];
        }
      } else {
        // should not reach here
        throw { receipt };
      }
      log.debug('metatransaction receipt received', { tx, receipt });
      return receipt;
    };

    log.debug('sending metatransaction', {
      tx,
      methodName,
      args,
      delegate: this.delegateWallet.address,
      player: this.playerAddress,
      character: this.characterId,
    });

    return !options.wait ? tx : tx.wait();
  }
}

module.exports = PlayerWallet;
