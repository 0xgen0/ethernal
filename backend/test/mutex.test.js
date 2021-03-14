const { assert } = require('chai');
const Promise = require('bluebird');
const Mutex = require('../src/db/mutex');
const { delay } = require('../src/data/utils');

describe('Mutex', () => {

  let mutex, cnt;

  beforeEach(() => {
    mutex = new Mutex();
    cnt = 0;
  });

  const inc = async () => {
    const s = cnt;
    await delay(10);
    cnt = s + 1;
    return cnt;
  };

  it('parallel conflict', async () => {
    const results = await Promise.all([
      inc(),
      inc(),
      inc(),
    ]);
    results.forEach(n => assert.equal(n, 1));
    assert.equal(cnt, 1);
  });

  it('run exclusively', async () => {
    const results = await Promise.all([
      mutex.run(1, inc),
      mutex.run(1, inc),
      mutex.run(1, inc),
    ]);
    results.forEach((n, i) => assert.equal(n, i + 1));
    assert.equal(cnt, 3);
  });

  it('serial each', async () => {
    await Promise.each(new Array(3), inc);
    assert.equal(cnt, 3);
  });

  it('parallel map', async () => {
    const results = await Promise.map(new Array(3), inc);
    results.forEach((n, i) => assert.equal(n, 1));
    assert.equal(cnt, 1);
  });

  it('series map', async () => {
    const results = await Promise.mapSeries(new Array(3), inc);
    results.forEach((n, i) => assert.equal(n, i + 1));
    assert.equal(cnt, 3);
  });

});
