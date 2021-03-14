const Sentry = require('@sentry/node');
const seedrandom = require('seedrandom');
const { coordinatesInDirection, directions, order } = require('../utils');
const MapComponent = require('./mapComponent.js');

class RoomShape extends MapComponent {
  async neighbors(room, onlyRooms = true, onlyOlder = true) {
    const rooms = await Promise.all(
      Object.keys(directions).map(async direction => [
        direction,
        await this.room(coordinatesInDirection(room.coordinates, direction)),
      ]),
    );
    return rooms.reduce((r, [direction, n]) => {
      if (onlyRooms && n && n.corridor) {
        n = null;
      }
      if (onlyOlder && n && (n.blockNumber ? n.blockNumber > room.blockNumber : true)) {
        n = null;
      }
      return { ...r, [direction]: n };
    }, {});
  }

  emptySpaceAroundRoom(room, expansions, neighbors) {
    const exp = { north: 0, south: 0, east: 0, west: 0, ...expansions };
    const { north, south, west, east, ne, nw, se, sw } = neighbors;
    const empty = {};
    try {
      empty.north = Math.max(
        ne && ne.expansions.west > -exp.east ? ne.expansions.south : -1,
        nw && nw.expansions.east > -exp.west ? nw.expansions.south : -1,
        north ? north.expansions.south : -1,
      );
      empty.south = Math.max(
        se && se.expansions.west > -exp.east ? se.expansions.north : -1,
        sw && sw.expansions.east > -exp.west ? sw.expansions.north : -1,
        south ? south.expansions.north : -1,
      );
      empty.west = Math.max(
        nw && nw.expansions.south > -exp.north ? nw.expansions.east : -1,
        sw && sw.expansions.north > -exp.south ? sw.expansions.east : -1,
        west ? west.expansions.east : -1,
      );
      empty.east = Math.max(
        ne && ne.expansions.south > -exp.north ? ne.expansions.west : -1,
        se && se.expansions.north > -exp.south ? se.expansions.west : -1,
        east ? east.expansions.west : -1,
      );
    } catch (e) {
      // TODO resolve
      Sentry.withScope(scope => {
        scope.setExtras({ room, expansions, empty });
        Sentry.captureException(e);
      });
      console.log('failed to calculate empty space', room.coordinates, e);
    }
    return empty;
  }

  async generate(room) {
    if (room.coordinates === '0,0') {
      if (process.env.EXPANSION) {
        return {
          expansions: {
            north: 0,
            east: 0,
            south: 0,
            west: 0,
          },
          corridor: false,
        };
      } else {
        return {
          expansions: {
            north: -0.5,
            east: -0.5,
            south: -0.5,
            west: -0.5,
          },
          corridor: false,
        };
      }
    }
    const random = seedrandom(room.hash);
    const [neighboringRooms, neighbors] = await Promise.all([
      this.neighbors(room),
      this.neighbors(room, false),
    ]);
    const regularRoom = Number(room.kind) === 1;
    const exits = Object.entries(room.allExits)
      .filter(([, exit]) => exit)
      .map(([dir]) => dir);
    const isRoom = !regularRoom || exits.length !== 2 || neighboringRooms.length > 2;
    const expansions = order.reduce((expansions, dir) => {
      const empty = this.emptySpaceAroundRoom(room, expansions, neighbors)[dir];
      const rand = getRandomInt(0, 2, random);
      let expansion;
      if (!isRoom && !exits.includes(dir)) {
        expansion = -0.5;
      } else if (empty > -1) {
        expansion = -empty;
      } else {
        expansion = [0.5, 0, -0.5][rand];
      }
      if (!regularRoom || process.env.EXPANSION) {
        expansion = -0.5;
      }
      return {
        ...expansions,
        [dir]: expansion,
      };
    }, {});
    return { expansions, corridor: !isRoom };
  }
}

function getRandomInt(min, max, generator) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(generator() * (max - min + 1)) + min;
}

module.exports = RoomShape;
