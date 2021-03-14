class MapComponent {
  constructor(map, rooms = null) {
    this.map = map;
    this.rooms = rooms;
  }

  async room(coordinates) {
    return this.rooms ? this.rooms[coordinates] : await this.map._room(coordinates);
  }
}

module.exports = MapComponent;
