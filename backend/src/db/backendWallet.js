const { Wallet, utils, BigNumber } = require('ethers');
const retry = require('p-retry');

const { fromMnemonic } = utils.HDNode;

class BackendWallet extends Wallet {
  constructor(...args) {
    super(...args);
    this._noncePromise = null;
  }

  connect(provider) {
    // @TODO: catch same errors
    super.connect(provider);
    return new BackendWallet(this.privateKey, provider);
  }

  async sendTransaction(transaction) {
    if (transaction.gasPrice == null) {
      transaction.gasPrice = BigNumber.from(process.env.GAS_PRICE || '1000000000');
    }
    if (transaction.nonce == null) {
      if (this._noncePromise == null) {
        this._noncePromise = this.provider.getTransactionCount(this.address);
      }
      transaction.nonce = this._noncePromise;
      this._noncePromise = this._noncePromise.then(nonce => nonce + 1);
    }

    const tx = await retry(async () => {
      let tx;
      try {
        this.provider.clearCache();
        tx = await super.sendTransaction(transaction);
      } catch (err) {
        if (err.message.includes('nonce')) {
          console.log('incorrect nonce, trying again');
          transaction.nonce = await this.provider.getTransactionCount(this.address);
          this._noncePromise = null;
          tx = await super.sendTransaction(transaction);
        } else {
          throw err;
        }
      }
      return tx;
    });
    return tx;
  }

  static fromMnemonic(mnemonic, path = "m/44'/60'/0'/0/0", wordlist) {
    return new BackendWallet(fromMnemonic(mnemonic, wordlist).derivePath(path));
  }
}

module.exports = BackendWallet;
