const defaultConfig = {
  numExplorers: 100,
  randomExplorer: true,
  roomLimit: 10000,
  exitGeneration: {
    useDirDiscovery: true,
    inertia: 0.87,
    bifurcation: 0.4,
    bothBifurcation: 0.25
  }
};

export default class Map {
  constructor(c = defaultConfig) {
    const config = {...defaultConfig, ...c};
    this.exitGeneration = config.exitGeneration;
    this.numExplorers = config.numExplorers;
    this.randomExplorer = config.randomExplorer;
    this.roomLimit = config.roomLimit;
    this.unvisitedExits = [];
    this.visitedRooms = [];
    this.currentBlock = 0;
    this.tick = 0;
    if (config.rooms) {
      let rooms = Object.values(config.rooms).map(r => {
        const [x,y] = r.coordinates.split(',').map(Number);
        return {...r, x, y, exits: r.allExits, block: r.blockNumber};
      }).sort((a,b) => a.block < b.block);
      this.rooms = {
        '0,0': {
          ...rooms[0],
          expansions: {
            north: 0,
            east: 0,
            south: 0,
            west: 0,
          },
          corridor: false,
          color: getRandomColor()
        }
      };
      rooms = rooms.slice(1);
      for (const room of rooms) {
        this.rooms[room.coordinates] = {
          corridor: !this.isRoom(room),
          expansions: this.generateExpansions(room),
          ...room
        };
      }
    } else {
      this.rooms = {
        '0,0': {
          x: 0,
          y: 0,
          exits: {
            north: true,
            east: true,
            south: true,
            west: true,
          },
          allExits: {
            north: true,
            east: true,
            south: true,
            west: true,
          },
          block: this.currentBlock++,
          expansions: {
            north: 0,
            east: 0,
            south: 0,
            west: 0,
          },
          corridor: false,
          color: getRandomColor()
        }
      };
    }

    window.rooms = this.rooms;
    this.numExitsAtDiscovery = 4;
    this.numRoomsAtDiscovery = 1;

    this.explorers = [];
    for (let explorerIndex = 0; explorerIndex < this.numExplorers; explorerIndex++) {
      const explorer = {
        visited: {},
        path: [{x: 0, y: 0}],
        poppedPath: [],
        x: 0,
        y: 0,
      };
      explorer.visited[getId(this.rooms['0,0'])] = true;
      this.explorers.push(explorer);
    }
  }

  explore() {
    if (this.randomExplorer) {
      this.explore_random_walk();
    } else {
      this.explore_bfs();
    }
  }

  generateNewRoom(dirDiscovery, choiceCoords, choiceId) {
    const {exitsBits, exits} = this.generateExits({
      numRoomsAtDiscovery: this.numRoomsAtDiscovery,
      numExitsAtDiscovery: this.numExitsAtDiscovery,
      dirDiscovery,
      choiceId
    });
    const newRoom = {
      x: choiceCoords.x,
      y: choiceCoords.y,
      exitsBits,
      block: this.currentBlock++,
      exits,
      color: getRandomColor()
    };
    newRoom.allExits = this.allExitsForRoom(newRoom);
    newRoom.corridor = !this.isRoom(newRoom);
    newRoom.expansions = this.generateExpansions(newRoom);
    this.rooms[choiceId] = newRoom;
  }

  supplyExits(explorer, currentRoom) {
    for (const dir of order) {

      if (currentRoom.exits[dir]) {
        let destRoom = {roomBefore: currentRoom, dir: dir,};

        if (!this.unvisitedExits[destRoom]) {
          this.unvisitedExits.push(destRoom);
        }
      }
    }
    this.visitedRooms[getId(explorer)] = true;
  }

