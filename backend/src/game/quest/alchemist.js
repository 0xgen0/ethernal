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

  spawnNPC() {
    if (this.status === 'claiming') {
      super.spawnNPC({ personal: true });
    }
  }

  handleUpdate() {
    this.spawnNPC();
    if (this.status === 'completed') {
      super.removeNPC();
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
