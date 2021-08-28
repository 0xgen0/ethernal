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
  internal = {
    coordinates: null,
  };
  npc = 'map maker';

  get coordinates() {
    if (!this.internal.coordinates) {
      const loreRoom = this.dungeon.map.roomsByDistance().find(({kind}) => Number(kind) === 4)
      if (loreRoom) {
        this.internal.coordinates = loreRoom.coordinates;
      }
    }
    return this.internal.coordinates;
  }

  advance() {
    const coordinates = this.dungeon.character.coordinates(this.character);
    const rooms = Array.from(this.data);
    const currentRoomKind = Number(this.dungeon.map.rooms[coordinates].kind).toString();
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
