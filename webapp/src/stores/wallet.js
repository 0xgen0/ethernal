import WalletStore from 'svelte-wallet';
import * as PortisModule from 'svelte-wallet-portis';

import log from 'utils/log';

const wallet = WalletStore(log);
if (typeof window !== 'undefined') {
  window.wallet = wallet;
}
const ethUrl = ETH_URL;

export const contractData = {};

import('contractsInfo').then(contractsInfo => {
  const supportedChainIds = [];
  // eslint-disable-next-line no-restricted-syntax
  if (contractsInfo.chainId) {
    supportedChainIds.push(contractsInfo.chainId);
  } else {
    for (const chainId of Object.keys(contractsInfo)) {
      if (chainId !== 'default') {
        supportedChainIds.push(chainId);
      }
    }
  }

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
  // eslint-disable-next-line no-console
  console.log({ host: window.location.host, fallbackUrl });

  const hashParams = window.hashParams || {};
  const { privateKey } = hashParams;
  delete hashParams.privateKey;

  const disableBuiltInWallet =
    typeof window.params.disableBuiltInWallet !== 'undefined' ? window.params.disableBuiltInWallet !== 'false' : true;
  const useLocalKey = typeof window.params.useLocalKey !== 'undefined' ? window.params.useLocalKey !== 'false' : false;
  let walletTypes;
  if (privateKey) {
    walletTypes = [
      {
        id: 'local',
        localKey: privateKey,
      },
    ];
  } else {
    if (disableBuiltInWallet) {
      walletTypes = [];
    } else {
      walletTypes = ['builtin'];
    }

    if (useLocalKey) {
      walletTypes.push('local');
    } else {
      let portisAppID = '103d284a-b4b1-4b0b-b4ad-d0a0082930f7'; // use dev by default
      if (window.location.host === 'dev.ethernal.world') {
        portisAppID = '103d284a-b4b1-4b0b-b4ad-d0a0082930f7';
      } else if (window.location.host === 'alpha.ethernal.world') {
        portisAppID = '3a28d2a3-fbfa-4858-b0fb-cb74839586a2';
      } else if (window.location.host === 'ethernal.world') {
        // TODO
      }
      walletTypes.push(new PortisModule({ dappId: portisAppID }));
    }
  }

  // eslint-disable-next-line no-console
  console.log(`creating wallet`, { fallbackUrl, walletTypes, supportedChainIds });
  wallet.load({
    autoConnectWhenOnlyOneChoice: false,
    fallbackUrl,
    walletTypes, // TODO require user interaction to create a local Key (when claimKey available)
    supportedChainIds,
    autoLocalIfBuiltinNotAvailable: true,
    autoBuiltinIfOnlyLocal: true,
    reuseLastWallet: true,
    removeBuiltinFromChoiceIfNotPresent: true,
    // fetchInitialBalance: true,
    registerContracts: async ($wallet, chainId) => {
      // eslint-disable-next-line no-console
      console.log(`registering contracts on chain ${chainId}`);
      chainId = chainId || $wallet.chainId;
      let chainInfo = contractsInfo[chainId] && contractsInfo[chainId][0]; // TODO support multiple deployments ?
      if (!chainInfo) {
        const providedChain = Number(contractsInfo.chainId);
        if (Number(providedChain) === Number(chainId)) {
          chainInfo = contractsInfo;
        } else {
          throw new Error(
            `requested chainId is ${chainId}, only provided contracts info is for chain ${providedChain}`,
          );
        }
      }
      const { contracts } = chainInfo;
      contractData.contractsInfo = contracts;
      // TODO remove : (svelte-wallet will remove the need for that):
      // eslint-disable-next-line no-restricted-syntax
      for (const contractName of Object.keys(contracts)) {
        const contract = contracts[contractName];
        contract.contractInfo = { abi: contract.abi };
      }
      return contracts;
    },
  });
});

export default wallet;
