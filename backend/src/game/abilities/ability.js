const { bn } = require('../utils');
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

  checkRequirements(character, coordinates) {
    const room = this.dungeon.rooms[coordinates];
    if (this.requirements.kind && !this.requirements.kind.includes(room.kind.toString())) {
      throw new Error('cannot use ability on this kind of room');
    }
    const { fragments } = this.dungeon.keeper.characterIncome(character);
    if (this.requirements.income > fragments) {
      throw new Error('income not high enough');
    }
    if (this.client) {
      throw new Error('has to be called from client wallet');
    }
  }

  async use(character, coordinates) {
    this.checkRequirements(character, coordinates);
    const { location } = this.dungeon.rooms[coordinates];
    const data = this.data;
    if (data !== this.data[location]) {
      const { DungeonAdmin } = this.dungeon.contracts;
      const tx = await DungeonAdmin.updateRoomData(
        character,
        bn(location),
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

  applyRoomDataUpdate(coordinates, data, previous) {
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
