const TRANSITIONS = require('./transitions');

class Quest {
  floor = 0;
  status = 'discovered';
  data = {};
  rules = {};
  npc;

  constructor(dungeon, character) {
    this.dungeon = dungeon;
    this.character = character;
  }

  canAccept() {
    return this.dungeon.character.coordinates(this.character) === this.coordinates;
  }

  accept() {
    if (this.status === 'accepted') {
      throw new Error('quest already accepted');
    }
    if (this.canAccept()) {
      this.changeStatus('accepted');
    } else {
      throw new Error('cannot accept quest');
    }
  }

  advance(data) {
    // not implemented
    throw new Error('cannot advance');
  }

  advanceHandler(data) {
    // not implemented
    return false;
  }

  claimRewards() {
    // no reward
  }

  spawnNPC(data = {}) {
    if (this.npc && this.coordinates) {
      this.dungeon.randomEvents.spawnClonedNPC(this.coordinates, this.npc, data);
    }
  }

  removeNPC() {
    if (this.npc && this.coordinates) {
      this.dungeon.randomEvents.removeClonedNPC(this.coordinates, this.npc);
      this.dungeon.quests.respawnNPC(this.coordinates);
    }
  }

  handleUpdate() {
    // not implemented
  }

  changeStatus(status, data = this.data) {
    if (!TRANSITIONS[this.status].includes(status)) {
      throw new Error(`invalid state transition ${this.status} -> ${status}`);
    }
    this.status = status;
    this.data = data;
    return this;
  }

  decodeData(data) {
    return JSON.parse(data);
  }

  encodeData(data) {
    return JSON.stringify(data);
  }

  get progress() {
    return null;
  }

  get floor() {
    return 0;
  }

  get coordinates() {
    return null;
  }

  toJSON() {
    return {
      ...this,
      dungeon: undefined,
      internal: undefined,
      progress: this.progress,
      floor: this.floor,
      coordinates: this.coordinates,
    };
  }
}

module.exports = Quest;
