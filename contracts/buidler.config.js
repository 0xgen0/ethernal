usePlugin('buidler-ethers-v5');
usePlugin('buidler-deploy');

const fs = require('fs');
const ethers = require('ethers');
const {Wallet} = ethers;

const localMnemonic = fs.readFileSync('mnemonic.local').toString();
const buidlerevmAccounts = [];
for (let i = 0; i < 10; i++) {
  buidlerevmAccounts.push({
    privateKey: Wallet.fromMnemonic(localMnemonic, "m/44'/60'/0'/0/" + i).privateKey,
    balance: '0xF6635C9ADC5DEA00000',
  });
}

let mnemonic;
try {
  mnemonic = process.env.MNEMONIC || fs.readFileSync('.mnemonic').toString().trim();
} catch (e) {
  mnemonic = localMnemonic;
}

module.exports = {
  deploymentChainIds: ['77', '15001', '1', '2', '4', '42', '80001'],
  solc: {
    version: '0.6.5',
    outputMetadata: true,
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
  paths: {
    sources: 'src',
  },
  networks: {
    localhost: {
      live: false,
    },
    buidlerevm: {
      accounts: buidlerevmAccounts,
    },
    alpha: {
      url: 'https://rpc-mumbai.matic.today',
      live: true,
      accounts: {
        mnemonic,
      },
    },
    sokol_dev: {
      url: 'https://sokol.poa.network',
      accounts: {
        mnemonic,
      },
    },
    matic_dev: {
      url: 'https://rpc-mumbai.matic.today',
      live: true,
      accounts: {
        mnemonic,
      },
    },
  },
  namedAccounts: {
    deployer: 0,
    relayer: '0x7B7cd3876EC83efa98CbB251C3C0526eb355EA55',
    dungeonOwner: {
      default: 1,
      4: 0,
      77: 0,
      15001: 0,
      80001: 0,
    },
    backendAddress: {
      default: 0, // '0xD34d8Cc238808559Ca494196CeFAEEe187eb740e', // correspond to first account in mnemonic.local
      4: process.env.BACKEND_WALLET || '0xBc1979815C2B642d71636A080AcF41757C3800C7',
      77: process.env.BACKEND_WALLET || '0xBc1979815C2B642d71636A080AcF41757C3800C7',
      15001: process.env.BACKEND_WALLET || '0xBc1979815C2B642d71636A080AcF41757C3800C7',
      80001: process.env.BACKEND_WALLET || '0xBc1979815C2B642d71636A080AcF41757C3800C7',
    },
    portisAccount: '0xacD8a455006Da5C8D115b3A6E9d17a3B59361F05',
    users: 'from:2',
  },
};
