/* eslint-disable no-shadow,no-console */
import { derived } from 'svelte/store';
import { BigNumber, utils } from 'ethers';

import config from 'data/config';
import getDelegateKey from 'lib/delegateKey';
import characterChoice from 'stores/characterChoice';
import preDungeon from 'stores/preDungeon';
import wallet from 'stores/wallet';
import { fetchCache } from 'lib/cache';
import { coordinatesToLocation } from 'utils/utils';

const { arrayify, zeroPad, hexlify } = utils;
const uint256 = number => hexlify(zeroPad(arrayify(hexlify(number)), 32));

const gasPrice = BigNumber.from('1000000000').toHexString();

let lastWalletAddress;

let $data = { status: 'None' };
window.$preDungeonCheck = $data;

const store = derived(
  wallet,
  async ($wallet, set) => {
    const _set = obj => {
      $data = { ...$data, ...obj };
      console.log('pre dungeon check', $data);
      set($data);
    };

    if ($wallet.status === 'Ready') {
      if (lastWalletAddress !== $wallet.address) {
        lastWalletAddress = $wallet.address;
        _set({ status: 'Loading' });
        const delegateAccount = getDelegateKey($wallet.address);

        const checkCharacter = async () => {
          const characterId = await wallet.call('Player', 'getLastCharacterId', $wallet.address);
          const isDelegateReady = await wallet.call(
            'Player',
            'isDelegateFor',
            delegateAccount.address,
            $wallet.address,
          );
          const result = await wallet.call('Characters', 'fullOwnerOf', characterId);
          const isCharacterInDungeon =
            result.owner === wallet.getContract('Dungeon').address &&
            result.subOwner.eq(BigNumber.from($wallet.address));
          const balance = await wallet.getProvider().getBalance($wallet.address);
          // TODO should be free
          const insufficientBalance = balance.lt('1100000000000000000');
          return { characterId, isDelegateReady, isCharacterInDungeon, insufficientBalance };
        };

        const { characterId, isDelegateReady, isCharacterInDungeon, insufficientBalance } = await checkCharacter();

        let characterInfo;
        const { minBalance } = config($wallet.chainId);
        let refill = minBalance;
        try {
          characterInfo = await fetchCache(`characters/${characterId}`);
        } catch (e) {
          console.log('failed to fetch character info from cache');
        }

        let ressurectedId;
        if (characterInfo && !isCharacterInDungeon && characterInfo.status.status === 'dead') {
          const { Dungeon } = window.contracts; // TODO get contract elsewhere
          const topic = Dungeon.interface.getEventTopic(Dungeon.interface.events['Resurrect(uint256,uint256)']);
          const [ressurect] = await Dungeon.queryFilter({
            address: Dungeon.address,
            topics: [topic, uint256(characterId)],
          });
          if (ressurect) {
            ressurectedId = ressurect.args.newCharacterId;
          }
        }

        _set({
          status: 'Done',
          isDelegateReady,
          isCharacterInDungeon,
          characterId,
          characterInfo,
          ressurectedId,
          refill,
          insufficientBalance,
        });

        if (isCharacterInDungeon) {
          preDungeon.clear();
          characterChoice.clear();
        }

        store.checkBackIn = async value => {
          const gasEstimate = 4000000; // @TODO: proper estimation
          _set({ status: 'SigningBackIn', delegateAccount });
          let tx;
          try {
            tx = await wallet.tx(
              { gas: gasEstimate + 15000, gasPrice, value },
              'Player',
              'addDelegate',
              delegateAccount.address,
            );
            await tx.wait();
          } catch (e) {
            _set({ status: 'Error', error: { code: 'addDelegate', message: e.toString(), e, wallet } }); // TODO
          }
          const { isDelegateReady, isCharacterInDungeon, insufficientBalance } = await checkCharacter();
          _set({
            status: 'Done',
            isDelegateReady,
            isCharacterInDungeon,
            insufficientBalance,
          });
        };

        store.enter = async ({ ressurectedId, characterInfo }) => {
          const { location } = await fetchCache('entry');
          await wallet
            .tx(
              { gas: BigNumber.from(2000000).toHexString(), gasPrice },
              'Player',
              'enter',
              '0x0000000000000000000000000000000000000000',
              ressurectedId,
              '0',
              characterInfo.characterName,
              '0',
              location || coordinatesToLocation('0,0'),
            )
            .then(tx => tx.wait());
          const { isDelegateReady, isCharacterInDungeon, insufficientBalance } = await checkCharacter();
          _set({
            status: 'Done',
            isDelegateReady,
            isCharacterInDungeon,
            insufficientBalance,
          });
        };

        store.join = async ({ name, characterClass }) => {
          _set({ status: 'Joining' });
          const gasEstimate = BigNumber.from(2000000).toHexString();
          const { price } = config($wallet.chainId);
          const value = BigNumber.from(price).toHexString();

          const { location } = await fetchCache('entry');

          const tx = await wallet.tx(
            { gas: gasEstimate, gasPrice, value },
            'Player',
            'createAndEnter',
            delegateAccount.address,
            0,
            name,
            characterClass,
            location || coordinatesToLocation('0,0'),
          );
          const receipt = await tx.wait();
          console.log({ receipt });
          console.log('gas used for join', BigNumber.from(receipt.gasUsed).toString());

          const { isCharacterInDungeon, isDelegateReady } = await checkCharacter();

          if (isCharacterInDungeon) {
            preDungeon.clear();
            characterChoice.clear();
          }
          _set({
            firstTime: true,
            status: 'Done',
            isDelegateReady,
            isCharacterInDungeon,
          });
        };
      }
    } else {
      lastWalletAddress = null;
      _set({ status: 'None' });
    }
  },
  $data,
);

export default store;
