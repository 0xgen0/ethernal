require('dotenv').config();
const Sentry = require('@sentry/node');
const ethers = require('ethers');
const retry = require('p-retry');
const Promise = require('bluebird');
const memoize = require('memoizee');
const taim = require('taim');
const VM = require('ethereumjs-vm').default;
const { Transaction } = require('ethereumjs-tx');
const { privateToAddress } = require('ethereumjs-util');
const { simpleEncode, simpleDecode } = require('ethereumjs-abi');
const contractsInfo = process.env.DEV ? require('../dev_contractsInfo.json') : require('../contractsInfo.json');
const Postgres = require('./postgres');
const Progress = require('../utils/progress.js');
const retryable = require('../utils/retryable.js');
const BackendWallet = require('./backendWallet.js');
const Blockstream = require('../events/blockstream.js');
const DaggerEvents = require('../events/dagger.js');
const { bn } = require('../game/utils.js');

const retryConfig = { retries: 3 };
const concurrency = process.env.CONCURRENCY || 20;
const url = process.env.ETH_URL || 'http://localhost:8545';
const mnemonic = process.env.MNEMONIC;
const oldMnemonic = process.env.OLD_MNEMONIC;
const cacheConfig = { length: false, primitive: true, max: 10000 };

console.log('connecting to provider ' + url);
const provider = new ethers.providers.JsonRpcProvider(url);
let wallet;
let hashBotWallet;
if (mnemonic) {
  wallet = BackendWallet.fromMnemonic(mnemonic).connect(provider);
  hashBotWallet = BackendWallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0/1").connect(provider);
  console.log('using address', wallet.address);
}
let _contracts = null;

const db = new Postgres();

const setupAuthorization = async ({ DungeonAdmin }) => {
  const [dungeonAddress, backendAddress] = await DungeonAdmin.getDungeonAndBackendAddress();
  if (backendAddress.toLowerCase() !== wallet.address.toLowerCase()) {
    console.log('current backend address is not authorized!');
    console.log('only ' + backendAddress + ' is authorized in dungeon');
    if (oldMnemonic) {
      const oldWallet = BackendWallet.fromMnemonic(oldMnemonic).connect(provider);
      console.log('changing backend wallet from ' + backendAddress);
      const tx = await new ethers.Contract(
        DungeonAdmin.address,
        DungeonAdmin.interface.abi,
        oldWallet,
      ).setDungeonAndBackend(dungeonAddress, wallet.address);
      await tx.wait();
      console.log('admin wallet changed to ' + wallet.address);
    } else {
      console.log('you can set current address by providing OLD_MNEMONIC env variable');
    }
  } else {
    console.log('backend is authorized in dungeon');
  }
};

const setupPureContract = async deploymentBytecode => {
  const accountPk = Buffer.from('e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109', 'hex');
  const accountAddress = privateToAddress(accountPk);
  const vm = new VM();
  const tx = new Transaction({
    value: 0,
    gasLimit: 10000000, // We assume that 10M is enough,
    gasPrice: 0,
    data: deploymentBytecode,
    nonce: 0,
  });
  tx.sign(accountPk);
  const deploymentResult = await vm.runTx({ tx });
  if (deploymentResult.execResult.exceptionError) {
    throw deploymentResult.execResult.exceptionError;
  }
  const contractAddress = deploymentResult.createdAddress;
  console.log('vm for pure calls started');
  return async (funcSig, args) => {
    const callResult = await vm.runCall({
      to: contractAddress,
      caller: accountAddress,
      origin: accountAddress, // The tx.origin is also the caller here
      data: simpleEncode(funcSig, ...args),
    });
    if (callResult.execResult.exceptionError) {
      throw callResult.execResult.exceptionError;
    }
    return simpleDecode(funcSig, callResult.execResult.returnValue);
  };
};

