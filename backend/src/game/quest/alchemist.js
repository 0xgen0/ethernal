const Quest = require('./quest');

class Alchemist extends Quest {
  floor = 0;
  npc = 'recycler';
  reward = {
    gear: {
      id: 2111112,
      image: 'keeper_key.png',
      level: 0,
      maxDurability: 0,
      name: 'Dungeon Keeper Key',
      slotType: 'accessory',
      rarity: 'common',
      actions: [],
    }
  };

  get coordinates() {
    return this.data;
  }

  canAccept() {
    return true;
  }

  async spawnNPC() {
    if (this.status === 'claiming') {
      await super.spawnNPC({ personal: true });
    }
  }

  async handleUpdate() {
    await this.spawnNPC();
    if (this.status === 'completed') {
      await super.removeNPC();
    }
  }

  advanceHandler({ move }) {
    if (move && move.discovered) {
      if (this.status === 'discovered') {
        this.changeStatus('accepted');
      }
      this.changeStatus('claiming');
      this.data = move.to;
      return true;
    }
    return false;
  }
}

module.exports = Alchemist;
