import { derived } from 'svelte/store';
import { Wallet, BigNumber, utils } from 'ethers';

import {wallet, chain, fallbackProvider} from 'stores/wallet';
import log from 'utils/log';
import { rebuildLocationHash } from 'utils/web';

const hashParams = window.hashParams || {};
const claimKey = hashParams.dungeonKey;
const clearClaimKey = () => {
  delete hashParams.dungeonKey;
  rebuildLocationHash(hashParams);
  hashParams.dungeonKey = claimKey; // keep it in memory // @TODO: remove, local wallet creation need to be driven by claim
};

// @TODO: ?const allowLocalKey = typeof window.params.allowLocalKey !== 'undefined'? window.params.allowLocalKey !== 'false' : false;

let $claim = {
  status: claimKey ? 'Loading' : 'None',
  claimKey,
  // allowLocalKey
};
window.$claim = $claim;

let claimWallet;
const store = derived(
  [wallet, chain],
  async ([$wallet, $chain], set) => {
    const _set = obj => {
      $claim = { ...$claim, ...obj };
      log.info('CLAIM', JSON.stringify($claim, null, '  '));
      set($claim);
    };

    const gasPrice = BigNumber.from('1000000000'); // await provider.getGasPrice();
    const gasLimit = BigNumber.from(21000);
    const gasFee = gasLimit.mul(gasPrice);
    const extraValue = BigNumber.from('100000000000000');
    const minimum = gasFee.add(extraValue);
    const maximum = BigNumber.from('4000000000000000000'); // @TODO: config)

    if (claimKey && typeof $claim.rawBalance === 'undefined') {
      try {
        claimWallet = new Wallet(claimKey);
        const provider = fallbackProvider;
        if (provider) {
          console.log("checking claim balance...");
          let claimBalance = await fallbackProvider.getBalance(claimWallet.address);
          if (claimBalance.lt(minimum)) {
            claimBalance = BigNumber.from(0);
          }
          if (claimBalance.gt(maximum)) {
            claimBalance = maximum;
          }
          // eslint-disable-next-line no-console
          console.log({
            address: claimWallet.address,
            status: 'WaitingWallet',
            rawBalance: claimBalance,
            balance: utils.formatUnits(claimBalance, 18),
          });
          _set({
            status: 'WaitingWallet',
            rawBalance: claimBalance,
            balance: utils.formatUnits(claimBalance, 18),
          });
        }
      } catch (e) {
        console.log('error while checking claim key', e);
        const claimBalance = BigNumber.from(0);
        _set({
          status: 'WaitingWallet',
          rawBalance: claimBalance,
          balance: utils.formatUnits(claimBalance, 18),
        });
      }
    }

    async function claim() {
      _set({ status: 'Loading' });
      const provider = wallet.provider;

      let claimingTxHash;
      const localStorageKeyForClaimTxHash = `${$wallet.address}_${$chain.chainId}_claimTxHash`;
      try {
        claimingTxHash = localStorage.getItem(localStorageKeyForClaimTxHash);
      } catch (err) {
        //
      }

      if (claimingTxHash && claimingTxHash !== '') {
        _set({ status: 'WaitingOldTx' });

        const tx = await provider.getTransaction(claimingTxHash);
        if (tx) {
          const receipt = await tx.wait();
          if (tx.blockNumber) {
            if (receipt.status === 1) {
              _set({ status: 'Claimed' });
              clearClaimKey();
              return;
            }
            _set({ status: 'Failed' });
          } else {
            const txReceipt = await tx.wait();
            if (txReceipt.status === 1) {
              _set({ status: 'Claimed' });
              clearClaimKey();
              return;
            }
            _set({ status: 'Failed' });
          }
        } else {
          log.trace(`cannot find tx ${claimingTxHash}`);
        }
      }

      const claimBalance = await provider.getBalance(claimWallet.address);
      log.trace({ claimBalance });

      const claimValue = BigNumber.from('5000000000000000000'); // @TODO: from Config 5 DAI
      if (claimBalance.gte(minimum)) {
        const signer = claimWallet.connect(provider);
        let value = claimBalance.sub(gasFee);
        const maxValue = BigNumber.from(claimValue);
        if (value.gt(maxValue)) {
          value = maxValue;
        }
        _set({ status: 'Claiming' });

        const tx = await signer.sendTransaction({
          to: $wallet.address,
          value,
          gasLimit,
          gasPrice,
        });
        localStorage.setItem(localStorageKeyForClaimTxHash, tx.hash);
        _set({ status: 'WaitingTx' });

        const receipt = await tx.wait();
        if (receipt.status === 1) {
          _set({ status: 'Claimed' });
          clearClaimKey();
          return;
        }
        _set({ status: 'Failed' });
      } else {
        _set({ status: 'Gone' });
      }
      clearClaimKey();
    }

    store.claim = claim;
    store.acknowledge = () => {
      _set({ status: 'None' });
    };
  },
  $claim,
);

export default store;
