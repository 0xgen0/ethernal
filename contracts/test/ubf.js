const moment = require('moment');
const {ethers} = require('@nomiclabs/buidler');
const { assert } = require('chai');
const {BigNumber} = require('ethers');
const {setupContracts, ether, getEnergy, waitFor} = require('../lib');

describe('UBF', function () {
  let setup, ubf, ubfWallet, playerAddress, characterId, initialEnergy;

  beforeEach(async function () {
    setup = await setupContracts();
    ubf = await ethers.getContract('UBF', playerAddress);
    ethers.provider.getSigner(playerAddress).sendTransaction({
      from: playerAddress,
      to: ubf.address,
      value: BigNumber.from('100000000000000000000')
    });
    ubfWallet = setup.ubfWallet;
    playerAddress = setup.playerAddress;
    characterId = setup.characterId;
    initialEnergy = await getEnergy(playerAddress);
  });

  it('info', async function () {
    const {claimed, nextSlotTime, ubfBalance} = await ubf.getInfo(playerAddress);
    assert.ok(!claimed);
    assert.ok(ubfBalance.gt(0));
    assert.equal(ether(ubfBalance), 100);
    console.log('next slot:', moment.unix(nextSlotTime).toISOString());
  });

  async function checkRefill(receipt) {
    const { claimed, ubfBalance } = await ubf.getInfo(playerAddress);
    assert.ok(claimed);
    const { newEnergy } = setup.playerContract.interface.parseLog(receipt.logs[0]).args;
    assert.equal(ether(newEnergy), 0.4)
    const refilled = await getEnergy(playerAddress);
    assert.ok(initialEnergy.lt(refilled), `${ether(initialEnergy)} < ${ether(refilled)}`);
    assert.ok(100 > ether(ubfBalance));
  }

  it('claim', async function () {
    const receipt = await waitFor(ubf.claimUBF());
    await checkRefill(receipt);
  });

  it('claim with metatransaction', async function () {
    const receipt = await ubfWallet.tx('claimUBFAsCharacter', characterId).then(tx => tx.wait());
    await checkRefill(receipt);
  });
});