const loadContracts = async () => {
  const chainId = bn(await provider.send('eth_chainId', [])).toString();
  console.log(`loading contracts on network ${chainId}`);
  let chainInfo = contractsInfo[chainId];
  if (!chainInfo) {
    chainInfo = contractsInfo['1337'];
  }
  if (!chainInfo) {
    const providedChain = contractsInfo.chainId;
    if (providedChain === chainId) {
      chainInfo = contractsInfo;
    } else {
      console.log('only provided contracts info is for chain ' + providedChain);
    }
  }
  if (!chainInfo) {
    console.log('missing contracts info for the network');
    Sentry.captureException(new Error('Missing contracts info for network'));
    await Sentry.close();
    process.exit(1);
  }
  const chainContracts = chainInfo.contracts || chainInfo[0].contracts;
  const contracts = Object.keys(chainContracts).reduce(
    (result, key) => {
      const info = chainContracts[key];
      let connectedWallet = wallet;
      if (key === 'BlockHashRegister') {
        connectedWallet = hashBotWallet;
      }
      if (key === 'Dungeon') {
        console.log('connected to Dungeon contract ' + info.address);
      }
      result[key] = new ethers.Contract(info.address, info.abi, connectedWallet);
      return result;
    },
    {
      pureCall: memoize(
        await setupPureContract(chainContracts.Dungeon.linkedData.readOnlyDungeon),
        cacheConfig,
      ),
    },
  );
  await setupAuthorization(contracts);
  Object.values(contracts).forEach(contract => {
    if (contract.functions) {
      contract.cached = Object.entries(contract.functions).reduce((o, [name, fn]) => ({
        ...o, [name]: memoize(taim(name, retryable(fn, retryConfig)), cacheConfig)
      }), {});
    }
  });
  provider.clearCache = () => {
    console.log('clearing cache');
    if (_contracts) {
      Object.values(_contracts).forEach(contract => {
        if (contract.functions) {
          Object.values(contract.cached).forEach(memoized => memoized.clear());
        }
      });
    }
  };
  return contracts;
};

const contracts = async () => {
  if (!_contracts) {
    _contracts = await loadContracts();
    await db.init(_contracts);
    await events.storeSchema();
  }
  return _contracts;
};

const pastEvents = async (
  contractName,
  eventName,
  additionalTopics = [],
  fromBlock = 0,
  toBlock = 'latest',
  blockChunk = 100000,
  showProgress = false,
) => {
  const contract = _contracts[contractName];
  const eventTopic = contract.interface.getEventTopic(eventName);
  const topics = [eventTopic, ...additionalTopics];
  let chunks = [{ fromBlock, toBlock }];
  if (fromBlock) {
    const from = fromBlock;
    const to = toBlock === 'latest' ? (await provider.getBlock('latest')).number : toBlock;
    if (to - from > blockChunk) {
      chunks = [];
      let block = from;
      while (block + blockChunk < to) {
        chunks.push({ fromBlock: block, toBlock: (block += blockChunk) });
        block++;
      }
      if (block < to) {
        chunks.push({ fromBlock: block, toBlock });
      }
    }
  }
  const progress = new Progress('event chunks', 1);
  return Promise.map(
    chunks,
    ({ fromBlock, toBlock }) =>
      retry(async () => {
        const logs = await provider.getLogs({
          fromBlock,
          toBlock,
          address: contract.address,
          topics,
        });
        if (showProgress) {
          progress.tick();
        }
        return logs.map(event => ({ ...event, ...contract.interface.parseLog(event) }));
      }, retryConfig),
    { concurrency },
  ).then(chunks => chunks.flat());
};

const events =
  url.includes('rpc-mumbai.matic.today') && process.env.DAGGER !== 'disabled'
    ? new DaggerEvents(provider, db, process.env.DAGGER || 'wss://mumbai-dagger.matic.today')
    : new Blockstream(provider, db);

module.exports = { provider, db, contracts, wallet, events, pastEvents };