  explore_bfs() {
    for (const explorer of this.explorers) {

      let currentRoom = this.rooms[getId(explorer)];

      if (this.unvisitedExits.length > 0) {
        const dest = this.unvisitedExits.shift();
        const choiceId = getId(dest.roomBefore, dest.dir);
        const choiceCoords = getCoords(dest.roomBefore, dest.dir);

        if (!this.rooms[choiceId]) {
          this.generateNewRoom(dest.dir, choiceCoords, choiceId);
        }

        explorer.x = choiceCoords.x;
        explorer.y = choiceCoords.y;
      }
      currentRoom = this.rooms[getId(explorer)];
      if (!this.visitedRooms[getId(explorer)]) {
        this.supplyExits(explorer, currentRoom);
      }
    }
  }

  explore_random_walk() {
    for (const explorer of this.explorers) {
      const currentRoom = this.rooms[getId(explorer)];
      //console.log({currentRoom});
      const choices = [];
      for (const dir of order) {
        //console.log({dir});
        const opositeDir = order[order.indexOf(dir) + 2 % 4];
        const roomId = getId(currentRoom, dir);
        if (currentRoom.exits[dir] || (this.rooms[roomId] && this.rooms[roomId].exits[opositeDir])) {
          //console.log({roomId});
          if (!explorer.visited[roomId]) {
            choices.push(dir);
          }
        }
      }
      //console.log({choices});
      if (choices.length > 0) {
        const randomIndex = Math.floor(Math.random() * choices.length);
        const choice = choices[randomIndex];
        //console.log({choice});
        const choiceId = getId(currentRoom, choice);
        const choiceCoords = getCoords(currentRoom, choice);
        const destRoom = this.rooms[choiceId];
        const dirDiscovery = choice;
        if (!destRoom) {
          this.generateNewRoom(dirDiscovery, choiceCoords, choiceId);
        }
        explorer.poppedPath.push({x: explorer.x, y: explorer.y});
        explorer.visited[choiceId] = true;
        explorer.x = choiceCoords.x;
        explorer.y = choiceCoords.y;
        explorer.path.push({x: explorer.x, y: explorer.y});
      } else {
        if (explorer.poppedPath.length > 0) {
          const lastPath = explorer.poppedPath.pop();
          explorer.x = lastPath.x;
          explorer.y = lastPath.y;
        } else {
          //console.log('back to zero ?');
          //console.log(JSON.parse(JSON.stringify(explorer)));
          explorer.x = 0;
          explorer.y = 0;
        }

      }
    }
  }

  neighbors(room) {
    return Object.keys(directions).reduce((r, direction) => {
      const n = this.rooms[getId(room, direction)];
      return {...r, [direction]: n && !n.corridor ? n : null};
      }, {});
  }

  isRoom(room) {
    const exits = Object.values(room.allExits).filter(v => v).length;
    const neighbors = Object.values(this.neighbors(room)).filter(v => v);
    const rooms = neighbors.filter(r => !r.corridor);
    return exits !== 2
        || neighbors.length > 2;
  }

  generateExpansions(room) {
    const r = this.neighbors(room);
    let north = Math.max(
        r.ne && r.ne.expansions.west > 0 ? r.ne.expansions.south : -1,
        r.nw && r.nw.expansions.east > 0 ? r.nw.expansions.south : -1,
        r.north ? r.north.expansions.south : -1);
    let south = Math.max(
        r.se && r.se.expansions.west > 0 ? r.se.expansions.north : -1,
        r.sw && r.sw.expansions.east > 0 ? r.sw.expansions.north : -1,
        r.south ? r.south.expansions.north : -1);
    let west = Math.max(
        r.nw && r.nw.expansions.south > north ? r.nw.expansions.east : -1,
        r.sw && r.sw.expansions.north > south ? r.sw.expansions.east : -1,
        r.west ? r.west.expansions.east : -1);
    let east = Math.max(
        r.ne && r.ne.expansions.south > north ? r.ne.expansions.west : -1,
        r.se && r.se.expansions.north > south ? r.se.expansions.west : -1,
        r.east ? r.east.expansions.west : -1);

    const empty = {north, south, west, east};
    const result = order.reduce((a, dir) => {
      const neighbor = a[dir];
      const rand = getRandomInt(1,3);
      let expansion;
      switch (rand) {
        case 1:
          expansion = 0.5;
          break;
        case 2:
          expansion = 0;
          break;
        case 3:
          expansion = -0.5;
          break;
      }

      expansion = neighbor > -1 ? -neighbor : expansion;
      return {
        ...a,
        [dir]: expansion,
      }
    }, empty);
    return result;
  }

