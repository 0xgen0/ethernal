const {assert} = require('chai');
const {ethers} = require('@nomiclabs/buidler');
const {setupContracts, giveGear, waitFor, zeroAddress, expectError} = require('../lib');

describe('Gear', function () {
  let setup, playerWallet, transfererWallet, characterId, gears, id, gear;

  beforeEach(async function () {
    setup = await setupContracts();
    playerWallet = setup.playerWallet;
    transfererWallet = setup.transfererWallet;
    characterId = setup.characterId;
    gears = setup.gears;
    gear = '1';
    await waitFor(
      setup.admin.updateCharacter(characterId, '0', '0', '0', '0', '0', ['0', '0', '0', '0', '0', '0', '0', '-10000']),
    );
    id = await giveGear(characterId, gear);
  });

  it('has gear', async function () {
    assert.equal(Number(await gears.subOwnerOf(id)), Number(characterId));
  });

  describe('recyclabe', function () {
    it('reward calculation', async function () {
      for (const [level, durability, maxDurability, reward] of [
        [0, 1, 10, 1],
        [0, 10, 10, 2],
        [1, 100, 100, 2],
        [4, 1, 3, 3],
        [4, 3, 3, 5],
        [9, 1, 100, 5],
        [9, 0, 0, 8],
      ]) {
        const gearData = await setup.readOnly.encodeGearData(level, 0, 15, durability, maxDurability, 1);
        assert.equal(Number(await setup.readOnly.recyclingReward([gearData])), reward);
      }
    });

    it('reward calculation total', async function () {
      assert.equal(
        Number(
          await setup.readOnly.recyclingReward([
            await setup.readOnly.encodeGearData(0, 0, 15, 1, 10, 1),
            await setup.readOnly.encodeGearData(0, 0, 15, 1, 10, 1),
          ]),
        ),
        2,
      );
    });

    it('can recycle', async function () {
      assert.equal(Number(await setup.elements.subBalanceOf(characterId, 8)), 0);
      await playerWallet.tx('recycle', characterId, [id]);
      assert.equal(Number(await gears.subOwnerOf(id)), 0);
      assert.equal(Number(await setup.elements.subBalanceOf(characterId, 8)), 2);
    });

    it('you have to own gear that you recycle', async function () {
      await playerWallet.tx('recycle', characterId, [id]);
      await expectError(playerWallet.tx('recycle', characterId, [id]));
      assert.equal(Number(await setup.elements.subBalanceOf(characterId, 8)), 2);
    });
  });

  describe('transferable', function () {
    it('transferer is approved for transfers', async function () {
      assert.ok(await gears.isApprovedForAll(setup.dungeonContract.address, setup.transfererContract.address));
    });

    it('drop', async function () {
      await waitFor(transfererWallet.tx('drop', characterId, id));
      assert.notEqual(Number(await gears.subOwnerOf(id)), Number(characterId));
    });

    it('pick', async function () {
      await waitFor(transfererWallet.tx('drop', characterId, id));
      await waitFor(transfererWallet.tx('pick', characterId, id));
      assert.equal(Number(await gears.subOwnerOf(id)), Number(characterId));
    });

    it('pick after other player dropped it', async function () {
      await waitFor(transfererWallet.tx('drop', characterId, id));
      await waitFor(
        setup.admin.updateCharacter(characterId, '1', '-50', '100', '0', '0', ['1', '1', '1', '1', '1', '1', '1', '1']),
      );
      const receipt = await waitFor(setup.playerWallet.tx('resurrectFrom', characterId));
      let resurrectEvent = receipt.events.find(({event}) => event === 'Resurrect');
      const {newCharacterId} = resurrectEvent.args;
      await waitFor(setup.playerContract.functions.enter(zeroAddress, newCharacterId, '0', 'new name', '0', '0'));
      await waitFor(transfererWallet.tx('pick', newCharacterId, id));
      assert.equal(Number(await gears.subOwnerOf(id)), Number(newCharacterId));
    });
  });
});
