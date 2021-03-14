const Quest = require('./quest');

class Minimap extends Quest {
  floor = 0;
  reward = {
    gear: {
      id: 2111111,
      image: 'item_map.png',
      level: 0,
      maxDurability: 0,
      name: 'Portable map',
      slotType: 'accessory',
      rarity: 'common',
      actions: [],
    }
  };
  data = [];
  rules = {
    roomTypes: ['4'],
  };
  npc = 'map maker';

  static async initSharedData(dungeon) {
    const rooms = await dungeon.map.roomsByDistance();
    const loreRoom = rooms.find(({kind}) => Number(kind) === 4);
    if (loreRoom) {
      const { coordinates } = loreRoom;
      await dungeon.randomEvents.spawnClonedNPC(coordinates, 'map maker');
      return { coordinates };
    }
  }

  get coordinates() {
    return this.shared && this.shared.coordinates;
  }

  async accept() {
    await super.accept();
    this.data = [];
  }

  async advance() {
    const room = await this.dungeon.character.room(this.character);
    const { coordinates, kind } = room;
    const rooms = Array.from(this.data);
    const currentRoomKind = Number(kind).toString();
    if (!rooms.includes(coordinates)
      && this.rules.roomTypes.includes(currentRoomKind)
      && coordinates !== this.coordinates
      && rooms.length < this.progress.goal
    ) {
      rooms.push(coordinates);
      if (rooms.length === this.progress.goal) {
        this.changeStatus('claiming');
      }
    } else {
      throw new Error('cannot advance');
    }
    this.data = rooms;
  }

  get progress() {
    const rooms = this.data;
    return { current: rooms.length, goal: 2 };
  }
}

module.exports = Minimap;