  recordRoomAndExits(roomId, exits, numExits) {
    let closedExits = 0;

    const east = this.rooms[getId(roomId, 'east')];
    if (east) {
      if ((exits & 2) === 2) {
        closedExits++;
      }
      if ((east.exits & 8) === 8) { // west of east
        closedExits++;
      }
    }

    const west = this.rooms[getId(roomId, 'west')];
    if (west) {
      if ((exits & 8) === 8) {
        closedExits++;
      }
      if ((west.exits & 2) === 2) { // east of west
        closedExits++;
      }
    }


    const north = this.rooms[getId(roomId, 'north')];
    if (north) {
      if ((exits & 1) === 1) {
        closedExits++;
      }
      if ((north.exits & 4) === 4) { // south of north
        closedExits++;
      }
    }
    const south = this.rooms[getId(roomId, 'south')];
    if (south) {
      if ((exits & 4) === 4) {
        closedExits++;
      }
      if ((south.exits & 1) === 1) { // north of south
        closedExits++;
      }
    }

    let newNumExits = this.numExitsAtDiscovery + numExits;
    if (newNumExits < closedExits) {
      newNumExits = 0;
    } else {
      newNumExits -= closedExits;
    }
    this.numExitsAtDiscovery = newNumExits;
    this.numRoomsAtDiscovery++;
  }

  init() {
    this.loop();
  }

  loop() {
    if (!this.roomLimit || Object.keys(this.rooms).length < this.roomLimit) {
      this.frame = requestAnimationFrame(this.loop.bind(this));
      this.tick++;
      this.explore();
    } else {
      this.finished = true;
    }
  }

  cancel() {
    cancelAnimationFrame(this.frame);
  }

  opositeExit(room, direction) {
    const reverseDirection = {
      "west": "east",
      "north": "south",
      "south": "north",
      "east": "west"
    };
    if (room) {
      return room.exits[reverseDirection[direction]];
    } else {
      return false;
    }
  }

  validExit(room, direction) {
    const currentRoom = room;
    const nextLocation = getId(room, direction);
    const nextRoom = this.rooms[nextLocation];
    const cb = currentRoom.block;
    const nb = (nextRoom && nextRoom.block) ? nextRoom.block : 0;
    const fromCurrent =
        direction === 'north' && currentRoom.exits.north ||
        direction === 'east' && currentRoom.exits.east ||
        direction === 'south' && currentRoom.exits.south ||
        direction === 'west' && currentRoom.exits.west;
    const fromDst = this.opositeExit(nextRoom, direction);
    if (cb < nb || nb === 0) {
      return fromCurrent;
    } else if (cb > nb) {
      return fromDst;
    } else {
      return fromCurrent;
    }
  }

  allExitsForRoom(room) {
    const allExits = {};
    ["north", "east", "south", "west"].map(direction => {
      allExits[direction] = this.validExit(room, direction);
    });
    return allExits;
  }

  generateExits({numRoomsAtDiscovery, numExitsAtDiscovery, dirDiscovery, choiceId}) {
    if (this.exitGeneration.useDirDiscovery) {
      return this.generateExitsDirectionaly(dirDiscovery);
    } else {
      const exits = this.generateExitsLegacy(numRoomsAtDiscovery, numExitsAtDiscovery);
      this.recordRoomAndExits(choiceId, exits.exitsBits, exits.numExits);
      return exits;
    }
  }

