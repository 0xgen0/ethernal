const monsters = require('../../data/monsters.js');
const { monsterLevel, copy } = require('../../data/utils');
const Ability = require('./ability');

class Monster extends Ability {
  price = { fragments: 1 };
  data = '11';
  requirements = {
    income: 0,
    kind: ['1'],
  };
  monster = { type: 'trash' };

  async checkRequirements(character, coordinates) {
    const { hasMonster } = await this.dungeon.room(coordinates);
    if (hasMonster) {
      throw new Error('room has monster already');
    }
    await super.checkRequirements(character, coordinates);
  }

  async applyRoomDataUpdate(coordinates, data) {
    if (data === this.data) {
      const ofLevel = monsters.flat().filter(({ stats }) => stats.level === monsterLevel(coordinates));
      const ofType = ofLevel.filter(({ type }) => type === this.monster.type);
      const { id } = copy(ofType.length === 0 ? ofLevel[0] : ofType[0]);
      await this.dungeon.randomEvents.spawnMonster(coordinates, id);
    }
  }
}

class MiniBoss extends Monster {
  price = { fragments: 3 };
  data = '22';
  requirements = {
    income: 500,
    kind: ['1'],
  };
  monster = { type: 'mini boss' };
}

class SpecificMonster extends Monster {
  constructor(dungeon, monster) {
    super(dungeon);
    this.monster = copy(monster);
    this.data = this.monster.id.toString();
    let fragments = 2 + this.monster.stats.level / 2;
    if (this.monster.type === 'mini boss') {
      fragments += 1 + fragments / 2;
    }
    fragments = Math.ceil(fragments);
    this.price = { fragments }
  }

  async checkRequirements(character, coordinates) {
    if (this.monster.stats.level > monsterLevel(coordinates)) {
      throw new Error('level of the area too low for this monster');
    }
    await super.checkRequirements(character, coordinates);
  }

  async applyRoomDataUpdate(coordinates, data) {
    if (data === this.data) {
      await this.dungeon.randomEvents.spawnMonster(coordinates, this.data);
    }
  }
}

function specificMonsters(dungeon) {
  return monsters
    .flat()
    .filter(({type}) => type !== 'big boss')
    .map((monster, i) => {
      const ability = new SpecificMonster(dungeon, monster);
      ability.requirements.income = i * 10;
      return ability;
    }).reduce((m, a) => ({...m, [a.data]: a}), {});
}

module.exports = { Monster, MiniBoss, SpecificMonster, specificMonsters };
