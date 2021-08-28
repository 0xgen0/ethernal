const Quest = require('./quest');

class CanaryFragments extends Quest {
  reward = {
    balance: {
      fragments: 100
    }
  };
  quick = true;
  npc = 'recycler';

  get coordinates() {
    return '0,0';
  }

  canAccept() {
    return true;
  }

  accept() {
    super.accept();
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
