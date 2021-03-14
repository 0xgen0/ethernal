const {assert} = require('chai');
const {BigNumber} = require('ethers');
const {setupContracts, randomMove, expectError, waitFor, zeroAddress} = require('../lib');

describe('Death', function () {
  let setup, playerWallet, characterId, admin, dungeonContract;

  beforeEach(async function () {
    setup = await setupContracts();
    playerWallet = setup.playerWallet;
    characterId = setup.characterId;
    admin = setup.admin;
    dungeonContract = setup.dungeonContract;
    await waitFor(
      admin.updateCharacter(characterId, '1', '-50', '100', '0', '0', ['1', '1', '1', '1', '1', '1', '1', '1']),
    );
  });

  it('cannot move', async function () {
    await expectError(playerWallet.tx('move', characterId, '0'));
  });

  describe('resurrect', function () {
    it('cannot resurrect if not dead', async function () {
      const {playerWallet, characterId} = await setupContracts();
      await expectError(playerWallet.tx('resurrectFrom', characterId));
    });

    it('can resurrect, enter and move', async function () {
      const receipt = await waitFor(playerWallet.tx('resurrectFrom', characterId));
      let resurrectEvent = receipt.events.find(({event}) => event === 'Resurrect');
      const newCharacterId = resurrectEvent.args.newCharacterId;
      await waitFor(
        setup.playerContract.functions.enter(zeroAddress, newCharacterId, BigNumber.from(0), 'new name', '0', '0'),
      );
      await waitFor(
        admin.updateCharacter(newCharacterId, '1', '0', '0', '0', '0', ['0', '0', '0', '0', '0', '0', '0', '10000']),
      );
      const {attackGear, defenseGear} = await dungeonContract.getCharacterInfo(newCharacterId);
      assert.ok(Number(attackGear), 'no default attack gear');
      assert.ok(Number(defenseGear), 'no default defense gear');
      await randomMove({...setup, characterId: newCharacterId});
    });

    it('cannot change class', async function () {
      const receipt = await waitFor(playerWallet.tx('resurrectFrom', characterId));
      let resurrectEvent = receipt.events.find(({event}) => event === 'Resurrect');
      const {newCharacterId} = resurrectEvent.args;
      const newClass = '1';
      await waitFor(
        setup.playerContract.functions.enter(zeroAddress, newCharacterId, BigNumber.from(0), 'new name', newClass, '0'),
      );
      const bytes = await setup.gears.getData(newCharacterId);
      const data = await setup.readOnly.decodeCharacterData(bytes);
      assert.notEqual(data.class, newClass);
    });

    it('can be resurrected only once', async function () {
      await waitFor(playerWallet.tx('resurrectFrom', characterId));
      try {
        const tx = await playerWallet.tx('resurrectFrom', characterId);
        await tx.wait();
        assert.fail('error expected');
      } catch (e) {
        assert.ok(e.toString().indexOf('sender is not delegate of character') !== -1, 'different error expected');
      }
    });
  });
});
