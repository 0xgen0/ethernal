const {ethers, getChainId} = require('@nomiclabs/buidler');
const {assert} = require('chai');

const TOKEN_ID = 8;

async function main() {
  const admin = await ethers.getContract('DungeonAdmin');
  const elements = await ethers.getContract('Elements');
  const {data} = await elements.populateTransaction.subMint(TOKEN_ID, 100000);
  const tx = await admin.forward(elements.address, data);
  await tx.wait()
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
