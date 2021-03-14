const {assert} = require('chai');
const {ethers, getNamedAccounts} = require('@nomiclabs/buidler');
const {setupContracts, giveCoins, waitFor, zeroAddress, expectError} = require('../lib');

const COINS = '6';
const KEYS = '7';
const FRAGMENTS = '8';

describe('Elements', function () {
  let setup, playerWallet, transfererWallet, characterId, elements, playerAddress;

  beforeEach(async function () {
    setup = await setupContracts();
    playerWallet = setup.playerWallet;
    transfererWallet = setup.transfererWallet;
    characterId = setup.characterId;
    elements = setup.elements;
    playerAddress = setup.playerAddress;
    await waitFor(setup.admin.updateCharacter(characterId, '1', '0', '0', '0', '0',
      [10, 10, 10, 10, 10, 10, 10, 10]))
  });

  it('has coins', async function () {
    for (let i = 1; i <= 8; i++) {
      assert.ok(Number(await elements.subBalanceOf(characterId, i)) > 0);
    }
    assert.equal(Number(await elements.subBalanceOf(characterId, COINS)), 10);
  });

  it('batch mint fragments', async function () {
    const {users} = await getNamedAccounts();
    await waitFor(
      setup.admin.batchMineVaultElements(
        FRAGMENTS,
        users,
        users.map(() => 7),
      ),
    );
    for (const address of users) {
      assert.equal(Number(await elements.balanceOf(address, FRAGMENTS)), 7);
    }
  });

  describe('mint to vault', function () {
    it('mint to address', async function () {
      const { data } = await elements.populateTransaction.mintTo(playerAddress, COINS, 10);
      await waitFor(setup.admin.forward(elements.address, data));
      assert.equal(Number(await elements.balanceOf(playerAddress, COINS)), 10);
      assert.equal(Number(await elements.subBalanceOf('0', COINS)), 0);
    });

    it('submint to character', async function () {
      assert.equal(Number(await elements.balanceOf(setup.dungeonContract.address, COINS)), 10);
      assert.equal(Number(await elements.subBalanceOf(characterId, COINS)), 10);
    });

    it('submint', async function () {
      const {data} = await elements.populateTransaction.subMint(FRAGMENTS, 10);
      await waitFor(setup.admin.forward(elements.address, data));
      assert.equal(Number(await elements.subBalanceOf('0', FRAGMENTS)), 10);
    });

    it('mint to address is transferable', async function () {
      const playerElements = await ethers.getContract('Elements', playerAddress);
      const playerTransferer = await ethers.getContract('DungeonTokenTransferer', playerAddress);
      await waitFor(playerElements.setApprovalForAll(setup.transfererContract.address, true));
      assert.ok(await elements.isApprovedForAll(playerAddress, setup.transfererContract.address));

      const mint = (await elements.populateTransaction.mintTo(playerAddress, KEYS, 10)).data;
      await waitFor(setup.admin.forward(elements.address, mint));

      const submint = (await elements.populateTransaction.subMint(KEYS, 100)).data;
      await waitFor(setup.admin.forward(elements.address, submint));

      await waitFor(playerTransferer.batchTransferElementsIn(characterId, [0, 0, 0, 0, 0, 0, 10, 0]));
      assert.equal(Number(await elements.balanceOf(playerAddress, KEYS)), 0);
      assert.equal(Number(await elements.subBalanceOf(characterId, KEYS)), 20);
    });

    it('mint to vault', async function () {
      await setup.admin.batchMineVaultElements(KEYS, [playerAddress], [10]);
      assert.equal(Number(await elements.balanceOf(playerAddress, KEYS)), 10);
      assert.equal(Number(await elements.subBalanceOf('0', KEYS)), 10);
    });
  });

  describe('transferable', function () {
    it('transferer is approved for transfers', async function () {
      assert.ok(await elements.isApprovedForAll(setup.dungeonContract.address, setup.transfererContract.address));
    });

    it('drop', async function () {
      await waitFor(transfererWallet.tx('dropElements', characterId, [0, 0, 0, 0, 0, 5]));
      assert.equal(Number(await elements.subBalanceOf(characterId, COINS)), 5);
    });

    it('drop fire', async function() {
      await waitFor(transfererWallet.tx('dropElements', characterId, [5,0,0,0,0,0]));
      assert.equal(Number(await elements.subBalanceOf(characterId, 1)), 5);
    });

    it('drop element', async function() {
      assert.equal(Number(await elements.subBalanceOf(characterId, 1)), 10);
      await waitFor(transfererWallet.tx('dropElements', characterId, [5,0,0,0,0,0,0,0]));
      assert.equal(Number(await elements.subBalanceOf(characterId, 1)), 5);
    });

    it('pick', async function () {
      await waitFor(transfererWallet.tx('dropElements', characterId, [0, 0, 0, 0, 0, 5]));
      await waitFor(transfererWallet.tx('pickElement', characterId, COINS, 5));
      assert.equal(Number(await elements.subBalanceOf(characterId, COINS)), 10);
    });

    it('to vault', async function () {
      await waitFor(transfererWallet.tx('batchTransferElementsOut', characterId, playerAddress, [0, 0, 0, 0, 0, 5]));
      assert.equal(Number(await elements.subBalanceOf(characterId, COINS)), 5 - 1); // -1 is carrier cost
      assert.equal(Number(await elements.balanceOf(playerAddress, COINS)), 5);
      assert.equal(Number(await elements.subBalanceOf('0', COINS)), 5);
    });

    it('from vault', async function () {
      await waitFor(transfererWallet.tx('batchTransferElementsOut', characterId, playerAddress, [0, 0, 0, 0, 0, 5]));
      const playerElements = await ethers.getContract('Elements', playerAddress);
      const playerTransferer = await ethers.getContract('DungeonTokenTransferer', playerAddress);
      await waitFor(playerElements.setApprovalForAll(setup.transfererContract.address, true));
      assert.ok(await elements.isApprovedForAll(playerAddress, setup.transfererContract.address));
      await waitFor(playerTransferer.batchTransferElementsIn(characterId, [0, 0, 0, 0, 0, 5]));
      assert.equal(Number(await elements.balanceOf(playerAddress, COINS)), 0);
      assert.equal(Number(await elements.subBalanceOf(characterId, COINS)), 10 - 2); // -2 is carrier cost
    });
  });
});
