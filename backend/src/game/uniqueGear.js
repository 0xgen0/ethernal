const moment = require('moment');
const { randomItem } = require('../data/utils');
const data = require('../data/uniqueGears.js');

class Series {
  constructor(gears) {
    this.available = new Map();
    this.dropsSince = null;
    this.given = new Map();
    gears.forEach(gear => this.available.set(gear.id, gear));
  }

  get gears() {
    return [...this.available.values(), ...this.given.values()];
  }

  since(time) {
    this.dropsSince = time;
    return this;
  }

  give({ id }) {
    const gear = this.available.get(id);
    if (gear) {
      this.available.delete(id);
      this.given.set(id, gear);
    }
    return gear;
  }

  reject({ id }) {
    const gear = this.given.get(id);
    if (gear) {
      this.given.delete(id);
      this.available.set(id, gear);
    }
    return gear;
  }

  roll() {}

  pickRandomGear() {
    return randomItem([...this.available])[1];
  }

  get canDrop() {
    return this.available.size && (this.dropsSince ? this.dropsSince.isBefore(moment()) : true);
  }

  giveRandomly() {
    if (this.canDrop) {
      const gear = this.roll();
      if (gear) {
        return this.give(gear);
      }
    }
    return null;
  }
}

class AlphaOne extends Series {
  constructor(data, dungeon) {
    super(data);
    this.dungeon = dungeon;
  }

  roll() {
    const numRooms = Object.keys(this.dungeon.rooms).length;
    const result = Math.random() * 100 < 5 && numRooms > 555 * (this.given.size + 1);
    if (result) {
      const [gear] = this.available;
      return gear;
    } else {
      return null;
    }
  }
}

class RareArt extends Series {
  roll() {
    const result = Math.random() * 100 < 0.12;
    return result ? this.pickRandomGear() : null;
  }
}

class UniqueGear {
  constructor(dungeon) {
    this.series = [new AlphaOne(data[0], dungeon), new RareArt(data[1]).since(moment.utc('2020-06-26 22:00'))];
    this.gearIds = new Set(
      this.series
        .map(s => s.gears)
        .flat()
        .map(g => g.id),
    );
  }

  isUnique({ id }) {
    return this.gearIds.has(id);
  }

  give(gear = {}) {
    let given = null;
    if (this.isUnique(gear)) {
      this.series.find(s => (given = s.give(gear)));
    }
    return given;
  }

  reject(gear) {
    let rejected = null;
    if (this.isUnique(gear)) {
      this.series.find(s => (rejected = s.reject(gear)));
    }
    return rejected;
  }

  giveRandomly() {
    let given = null;
    this.series.find(s => (given = s.giveRandomly()));
    return given;
  }

  get available() {
    return this.series.reduce((a, s) => [...a, ...s.available.values()], []);
  }
}

module.exports = UniqueGear;
