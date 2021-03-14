const { assert } = require('chai');
const { distribute } = require('../src/game/utils.js');
const { distributeBalance } = require('../src/data/utils.js');

describe('Combat', () => {

  describe('Bounty', () => {

    it('ratios', () => {
      const ratios = {
        '1': 0.3,
        '3': 0.3,
        '2': 0.4
      };
      const value = 4;

      const result = distribute(ratios, value);
      assert.equal(result[2], 2);
      assert.equal(result[3], 1);
      assert.equal(result[1], 1);
      assert.equal(value, Object.values(result).reduce((a,b) => a + b, 0));
    });

    it('ratios sum less than 1', () => {
      const ratios = {
        '3': 0.4,
        '2': 0.3
      };
      const value = 4;

      const result = distribute(ratios, value);
      assert.equal(result[3], 3);
      assert.equal(value, Object.values(result).reduce((a,b) => a + b, 0));
    });

    it('ratios of nothing', () => {
      const value = 4;
      assert.ok(distribute({ '3': 0, '2': 0 }, value));
      assert.ok(distribute({}, value));
      assert.equal(distribute({ '3': 0, '2': 0 }, value)[2], 4);
    });

    // TODO rebalance ratios
    it.skip('ratios are rebalanced', () => {
      const ratios = {
        '3': 0.1,
        '1': 0.1,
        '2': 0
      };
      const value = 4;

      const result = distribute(ratios, value);
      assert.equal(result[3], 2);
      assert.equal(result[1], 2);
      assert.equal(value, Object.values(result).reduce((a,b) => a + b, 0));
    });

    it('distribute balance', () => {
      const ratios = {
        '1': 0.3,
        '3': 0.3,
        '2': 0.4
      };

      const allocations = distributeBalance(ratios, { coins: 5, keys: 2 });
      assert.equal(allocations[2].coins, 3)
    });
  });

});