  generateExitsDirectionaly(dir) {
    const {inertia, bifurcation, bothBifurcation} = this.exitGeneration;

    let exits = 0;
    const hasInertia = Math.random() < inertia;
    const hasBifurcation = Math.random() < bifurcation;
    const hasBothBifurcation = Math.random() < bothBifurcation;
    if (hasInertia) {
      if (dir === 'north') {
        exits = 1;
      } else if (dir === 'east') {
        exits = 2;
      } else if (dir === 'south') {
        exits = 4;
      } else if (dir === 'west') {
        exits = 8;
      }
    }
    if (hasBifurcation) {
      if (hasBothBifurcation) {
        if (dir === 'north' || dir === 'south') {
          exits = (exits | 8) | 2;
        } else if (dir === 'east' || dir === 'west') {
          exits = (exits | 1) | 4;
        }
      } else {
        if (Math.random() < 0.5) {
          if (dir === 'north') {
            exits = exits | 8;
          } else if (dir === 'east') {
            exits = exits | 1;
          } else if (dir === 'south') {
            exits = exits | 2;
          } else if (dir === 'west') {
            exits = exits | 4;
          }
        } else {
          if (dir === 'north') {
            exits = exits | 2;
          } else if (dir === 'east') {
            exits = exits | 4;
          } else if (dir === 'south') {
            exits = exits | 8;
          } else if (dir === 'west') {
            exits = exits | 1;
          }
        }
      }
    }

    const actualExits = {
      north: (exits & 1) === 1,
      east: (exits & 2) === 2,
      south: (exits & 4) === 4,
      west: (exits & 8) === 8,
    };
    return {exits: actualExits, exitsBits: exits};
  }

  generateExitsLegacy(numRoomsAtDiscovery, numExitsAtDiscovery) {
    const target = ((4 + Math.sqrt(numRoomsAtDiscovery)) - numExitsAtDiscovery);
    let numExits;
    if (numRoomsAtDiscovery < 10 || target >= 3) {
      numExits = Math.floor(Math.random() * 3) + 2;
    } else {
      numExits = Math.floor(Math.random() * 4) + 1;
    }

    let exits = 0;
    if (numExits >= 4) {
      numExits = 4;
      exits = 15;
    } else if (numExits === 3) {
      let chosenExits = Math.floor(Math.random() * 4);
      exits = (chosenExits + 1) * 7;
      if (exits === 21) {
        exits = 13;
      } else if (exits === 28) {
        exits = 11;
      }
      // 4 possibilities : 7 // 14 // 13 // 11
    } else if (numExits === 2) {
      let chosenExits = Math.floor(Math.random() * 6);
      exits = (chosenExits + 1) * 3;
      if (exits === 15) {
        exits = 5;
      } else if (exits === 18) {
        exits = 10;
      }
      // 3 // 6 // 9 // 12 // 5 // 10
    } else if (numExits === 1) {
      let chosenExits = Math.floor(Math.random() * 4);
      exits = 2 ** chosenExits;
    }


    const actualExits = {
      north: (exits & 1) === 1,
      east: (exits & 2) === 2,
      south: (exits & 4) === 4,
      west: (exits & 8) === 8,
    };
    return {exits: actualExits, exitsBits: exits, numExits};
  }
}

const order = ['north', 'east', 'south', 'west'];
const directions = {
  'north': {x: 0, y: 1},
  'east': {x: 1, y: 0},
  'south': {x: 0, y: -1},
  'west': {x: -1, y: 0},
  'ne': {x: 1, y: 1},
  'nw': {x: -1, y: 1},
  'se': {x: 1, y: -1},
  'sw': {x: -1, y: -1}
};

function getCoords(room, dir) {
  const {x, y} = room;
  const d = directions[dir];
  return d ? {x: x + d.x, y: y + d.y} : {x, y};
}

function getId(room, dir) {
  if (typeof dir === 'undefined') {
    return '' + room.x + ',' + room.y;
  }
  const coords = getCoords(room, dir);
  return '' + coords.x + ',' + coords.y;
}

function maxExpansion(rooms, dir) {
  return rooms.reduce((a, r) => Math.max(a, r && !r.corridor ? r.expansions[dir] : -1), -1);
}

function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}