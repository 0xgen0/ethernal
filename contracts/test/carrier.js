const {assert} = require('chai');
const {ethers} = require('@nomiclabs/buidler');
const {coordinatesToLocation} = require('../../backend/src/game/utils');
const {setupContracts, waitFor, giveGear, giveCoins, expectError} = require('../lib');

describe('Carrier', function () {
  describe('gear', function () {
    let setup, transfererWallet, characterId, gears, id, playerAddress, transfererContract, characters;

    beforeEach(async function () {
      setup = await setupContracts();
      transfererWallet = setup.transfererWallet;
      characterId = setup.characterId;
      gears = await ethers.getContract('Gears', playerAddress);
      playerAddress = setup.playerAddress;
      transfererContract = setup.transfererContract;
      characters = setup.characters;
      await giveCoins(characterId, 2);
      id = await giveGear(characterId);
    });

    it('carrier cost', async function () {
      for (const [coordinates, cost] of [
        ['0,0', 1],
        ['30,0', 10],
        ['300,0', 100],
      ]) {
        assert.equal(await setup.readOnly.carrierCost(coordinatesToLocation(coordinates)), cost);
      }
    });

    it('transfer out of the dungeon', async function () {
      await waitFor(transfererWallet.tx('batchTransferGearOut', characterId, playerAddress, [id]));
      assert.equal(await gears.ownerOf(id), playerAddress);
      assert.equal(await gears.subOwnerOf(id), '0');
    });

    // this is now possible but have no effect except user lose their gears // we could add a safeBatchTransferFrom option
    it.skip('cannot transfer directly without transferer', async function () {
      await waitFor(transfererWallet.tx('batchTransferGearOut', characterId, playerAddress, [id]));
      await expectError(await gears.batchTransferFrom(playerAddress, setup.dungeonContract.address, [id]));
      assert.equal(await gears.ownerOf(id), playerAddress);
    });

    it('approve transfers', async function () {
      await waitFor(gears.setApprovalForAll(transfererContract.address, true));
      assert.ok(await gears.isApprovedForAll(playerAddress, transfererContract.address));
    });

    it('transfer to the dungeon', async function () {
      await waitFor(transfererWallet.tx('batchTransferGearOut', characterId, playerAddress, [id]));
      await waitFor(gears.setApprovalForAll(transfererContract.address, true));
      await waitFor(transfererContract.batchTransferGearIn(characterId, [id]));
      assert.equal(await gears.ownerOf(id), setup.dungeonContract.address);
      assert.equal(Number(await gears.subOwnerOf(id)), Number(characterId));
    });

    it('has to have coin', async function () {
      await waitFor(transfererWallet.tx('batchTransferGearOut', characterId, playerAddress, [id]));
      await waitFor(gears.setApprovalForAll(transfererContract.address, true));
      await waitFor(transfererContract.batchTransferGearIn(characterId, [id]));
      await expectError(
        await transfererWallet.tx('batchTransferGearOut', characterId, playerAddress, [id]),
        'does not own enough',
      );
    });
  });
});
