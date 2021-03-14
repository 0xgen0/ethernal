const { BigNumber } = require('ethers');

const bn = number => BigNumber.from(number);

const p255 = bn(2).pow(bn(255));
const p254 = bn(2).pow(bn(254));
const p128 = bn(2).pow(bn(128));
const p64 = bn(2).pow(bn(64));
const p32 = bn(2).pow(bn(32));
const one = bn(1);

const order = ['north', 'east', 'south', 'west'];
const directions = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
  ne: { x: 1, y: -1 },
  nw: { x: -1, y: -1 },
  se: { x: 1, y: 1 },
  sw: { x: -1, y: 1 },
};

function getRing(coordinates) {
  const [x, y] = coordinates.split(',').map(Math.abs).map(Number);
  return Math.max(x, y);
}

function kills(level, type = 'trash') {
  if (type === 'big boss') {
    type = 'mini boss';
  }
  const monster = {
    'trash': [10, 12, 14, 16, 18, 20, 24, 28, 32, 36],
    'mini boss': [4, 6, 6, 7, 7, 8, 8, 9, 10, 11],
  };
  return monster[type][level];
}

const xpd = [10, 39, 70, 89, 120, 196, 302, 443, 443];

function generateCoins(level, type = 'trash', exact = false) {
  const k = kills(level, type);
  const burn = (((1 + level) ** 3) / 5) + 8;
  const ratio = type === 'mini boss' && level === 0 ? 0.5 : 1;
  let coins = (ratio * burn) / k;
  if (type === 'big boss') {
    coins *= 3;
  }
  return !exact ? range(coins) : coins;
}

function generateXp(level, type = 'trash', exact = false) {
  const k = kills(level, type);
  let xp = type === 'trash' ? xpd[level] / k * 0.75 : xpd[level] * 0.5 / k;
  if (type === 'big boss') {
    xp *= 3;
  }
  return Math.max(1, !exact ? range(xp) : xp);
}

function generateKeys(level, exact = false) {
  const keys = 0.4;
  return Math.random() < keys ? 1 : 0;
}

function range(amount) {
  return Math.round((3 * amount) / 4 + (Math.random() * (2 * amount)) / 4);
}

function share(ratio, amount) {
  return Math.ceil(ratio * amount) || 0;
}

function distribute(ratios, amount) {
  ratios = Object.entries(ratios).map(([id, ratio]) => ({id, ratio}));
  let remaining = amount;
  const result = [...ratios].sort((a, b) => b.ratio - a.ratio);
  for (let item of ratios) {
    let s = Math.floor(item.ratio * amount);
    if (s > remaining) {
      s = remaining;
    }
    remaining -= s;
    item.value = s;
  }
  if (result.length) {
    result[0].value += remaining;
  }
  return result.reduce((o, {id, value}) => ({ ...o, [id]: value }), {});
}

const encodeDirections = path => path.map(direction => order.indexOf(direction));

const decodeDirections = bytes => {
  const path = [];
  if (bytes < 8) {
    return [order[bytes]];
  }
  while (bytes !== 8 && path.length < 5) {
    path.push(bytes % 4);
    bytes >>= 4;
    if (path.length > 5) {
      return [order[bytes]];
    }
  }
  return path.reverse().map(n => order[n]);
};

const coordinatesInDirection = (coordinates, direction) => {
  const { x, y } = directions[typeof direction === 'number' ? order[direction] : direction];
  return coordinatesAt(coordinates, x, y);
};

const parseCoordinates = coordinates => {
  const [x, y, z = 0] = coordinates.split(',').map(Number);
  return { x, y, z };
};

const coordinatesAt = (coordinates, dx, dy) => {
  const { x, y, z } = parseCoordinates(coordinates);
  return `${x + dx},${y + dy}` + (z !== 0 ? `,${z}` : '');
};

const overrideFloor = (coordinates, floor) => {
  const { x, y } = parseCoordinates(coordinates);
  const z = floor;
  return `${x},${y}` + (z !== 0 ? `,${z}` : '');
};

const locationToAbsoluteCoordinates = location => {
  if (typeof location === 'object') {
    location = location.toString();
  }
  const dirNum = bn(location);
  const x = dirNum.mod(p64);
  const y = dirNum.div(p64).mod(p64);
  const z = dirNum.div(p128).mod(p64);
  const a = dirNum.div(p255);
  return { x, y, z, a };
};

const isLocation = holder => {
  const { a } = locationToAbsoluteCoordinates(holder);
  return one.eq(a);
};

const isBounty = holder => {
  const flag = bn(holder).div(p254);
  return one.eq(flag);
};

const isAddress = token => token.startsWith('0x');

const convertLocation = n => Number((n.gte(p32) ? n.sub(p64) : n.mod(p64)).toString());
const convertCoordinate = n => (n.lt(bn(0)) ? n.add(p64) : n.mod(p64));

const locationToCoordinates = location => {
  const { x, y, z } = locationToAbsoluteCoordinates(location);
  const cx = convertLocation(x);
  const cy = convertLocation(y);
  const cz = convertLocation(z);
  return cx + ',' + cy + (cz === 0 ? '' : ',' + cz);
};

const coordinatesToLocation = coordinates => {
  const { x, y, z } = parseCoordinates(coordinates);
  const ax = convertCoordinate(bn(x).mod(p64));
  const ay = convertCoordinate(bn(y).mod(p64)).mul(p64);
  const az = convertCoordinate(bn(z).mod(p64)).mul(p128);
  return p255.add(ax).add(ay).add(az).toString();
};

const locationToBounty = location => {
  return bn(location).sub(p255).add(p254).toString();
};

const bountyToLocation = bounty => {
  return bn(bounty).sub(p254).add(p255).toString();
};

const decodeExits = exitBits => {
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

const bfs = (rooms, start = '0,0', keys = null, limit = 5, showPath = true, ignoreMonsters = false) => {
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
    if (origin.allExits && origin.parent.distance < limit && (ignoreMonsters || !origin.hasMonster)) {
      let availableDirections = Object.keys(origin.allExits).filter(dir => origin.allExits[dir]);
      if (keys !== null && origin.parent.usedKeys >= keys) {
        availableDirections = availableDirections.filter(direction => !origin.locks[direction]);
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

const path = (bfs, to) => {
  const { parent } = bfs[to];
  if (parent.distance > 0) {
    return [...path(bfs, parent.coordinates), parent.exit];
  } else {
    return [];
  }
};

module.exports = {
  bn,
  encodeDirections,
  decodeDirections,
  isLocation,
  isAddress,
  bfs,
  path,
  decodeExits,
  parseCoordinates,
  coordinatesAt,
  locationToAbsoluteCoordinates,
  locationToBounty,
  bountyToLocation,
  distribute,
  isBounty,
  convertLocation,
  convertCoordinate,
  locationToCoordinates,
  coordinatesToLocation,
  getRing,
  kills,
  overrideFloor,
  range,
  generateCoins,
  generateXp,
  generateKeys,
  share,
  order,
  directions,
  coordinatesInDirection,
};
