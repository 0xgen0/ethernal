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

  applyRoomDataUpdate(coordinates, data, previous) {
    if (data === this.data) {
      this.dungeon.randomEvents.spawnChest(coordinates);
    }
  }
}

module.exports = Chest;
