import log from 'utils/log';
import { coordinatesInDirection } from 'utils/utils';
import Dungeon from './dungeon';

class Moves {
  constructor() {
    this.visitedRooms = {};
  }

  visitRoom(coordinates) {
    if (!this.visitedRooms[coordinates]) {
      this.visitedRooms[coordinates] = { coordinates };
    }
    return this.visitedRooms[coordinates];
  }

  isExitVisited(coordinates, direction) {
    return (
      this.visitedRooms[coordinates] &&
      this.visitedRooms[coordinates].usedExits &&
      this.visitedRooms[coordinates].usedExits[direction]
    );
  }

  useExits(move) {
    const from = this.visitRoom(move.from);
    let to;

    if (move.mode === 0) {
      try {
        to = this.useExit(from, Dungeon.moveToDirection(move));
      } catch (e) {
        log.info('invalid move', move, e);
      }
    }

    if (move.mode === 2) {
      const { path } = move;
      if (!path) {
        log.info('path missing for move, cannot determine unlocked exits correctly', move);
        return;
      }
      try {
        to = path.reduce((room, direction) => this.useExit(room, direction), from);
      } catch (e) {
        log.info('invalid move', move, e);
      }
    }

    if (to && to.coordinates !== move.to) {
      log.info('path is inconsistent with destination', move);
    }
  }

  useExit(from, direction) {
    const to = this.visitRoom(coordinatesInDirection(from.coordinates, direction));
    from.usedExits = from.usedExits || {};
    to.usedExits = to.usedExits || {};
    from.usedExits[direction] = true;
    to.usedExits[Dungeon.reverseDirection(direction)] = true;
    return to;
  }
}

export default Moves;
