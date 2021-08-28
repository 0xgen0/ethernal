class DungeonComponent {
  constructor(dungeon) {
    this.dungeon = dungeon;
  }

  registerEventHandlers() {}

  async fetchAll(fromBlock = 0, toBlock = 'latest') {}

  get sockets() {
    return this.dungeon.sockets;
  }

  get contracts() {
    return this.dungeon.contracts;
  }
}

module.exports = DungeonComponent;
