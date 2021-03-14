const { bn, coordinatesToLocation } = require('../utils');
const { balanceToAmounts } = require('../../data/utils');

class Ability {
  price = { fragments: 2 };
  requirements = {
    income: 0,
    kind: null,
  };
  data = '0';

  constructor(dungeon) {
    this.dungeon = dungeon;
  }

  async checkRequirements(character, coordinates) {
    const room = await this.dungeon.room(coordinates);
    if (this.requirements.kind && !this.requirements.kind.includes(room.kind.toString())) {
      throw new Error('cannot use ability on this kind of room');
    }
    const { fragments } = await this.dungeon.keeper.characterIncome(character);
    if (this.requirements.income > fragments) {
      throw new Error('income not high enough');
    }
    if (this.client) {
      throw new Error('has to be called from client wallet');
    }
  }

  async use(character, coordinates) {
    await this.checkRequirements(character, coordinates);
    const data = this.data;
    if (data !== await this.dungeon.keeper.data(coordinates)) {
      const { DungeonAdmin } = this.dungeon.contracts;
      const tx = await DungeonAdmin.updateRoomData(
        character,
        bn(coordinatesToLocation(coordinates)),
        bn(this.data),
        balanceToAmounts(this.price),
        { gasLimit: 700000 }
      );
      await tx.wait();
    } else {
      throw new Error('room has the same data already');
    }
    return data;
  }

  applyRoomDataUpdate(coordinates, data) {
    // not implemented
  }

  toJSON() {
    return {
      ...this,
      dungeon: undefined,
      data: undefined,
    };
  }
}

module.exports = Ability;
