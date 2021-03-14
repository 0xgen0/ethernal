const {ethers, getChainId} = require('@nomiclabs/buidler');
const {assert} = require('chai');

const TOKEN_ID = 8;

async function main() {
  const admin = await ethers.getContract('DungeonAdmin');
  const elements = await ethers.getContract('Elements');
  const fragments = [
    ['mrq', 1000, '0x9A068A38Af6e66cE6992B3AE19faf11ca861Ae13', '1'],
  ];
  const players = fragments.map(a => a[2]);
  const amounts = fragments.map(a => a[1]);
  if (players.length !== amounts.length) {
    throw new Error('number of players and amounts is not consistent');
  }
  console.log('chain id', await getChainId());
  console.log('elements address', elements.address);
  if (Number(await elements.balanceOf(players[0], TOKEN_ID)) !== 0) {
    throw new Error('player already has fragments!');
  }
  console.log(`minting ${amounts.reduce((a, b) => a + b)} fragments for ${players.length} players`);
  const tx = await admin.batchMineVaultElements(TOKEN_ID, players, amounts, {gasPrice: '1000000000'});
  console.log(tx.hash);
  await tx.wait();
  console.log('checking');
  for (let i = 0; i < players.length; i++) {
    console.log(players[i], Number(await elements.balanceOf(players[i], TOKEN_ID)), amounts[i]);
  }
  console.log('ok');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
