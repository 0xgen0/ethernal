const {assert} = require('chai');
const {ethers} = require('@nomiclabs/buidler');
const moment = require('moment');
const {Wallet, BigNumber, Contract} = require('ethers');
const {coordinatesToLocation} = require('../../backend/src/game/utils');
const {setupContracts, giveKeys, giveCoins, move, killingMove, waitFor, expectError, increaseTime} = require('../lib');

describe('Dungeon Keeper', function () {
  let setup, playerWallet, playerAddress, characterId, rooms, elements, taxPeriod;

  beforeEach(async function () {
    setup = await setupContracts({ useFixture: true });
    playerWallet = setup.playerWallet;
    playerAddress = setup.playerAddress;
    characterId = setup.characterId;
    rooms = await ethers.getContract('Rooms', playerAddress);
    elements = await ethers.getContract('Elements', playerAddress);
    taxPeriod = Number(await setup.dungeonContract.TAX_PERIOD());
    await giveKeys(characterId);
    await giveCoins(characterId);
  });

  it('calculate tax', async function () {
    assert.ok((await setup.readOnly.roomsTax(9, 1)).eq(1));
    assert.ok((await setup.readOnly.roomsTax(11, 1)).eq(2));
    assert.ok((await setup.readOnly.roomsTax(11, 2)).eq(4));
  });

  it('tax due date', async function () {
    const {taxDueDate} = await setup.dungeonContract.getCharacterInfo(characterId);
    assert.equal(taxDueDate.toString(), '0');
  });

  it('mint room on discovery', async function () {
    const location = await move(playerWallet, characterId, 0);
    assert.equal(BigNumber.from(await rooms.subOwnerOf(location)).toString(), BigNumber.from(playerAddress).toString());
  });

  it('can buy center room', async function () {
    assert.notEqual(
      BigNumber.from(await rooms.subOwnerOf(coordinatesToLocation('0,0'))).toString(),
      BigNumber.from(playerAddress).toString(),
    );
    await waitFor(playerWallet.tx('buyRoom', characterId));
    assert.equal(
      BigNumber.from(await rooms.subOwnerOf(coordinatesToLocation('0,0'))).toString(),
      BigNumber.from(playerAddress).toString(),
    );
  });

  describe('owns room', function () {
    let location;

    beforeEach(async function () {
      await waitFor(
        setup.transfererWallet.tx('batchTransferElementsOut', characterId, playerAddress, [0, 0, 0, 0, 0, 1000]),
      );
      location = await move(playerWallet, characterId, 0);
      await waitFor(rooms.setApprovalForAll(setup.dungeonContract.address, true));
      await waitFor(elements.setApprovalForAll(setup.dungeonContract.address, true));
    });

    it('number of active rooms', async function () {
      const count = await rooms.subBalanceOf(playerAddress);
      assert.equal(Number(count), 1);
    });

    it('cannot buy not foreclosed room', async function () {
      await expectError(await playerWallet.tx('buyRoom', characterId), 'not foreclosed');
    });

    it('buy foreclosed room', async function () {
      await killingMove(playerWallet, characterId, 2);
      const {taxDueDate} = await setup.dungeonContract.getCharacterInfo(characterId);
      await ethers.provider.send('evm_setNextBlockTimestamp', [Number(taxDueDate) + 100]);
      await waitFor(playerWallet.tx('buyRoom', characterId));
      assert.equal(
        BigNumber.from(await rooms.subOwnerOf(coordinatesToLocation('0,0'))).toString(),
        BigNumber.from(playerAddress).toString(),
      );
    });

    it('no fragment for move in your room', async function () {
      await killingMove(playerWallet, characterId, 2);
      await killingMove(playerWallet, characterId, 0);
      assert.equal(Number(await elements.balanceOf(playerAddress, 8)), 0);
    });

    it('set room data', async function () {
      await waitFor(setup.admin.updateRoomData(characterId, location, '1', [0,0,0,0,0,10,0,0]));
      assert.equal((await rooms.getData(location)).toString(), '1');
    });

    it('name room', async function () {
      await waitFor(playerWallet.tx('nameRoom', characterId, location, 'The Room'));
      const customName = await setup.dungeonContract.getCustomRoomName(location);
      assert.equal(customName, 'The Room');
    });

    it('tax due date', async function () {
      const {taxDueDate} = await setup.dungeonContract.getCharacterInfo(characterId);
      assert.ok(taxDueDate.gt(0));
      assert.ok(moment.unix(taxDueDate).isAfter(moment()));
      assert.ok(moment.unix(taxDueDate).isBefore(moment().add(30, 'days')));
    });

    it('pay tax', async function () {
      const before = (await setup.dungeonContract.getCharacterInfo(characterId)).taxDueDate;
      await waitFor(playerWallet.tx('payRoomsTax', characterId, 1));
      const after = (await setup.dungeonContract.getCharacterInfo(characterId)).taxDueDate;
      assert.ok(after.gt(before));
      assert.ok(after.eq(before.add(taxPeriod)));
    });

    it('cannot prepay more than one period', async function () {
      await expectError(await playerWallet.tx('payRoomsTax', characterId, 2), 'cannot prepay more');
    });

    it('pay tax for couple periods', async function () {
      const before = (await setup.dungeonContract.getCharacterInfo(characterId)).taxDueDate;
      await ethers.provider.send('evm_setNextBlockTimestamp', [Number(before) + taxPeriod]);
      await waitFor(playerWallet.tx('payRoomsTax', characterId, 2));
      const after = (await setup.dungeonContract.getCharacterInfo(characterId)).taxDueDate;
      assert.ok(after.add(taxPeriod).gt(before));
    });

    it('abandon room', async function () {
      await waitFor(playerWallet.tx('abandonRoom', characterId, location));
      assert.notEqual(
        BigNumber.from(await rooms.subOwnerOf(location)).toString(),
        BigNumber.from(playerAddress).toString(),
      );
    });

    it('abandoned room can be bought', async function () {
      await waitFor(playerWallet.tx('abandonRoom', characterId, location));
      await killingMove(playerWallet, characterId, 2);
      await waitFor(playerWallet.tx('buyRoom', characterId));
      assert.equal(
        BigNumber.from(await rooms.subOwnerOf(coordinatesToLocation('0,0'))).toString(),
        BigNumber.from(playerAddress).toString(),
      );
    });

    it('deactivate room', async function () {
      await waitFor(playerWallet.tx('deactivateRoom', characterId, location));
      assert.equal(Number(await rooms.subBalanceOf(playerAddress)), 0);
    });

    it('activate room', async function () {
      await waitFor(playerWallet.tx('deactivateRoom', characterId, location));
      await waitFor(playerWallet.tx('activateRoom', characterId, location));
      assert.equal(Number(await rooms.subBalanceOf(playerAddress)), 1);
    });

    it('monster kill clears data', async function () {
      await waitFor(setup.admin.monsterDefeated(location, '1', []));
      await waitFor(setup.admin.updateRoomData(characterId, location, '1', [0,0,0,0,0,10,0,0]));
      assert.equal((await rooms.getData(location)).toString(), '1');
      await killingMove(playerWallet, characterId, 2);
      assert.equal((await rooms.getData(location)).toString(), '0');
    });
  });
});
