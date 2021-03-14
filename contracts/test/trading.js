const { assert } = require('chai');
const { ethers } = require('@nomiclabs/buidler');
const {setupContracts, giveGear, waitFor, zeroAddress, expectError} = require('../lib');

describe("Trading", () => {

  let setup, playerWallet, transferer, seller, buyer, gears, id, gear, admin, coins, elements;

  beforeEach(async () => {
    setup = await setupContracts();
    playerWallet = setup.playerWallet;
    transferer = setup.transfererContract;
    elements = setup.elements;
    seller = setup.characterId;
    gears = setup.gears;
    admin = setup.admin;
    gear = '1';
    coins = 100;
    id = await giveGear(seller, gear);
    // TODO better way of creating second character in tests
    await waitFor(admin.updateCharacter(seller, '1', '-50', '100', '0', '0', ['0', '0', '0', '0', '0', '0', '0', '0']));
    const receipt = await waitFor(setup.playerWallet.tx('resurrectFrom', seller));
    let resurrectEvent = receipt.events.find(({event}) => event === 'Resurrect');
    const {newCharacterId} = resurrectEvent.args;
    await waitFor(setup.playerContract.functions.enter(zeroAddress, newCharacterId, '0', 'new name', '0', '0'));
    await waitFor(admin.updateCharacter(newCharacterId, '0', '0', '0', '0', '0', ['0', '0', '0', '0', '0', coins, '0', '0']));
    buyer = newCharacterId;
    assert.equal(Number(await gears.subOwnerOf(gear)), Number(seller));
    assert.equal(Number(await elements.subBalanceOf(buyer, 6)), Number(coins));
  });

  it('only dungeon can perform sale', async () => {
    try {
      await waitFor(transferer.sellGear(seller, buyer, gear, coins));
      assert.fail('error expected');
    } catch (e) {
      assert.ok(e);
      assert.equal(Number(await gears.subOwnerOf(gear)), Number(seller));
      assert.equal(Number(await elements.subBalanceOf(buyer, 6)), Number(coins));
    }
  });

  it('sell gear for coins', async () => {
    const {data} = await transferer.populateTransaction.sellGear(seller, buyer, gear, coins);
    await waitFor(admin.forward(transferer.address, data));
    assert.equal(Number(await gears.subOwnerOf(gear)), Number(buyer));
    assert.equal(Number(await elements.subBalanceOf(seller, 6)), Number(coins));
  });

  it('has to have coins', async () => {
    const {data} = await transferer.populateTransaction.sellGear(seller, buyer, gear, coins * 2);
    try {
      await waitFor(admin.forward(transferer.address, data));
      assert.fail('error expected');
    } catch (e) {
      assert.ok(e);
      assert.equal(Number(await gears.subOwnerOf(gear)), Number(seller));
      assert.equal(Number(await elements.subBalanceOf(buyer, 6)), Number(coins));
    }
  });

  it('has to have gear', async () => {
    const {data} = await transferer.populateTransaction.sellGear(seller, buyer, gear + 1, coins);
    try {
      await waitFor(admin.forward(transferer.address, data));
      assert.fail('error expected');
    } catch (e) {
      assert.ok(e);
      assert.equal(Number(await gears.subOwnerOf(gear)), Number(seller));
      assert.equal(Number(await elements.subBalanceOf(buyer, 6)), Number(coins));
    }
  });

  describe('exchange', async () => {

    let sellerOffer, buyerOffer;

    beforeEach(() => {
      sellerOffer = {
        characterId: seller,
        gears: [gear],
        amounts: [0,0,0,0,0,0,0,0]
      };
      buyerOffer = {
        characterId: buyer,
        gears: [],
        amounts: [0,0,0,0,0,coins,0,0]
      };
    });

    it('gear for coins', async () => {
      const {data} = await transferer.populateTransaction.exchange(sellerOffer, buyerOffer);
      await waitFor(admin.forward(transferer.address, data));
      assert.equal(Number(await gears.subOwnerOf(gear)), Number(buyer));
      assert.equal(Number(await elements.subBalanceOf(seller, 6)), Number(coins));
    });

    it('event emitted', async () => {
      const {data} = await transferer.populateTransaction.exchange(sellerOffer, buyerOffer);
      const receipt = await waitFor(admin.forward(transferer.address, data));
      const event = receipt.logs.map(log => {
        try {
          return transferer.interface.parseLog(log);
        } catch (e) {
          return null;
        }
      }).filter(a => a).find(({name}) => name === 'Exchange');
      assert.ok(event);
      assert.equal(Number(event.args.sale.gears[0]), Number(gear));
      assert.equal(Number(event.args.price.amounts[5]), Number(coins));
    });

    it('coins for gear', async () => {
      const {data} = await transferer.populateTransaction.exchange(buyerOffer, sellerOffer);
      await waitFor(admin.forward(transferer.address, data));
      assert.equal(Number(await gears.subOwnerOf(gear)), Number(buyer));
      assert.equal(Number(await elements.subBalanceOf(seller, 6)), Number(coins));
    });
  });

});
