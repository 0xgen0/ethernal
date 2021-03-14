// TODO move to the common library

const BN = require('bn.js');

const p255 = new BN(2).pow(new BN(255));
const p128 = new BN(2).pow(new BN(128));
const p64 = new BN(2).pow(new BN(64));
const p32 = new BN(2).pow(new BN(32));
const one = new BN(1);

const order = ['north', 'east', 'south', 'west'];
const directions = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
  ne: { x: 1, y: -1 },
  nw: { x: -1, y: 1 },
  se: { x: 1, y: 1 },
  sw: { x: -1, y: -1 },
};

const encodeDirections = path => path.map(direction => order.indexOf(direction));

const decodeDirections = bytes => {
  const path = [];
  if (bytes < 8) {
    return [order[bytes]];
  }
  while (bytes !== 8 && path.length < 5) {
    path.push(bytes % 4);
    bytes = bytes >> 4;
    if (path.length > 5) {
      return [order[bytes]];
    }
  }
  return path.reverse().map(n => order[n]);
};

const coordinatesInDirection = function (coordinates, direction) {
  const { x, y } = directions[typeof direction === 'number' ? order[direction] : direction];
  return coordinatesAt(coordinates, x, y);
};

const parseCoordinates = function (coordinates) {
  const [x, y, z = 0] = coordinates.split(',').map(Number);
  return { x, y, z };
};

const formatCoordinates = (coordinates, len = 3) => {
  const [x, y, z = 0] = coordinates.split(',').map(Number);
  return [x, y, z].slice(0, len).join(',');
};

const getCoordinatesFloor = coordinates => coordinates.split(',').map(Number)[2] || 0;

const coordinatesAt = (coordinates, dx, dy) => {
  const { x, y, z } = parseCoordinates(coordinates);
  return `${x + dx},${y + dy}` + (z !== 0 ? `,${z}` : '');
};

const overrideFloor = (coordinates, floor) => {
  const { x, y } = parseCoordinates(coordinates);
  const z = floor;
  return `${x},${y}` + (z !== 0 ? `,${z}` : '');
};

/**
 * list of coordinates in range around the origin
 *
 * @param coordinates of the origin
 * @param range around the origin
 * @returns {[]} list of coordinates
 */
const aroundCoordinates = (coordinates, range = 3) => {
  const { x, y, z } = parseCoordinates(coordinates);
  const floor = z !== 0 ? `,${z}` : '';
  const result = [];
  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      result.push(x + dx + ',' + (y + dy) + floor);
    }
  }
  return result;
};

const locationToAbsoluteCoordinates = function (location) {
  if (typeof location === 'object') {
    location = location.toString();
  }
  const dirNum = new BN(location);
  const x = dirNum.mod(p64);
  const y = dirNum.div(p64).mod(p64);
  const z = dirNum.div(p128).mod(p64);
  const a = dirNum.div(p255);
  return { x, y, z, a };
};

const isLocation = function (holder) {
  const { a } = locationToAbsoluteCoordinates(holder);
  return one.eq(a);
};

const convertLocation = n => Number((n.gte(p32) ? n.sub(p64) : n.mod(p64)).toString(10));
const convertCoordinate = n => (n.lt(new BN(0)) ? n.add(p64) : n.mod(p64));

const locationToCoordinates = function (location) {
  const { x, y, z } = locationToAbsoluteCoordinates(location);
  const cx = convertLocation(x);
  const cy = convertLocation(y);
  const cz = convertLocation(z);
  return cx + ',' + cy + (cz === 0 ? '' : ',' + cz);
};

const coordinatesToLocation = function (coordinates) {
  const { x, y, z } = parseCoordinates(coordinates);
  const ax = convertCoordinate(new BN(x).mod(p64));
  const ay = convertCoordinate(new BN(y).mod(p64)).mul(p64);
  const az = convertCoordinate(new BN(z).mod(p64)).mul(p128);
  return p255.add(ax).add(ay).add(az).toString(10);
};

const decodeExits = function (exitBits) {
  const exitsBits = Number(exitBits);
  const exits = {
    north: (exitsBits & 1) === 1,
    east: (exitsBits & 2) === 2,
    south: (exitsBits & 4) === 4,
    west: (exitsBits & 8) === 8,
  };
  const locksBits = exitsBits >> 4;
  const locks = {
    north: (locksBits & 1) === 1 && exits.north,
    east: (locksBits & 2) === 2 && exits.east,
    south: (locksBits & 4) === 4 && exits.south,
    west: (locksBits & 8) === 8 && exits.west,
  };
  return { exits, locks };
};

const bfs = (rooms, moves, start = '0,0', keys = null, limit = 5, showPath = true, ignoreMonsters = false) => {
  const q = [];
  const visited = {
    [start]: {
      ...rooms[start],
      parent: {
        distance: 0,
        usedKeys: 0,
      },
    },
  };
  q.push(start);
  while (q.length > 0) {
    const origin = visited[q.shift()];
    const usedExits = (moves.visitedRooms[origin.coordinates] && moves.visitedRooms[origin.coordinates].usedExits) || {};
    if (origin.allExits && origin.parent.distance < limit && (ignoreMonsters || !origin.hasMonster)) {
      let availableDirections = Object.keys(origin.allExits).filter(dir => origin.allExits[dir]);
      if (keys !== null && origin.parent.usedKeys >= keys) {
        availableDirections = availableDirections.filter(
          direction =>
            !origin.locks || !origin.locks[direction] || (origin.locks[direction] && usedExits[direction]),
        );
      }
      for (const direction of availableDirections) {
        const coordinates = coordinatesInDirection(origin.coordinates, direction);
        const room = rooms[coordinates] || { status: 'undiscovered', coordinates };
        if (!visited[coordinates]) {
          visited[coordinates] = {
            ...room,
            parent: {
              coordinates: origin.coordinates,
              distance: origin.parent.distance + 1,
              exit: direction,
              usedKeys: origin.parent.usedKeys + Number(origin.locks[direction]),
            },
          };
          if (showPath) {
            visited[coordinates].parent.path = path(visited, coordinates);
          }
          q.push(coordinates);
        }
      }
    }
  }
  return visited;
};

const path = function (bfs, to) {
  const { parent } = bfs[to];
  if (parent.distance > 0) {
    return [...path(bfs, parent.coordinates), parent.exit];
  } else {
    return [];
  }
};

const identity = v => v;

module.exports = {
  encodeDirections,
  decodeDirections,
  isLocation,
  bfs,
  path,
  decodeExits,
  identity,
  parseCoordinates,
  formatCoordinates,
  getCoordinatesFloor,
  aroundCoordinates,
  overrideFloor,
  coordinatesAt,
  locationToAbsoluteCoordinates,
  convertLocation,
  convertCoordinate,
  locationToCoordinates,
  coordinatesToLocation,
  order,
  directions,
  coordinatesInDirection,
};
