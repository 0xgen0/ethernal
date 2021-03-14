const {ethers, deployments, getNamedAccounts, getChainId} = require('@nomiclabs/buidler');
const {BigNumber} = require('ethers');
const fetch = require('node-fetch');
const webappConfig = require('../../webapp/src/data/config');

const server = 'https://ethernal.prod.tmcloud.io';
const minimalBalance = '100000000000000';

async function main() {
  const {deployer} = getNamedAccounts();
  const batch = await ethers.getContract('Batch');

  const characters = [];
  let id = 1;
  while (true) {
    const character = await fetch(server + '/characters/' + id).then(r => r.json());
    if (!character.player) {
      break;
    }
    characters.push(character);
    id++;
  }
  console.log('fetched characters', characters.length);

  const balances = await Promise.all(
    characters.map(async ({player}) => {
      return ethers.provider.getBalance(player).then(balance => ({player, balance}));
    }),
  );

  const receivers = balances.filter(({balance}) => balance.lt(minimalBalance));

  console.log('characters with low balance', receivers.length);

  if (receivers.length > 0) {
    const addresses = receivers.map(character => character.player);
    const value = BigNumber.from(minimalBalance).mul(addresses.length);
    console.log('sending to', addresses.length, value.toString());
    console.log(await batch.transfer(addresses, {value, gasLimit: BigNumber.from('1000000'), gasPrice: '1000000000'}));
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
