const { coordinatesInDirection, order } = require('../utils');
const MapComponent = require('./mapComponent.js');

class Exits extends MapComponent {
  async opositeExit(coordinates, direction) {
    const room = await this.room(coordinatesInDirection(coordinates, direction));
    if (room) {
      const reverseDirection = order[(direction + 2) % 4];
      const { exits, locks } = room;
      return [exits && !!exits[reverseDirection], locks && !!locks[reverseDirection]];
    } else {
      return [false, false];
    }
  }

  async validExit(room, direction) {
    const currentRoom = room;
    const nextRoom = await this.room(coordinatesInDirection(room.coordinates, direction));
    const cb = currentRoom.blockNumber;
    const nb = nextRoom && nextRoom.blockNumber ? nextRoom.blockNumber : 0;
    const fromCurrent =
      (direction === 0 && [currentRoom.exits.north, currentRoom.locks.north]) ||
      (direction === 1 && [currentRoom.exits.east, currentRoom.locks.east]) ||
      (direction === 2 && [currentRoom.exits.south, currentRoom.locks.south]) ||
      (direction === 3 && [currentRoom.exits.west, currentRoom.locks.west]);
    const fromDst = await this.opositeExit(room.coordinates, direction);
    if (cb < nb || nb === 0) {
      return fromCurrent;
    } else if (cb > nb) {
      return fromDst;
    } else {
      return fromCurrent[0] ? fromCurrent : fromDst;
    }
  }

  async forRoom(room) {
    const allLocks = {};
    const allExits = {};
    await Promise.all(
      order.map(async (direction, num) => {
        const [exit, lock] = await this.validExit(room, num);
        allExits[direction] = exit;
        allLocks[direction] = lock;
    }));
    return { allLocks, allExits };
  }
}

module.exports = Exits;
