import { soliditySha3 } from 'web3-utils';
import * as BN from 'bn.js';

import { roomsText } from 'data/text';
import { formatCoordinates } from 'utils/utils';

import IconBossRoom from 'assets/room_boss.png';
import IconCarrierRoom from 'assets/room_carrier.png';
import IconLoreRoom from 'assets/room_lore.png';
import IconRegularRoom from 'assets/room_regular.png';
import IconTeleportRoom from 'assets/room_teleport.png';
import IconTempleRoom from 'assets/room_temple.png';

const roomImages = Object.freeze({
  1: IconRegularRoom,
  2: IconTeleportRoom,
  3: IconTempleRoom,
  4: IconLoreRoom,
  5: IconCarrierRoom,
  6: IconBossRoom,
});

const getRandomValue = (location, hash, index, mod) => {
  const random = soliditySha3(
    { type: 'uint256', value: location },
    { type: 'bytes32', value: hash },
    { type: 'uint8', value: index },
  );
  return new BN(random.slice(2), 'hex').mod(new BN(mod));
};

class RNG {
  constructor(roomLocation, roomHash, roomKind) {
    this.roomLocation = roomLocation;
    this.roomHash = roomHash;
    this.kind = roomKind;
  }

  randomInteger(from = 0, to = Number.MAX_SAFE_INTEGER) {
    const mod = to - from;
    const bn = getRandomValue(this.roomLocation, this.roomHash, (this.counter += 1), mod);
    return bn.toNumber() + from;
  }

  randomItem(array) {
    const index = this.randomInteger(0, array.length);
    return array[index];
  }

  randomName() {
    return this.randomItem(roomsText.names[this.kind]);
  }

  randomEntry() {
    return this.randomItem(roomsText.sentences.entry[this.kind]);
  }
}

const roomGenerator = room => {
  if (!room) {
    return null;
  }

  const formattedCoordinates = formatCoordinates(room.coordinates);
  if (!room.kind) {
    return { ...room, name: 'Room', image: '', formattedCoordinates };
  }

  const rng = new RNG(room.location, room.hash, room.kind);
  return {
    ...room,
    name: room.location === '0' ? 'Entrance' : rng.randomName(),
    formattedCoordinates,
    image: roomImages[room.kind],
    entry: room.kind !== '1' ? rng.randomEntry() : null,
  };
};

export default roomGenerator;
