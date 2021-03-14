const retry = require('p-retry');
const memoize = require('memoizee');
const taim = require('taim');
const { provider, contracts } = require('./provider');

const zeroHash = '0x0000000000000000000000000000000000000000000000000000000000000000';

const blockHash = memoize(taim('blockHash', async (blockNumber, options = {}) => {
  blockNumber = Number(blockNumber);
  const { BlockHashRegister } = await contracts();
  return retry(async () => {
    let hash = await BlockHashRegister.get(blockNumber, options);
    if (hash === zeroHash) {
      const block = await provider.getBlock(blockNumber, options);
      if (!block || !block.hash) {
        throw new Error(`block ${blockNumber} not found`);
      }
      if (block.hash === zeroHash) {
        throw new Error(`block ${blockNumber} is zero`);
      }
      hash = block.hash;
    }
    return hash;
  });
}), { max: 10000, primitive: true, length: false });

module.exports = blockHash;
