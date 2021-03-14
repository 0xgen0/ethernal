const Quest = require('./quest');

class CanaryFragments extends Quest {
  reward = {
    balance: {
      fragments: 100
    }
  };
  quick = true;
  npc = 'recycler';

  static async initSharedData(dungeon) {
    const coordinates = '0,0';
    await dungeon.randomEvents.spawnClonedNPC(coordinates, 'recycler');
    return { coordinates };
  }

  get coordinates() {
    return this.shared && this.shared.coordinates;
  }

  canAccept() {
    return true;
  }

  async accept() {
    await super.accept();
    this.changeStatus('claiming')
  }

  async claimRewards() {
    const tx = await this.dungeon.contracts.DungeonAdmin.updateCharacter(
      this.character,
      0,
      0,
      0,
      0,
      0,
      [0, 0, 0, 0, 0, 0, 0, this.reward.balance.fragments],
    );
    await tx.wait();
  }
}

module.exports = CanaryFragments;
