class MapComponent {
  constructor(map) {
    this.map = map;
  }

  get rooms() {
    return this.map.rooms;
  }
}

module.exports = MapComponent;
