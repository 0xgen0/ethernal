const moment = require('moment');
const { assert } = require('chai');
const UniqueGear = require('../src/game/uniqueGear.js')

describe('UniqueGear', () => {

  let uniqueGear;

  beforeEach(() => {
    const mapMock = {rooms: []};
    uniqueGear = new UniqueGear(mapMock);
    uniqueGear.series.forEach(s => s.since(null));
  });

  it('initialized', () => assert.ok(uniqueGear));

  it('has available gear', () => {
    assert.ok(uniqueGear.available.length);
  });

  it('has gear ids', () => {
    assert.equal(uniqueGear.gearIds.size, uniqueGear.available.length)
  })

  it('is unique check', () => {
    const [gear] = uniqueGear.available;
    assert.equal(uniqueGear.isUnique(gear), true);
    assert.equal(uniqueGear.isUnique({id: 1}), false);
  });

  it('gives specific gear', () => {
    const [gear] = uniqueGear.available;
    const given = uniqueGear.give(gear);
    assert.equal(given, gear);
  });

  it('only once', () => {
    const [gear] = uniqueGear.available;
    uniqueGear.give(gear);
    const given = uniqueGear.give(gear);
    assert.equal(given, null);
    const [another] = uniqueGear.available;
    assert.notEqual(another, gear);
  });

  it('can be rejected and given again', () => {
    const [gear] = uniqueGear.available;
    uniqueGear.give(gear);
    uniqueGear.reject(gear);
    const given = uniqueGear.give(gear);
    assert.equal(given, gear);
    const [another] = uniqueGear.available;
    assert.notEqual(another, gear);
  });

  it('gives something randomly', () => {
    let tries = 0;
    let gear = null;
    do {
      gear = uniqueGear.giveRandomly();
      tries++;
    } while (!gear && tries < 100000);
    assert.ok(gear);
  });

  describe('RareArt', () => {

    let rareArt;

    beforeEach(() => {
      rareArt = uniqueGear.series[1];
    })

    it('exists', () => assert.ok(rareArt));

    it('has gear', () => {
      const {size} = rareArt.available;
      assert.ok(size);
      assert.equal(size, 6);
      const [[_,first]] = rareArt.available;
      assert.equal(first.name, "Rare Art - antelope + botanica");
    });

    it('cannot be given before time', () => {
      assert.equal(rareArt.canDrop, true);
      rareArt.since(moment().add(1, 'hour'));
      assert.equal(rareArt.canDrop, false);
    });

    it('can be given out randomly', () => {
      const byId = (a, b) => a.id - b.id;
      const toBeGiven = [...rareArt.available.values()];
      const given = [];
      let tries = 0;
      do {
        const gear = uniqueGear.giveRandomly();
        if (gear) {
          given.push(gear);
        }
        tries++;
      } while (rareArt.available.size && tries < 100000);
      assert.deepEqual(toBeGiven.sort(byId), given.sort(byId));
      console.log('tries needed', tries / given.length);
      console.log('moves needed', (tries / given.length) * 4);
    });
  });
});
