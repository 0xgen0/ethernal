import WalletStores from 'web3w';
import {PortisModuleLoader} from 'web3w-portis-loader';
import {JsonRpcProvider} from '@ethersproject/providers';

import contractsInfo from 'contractsInfo';

const ethUrl = ETH_URL;
let fallbackUrl;
if (ethUrl) {
  fallbackUrl = ethUrl;
} else if (window.location.host.startsWith('localhost') || window.location.host.startsWith('127.0.0.1')) {
  fallbackUrl = 'http://localhost:8545';
} else if (window.location.host.startsWith('192.168.')) {
  fallbackUrl = `http://${window.location.hostname}:8545`;
} else if (contractsInfo['1']) {
  fallbackUrl = 'https://mainnet.infura.io/v3/c985560c1dc04aed8f2c0300aa5f5efa';
} else if (contractsInfo['77']) {
  fallbackUrl = 'https://sokol.poa.network';
} else if (contractsInfo['15001']) {
  fallbackUrl = 'https://testnetv3.matic.network';
} else if (contractsInfo['80001']) {
  fallbackUrl = 'https://rpc-mumbai.matic.today';
} else if (contractsInfo['4']) {
  fallbackUrl = 'https://rinkeby.infura.io/v3/c985560c1dc04aed8f2c0300aa5f5efa';
} else {
  fallbackUrl = `http://${window.location.hostname}:8545`;
}

if (process.browser) {
  fallbackUrl = window.params.fallbackUrl || fallbackUrl;
}

let portisAppID = '103d284a-b4b1-4b0b-b4ad-d0a0082930f7'; // use dev by default
if (window.location.host === 'dev.ethernal.world') {
  portisAppID = '103d284a-b4b1-4b0b-b4ad-d0a0082930f7';
} else if (window.location.host === 'alpha.ethernal.world') {
  portisAppID = '3a28d2a3-fbfa-4858-b0fb-cb74839586a2';
} else if (window.location.host === 'ethernal.world') {
  // TODO
}

// TODO ?
// autoConnectWhenOnlyOneChoice: false,
// supportedChainIds,
// autoLocalIfBuiltinNotAvailable: true,
// autoBuiltinIfOnlyLocal: true,
// reuseLastWallet: true,
// removeBuiltinFromChoiceIfNotPresent: true,

const walletStores = WalletStores({
  chainConfigs: contractsInfo,
  options: [
    // new PortisModuleLoader(portisAppID, {fallbackUrl: fallbackUrl, chainId: '31337'})
    'builtin'
  ],
});

if (typeof window !== 'undefined') {
  window.walletStores = walletStores;
}

const allExport = {
  ...walletStores,
  fallbackProvider: new JsonRpcProvider(fallbackUrl)
};

export const {wallet, transactions, builtin, chain, balance, flow, fallbackProvider} = allExport;
