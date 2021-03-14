import * as ethers from 'ethers';

// dec2hex :: Integer -> String
// i.e. 0-255 -> '00'-'ff'
const dec2hex = dec => `0${dec.toString(16)}`.substr(-2);

// generateRandomKey :: Void -> String
const generateRandomKey = () => {
  // eslint-disable-next-line prefer-const
  let arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return `0x${Array.from(arr, dec2hex).join('')}`;
};

const delegateKey = player => {
  let key;
  const dataS = localStorage.getItem(player); // @TODO: on accounts changed, need to reset // easiest solution : reload page on account change
  let data;
  if (dataS) {
    data = JSON.parse(dataS);
  }
  if (!data || !data.key) {
    key = generateRandomKey();
    try {
      localStorage.setItem(player, JSON.stringify({ key }));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('could not save to storage');
    }
  } else {
    key = data.key;
  }
  return {
    address: new ethers.Wallet(key).address,
    privateKey: key,
  };
};

export default delegateKey;
