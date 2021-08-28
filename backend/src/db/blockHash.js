const retry = require('p-retry');
const { provider, contracts } = require('./provider');

const zeroHash = '0x0000000000000000000000000000000000000000000000000000000000000000';

const blockHash = async (blockNumber, options = {}) => {
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
};

module.exports = blockHash;
