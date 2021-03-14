const Ability = require('./ability');

class Chest extends Ability {
  price = { fragments: 5 };
  name = 'Chest';
  image = 'item_chest.png';
  data = '33';
  requirements = {
    income: 25,
  };
  chest = true;

  async applyRoomDataUpdate(coordinates, data) {
    if (data === this.data) {
      await this.dungeon.randomEvents.spawnChest(coordinates);
    }
  }
}

module.exports = Chest;
