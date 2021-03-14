/* eslint-disable no-await-in-loop,no-console */
import { bfs } from 'utils/utils';

export default class Walker {
  constructor(cache) {
    this.cache = cache;
    this.walking = false;
  }

  async walk(type = 'random') {
    try {
      while (this.walking) {
        await this.killMonster();
        if (type === 'random') {
          await this.randomStep();
        } else {
          await this.discoverRoom(type);
        }
        await new Promise(r => setTimeout(r, 10));
      }
    } catch (e) {
      console.log('walker stopped', e);
      this.walking = false;
    }
  }

  async randomStep() {
    const rooms = Object.values(this.cache.reachableRooms).filter(
      ({ coordinates }) => this.cache.characterCoordinates !== coordinates,
    );
    if (rooms.length) {
      const { coordinates } = rooms[Math.floor(Math.random() * rooms.length)];
      console.log(`walker moving to ${coordinates}`);
      await this.cache.move(coordinates);
    } else {
      console.log('walker cannot move anywhere, waiting...', rooms);
    }
  }

  async discoverRoom(type) {
    const strategy = {
      east: (a, b) => Number(b.coordinates.split(',')[0]) - Number(a.coordinates.split(',')[0]),
      bfs: (a, b) => a.parent.distance - b.parent.distance,
    };
    const { rooms, moves, characterCoordinates } = this.cache;
    const undiscovered = Object.values(bfs(rooms, moves, characterCoordinates, null, 1000))
      .filter(({ coordinates }) => this.cache.characterCoordinates !== coordinates)
      .filter(({ status }) => status === 'undiscovered')
      .sort(strategy[type]);
    const [destination] = undiscovered;
    if (!destination) {
      console.log('cannot move anywhere', undiscovered);
      return;
    }
    if (destination.parent.distance > 5) {
      console.log(`walker teleporting to ${destination.parent.coordinates}`);
      this.cache.action('teleport', { character: this.cache.characterId, coordinates: destination.parent.coordinates });
    } else {
      console.log(`walker discovering room at ${destination.coordinates}`);
      this.cache.move(destination.coordinates);
    }
    await this.cache.onceMoved();
  }

  async killMonster() {
    const { hasMonster, coordinates } = this.cache.currentRoom;
    if (hasMonster) {
      console.log('walker killing monster');
      this.cache.action('kill-monster', coordinates);
      await this.cache.once('monster-defeated', e => e.coordinates === coordinates);
    }
  }

  start(discovery = false) {
    this.walking = true;
    this.walk(discovery).then(() => {
      this.walking = false;
    });
  }

  stop() {
    this.walking = false;
  }
}
