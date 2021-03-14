const TRANSITIONS = require('./transitions');

class Quest {
  floor = 0;
  status = 'discovered';
  data = {};
  rules = {};
  npc;

  constructor(dungeon, character, id) {
    this.dungeon = dungeon;
    this.character = character;
    this.id = id;
  }

  static async initSharedData(dungeon) {
    return {};
  }

  async canAccept() {
    const coordinates = await this.dungeon.character.coordinates(this.character);
    return coordinates === this.coordinates;
  }

  async accept() {
    if (this.status === 'accepted') {
      throw new Error('quest already accepted');
    }
    if (await this.canAccept()) {
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

  async spawnNPC(data = {}) {
    if (this.npc && this.coordinates) {
      await this.dungeon.randomEvents.spawnClonedNPC(this.coordinates, this.npc, { character: this.character, quest: this.id, ...data });
    }
  }

  async removeNPC() {
    if (this.npc && this.coordinates) {
      await this.dungeon.randomEvents.removeClonedNPC(this.coordinates, this.npc);
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
    try {
      return JSON.parse(data);
    } catch (e) {
      return data;
    }
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

  get shared() {
    return this.dungeon.quests.shared[this.id];
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
