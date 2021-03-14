const {assert} = require('chai');
const {isBounty, isLocation, coordinatesToLocation, locationToBounty, bountyToLocation} = require('../../backend/src/game/utils');
const {setupContracts, waitFor, expectError} = require('../lib');

const COINS = '6';
const KEYS = '7';
const FRAGMENTS = '8';

describe('Bounty', function () {
  let setup, playerWallet, characterId, elements, playerAddress;

  const amounts = [0, 0, 0, 0, 0, 5, 0 ,0];

  beforeEach(async function () {
    setup = await setupContracts({ useFixture: true });
    playerWallet = setup.playerWallet;
    characterId = setup.characterId;
    elements = setup.elements;
    playerAddress = setup.playerAddress;
    await waitFor(setup.admin.updateCharacter(characterId, '1', '0', '0', '0', '0',
      [10, 10, 10, 10, 10, 10, 10, 10]))
  });

  it('location to bounty', function () {
    const location = coordinatesToLocation('0,1');
    assert.ok(isLocation(location));
    assert.ok(!isBounty(location));
    const bounty = locationToBounty(location);
    assert.ok(isBounty(bounty));
    assert.ok(!isLocation(bounty));
    const bountyLocation = bountyToLocation(bounty);
    assert.ok(isLocation(bountyLocation));
    assert.ok(!isBounty(bountyLocation));
  });

  it('adds bounty', async function () {
    const location = coordinatesToLocation('0,0');
    await waitFor(playerWallet.tx('addBounty', characterId, location, amounts));
    assert.equal(Number(await elements.subBalanceOf(locationToBounty(location), COINS)), 5);
  });

  it('room has to exist', async function () {
    const location = coordinatesToLocation('0,1');
    await expectError(await playerWallet.tx('addBounty', characterId, location, amounts));
  });

  describe('with bounty', function () {
    const reward = {
      hpChange: 0,
      xpGained: 0,
      gear: '0',
      durabilityChange: 0,
      balanceChange: [0,0,0,0,0,0,0,0],
    };

    beforeEach(async function () {
      await waitFor(playerWallet.tx('addBounty', characterId, coordinatesToLocation('0,0'), amounts));
    });

    it('claims', async function () {
      const location = coordinatesToLocation('0,0');
      await waitFor(setup.admin.monsterDefeated(location, '1', [{
        characterId,
        ...reward,
        bounty: amounts
      }]));
      assert.equal(Number(await elements.subBalanceOf(locationToBounty(location), COINS)), 0);
      assert.equal(Number(await elements.subBalanceOf(characterId, COINS)), 10);
    });

    it('cannot claim more', async function () {
      const location = coordinatesToLocation('0,0');
      await expectError(setup.admin.monsterDefeated(location, '1', [{
        characterId,
        ...reward,
        bounty: [0,0,0,0,0,6,0,0]
      }]));
    });
  })
});
