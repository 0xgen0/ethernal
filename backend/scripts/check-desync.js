const {mapValues} = require("../src/data/utils");

const jsonDiff = require('json-diff');
const request = require('request-promise');

const master = process.argv[2] || 'http://localhost:3399';
const image = process.argv[3] || 'https://ethernal.dev.tmcloud.io';

const clean = obj => {
  const remove = ['weeklyRank', 'weeklyXp', 'hallOfFame', 'energy', 'freeEnergy'];
  remove.map(field => delete obj[field]);
  delete obj.status.combat;
  return obj;
};

const cleanRooms = rooms => {
  const remove = ['onlineCharacters', 'combat', 'deadCharacters'];
  return mapValues(rooms, room => {
    remove.map(field => delete room[field]);
    return room;
  });
};

async function diff(path, cleanFn = clean) {
  const a = await request(master + '/' + path).then(JSON.parse).then(cleanFn);
  const b = await request(image + '/' + path).then(JSON.parse).then(cleanFn);
  return jsonDiff.diffString(a,b);
}

async function main() {
  let status = 0;
  const dr = await diff('rooms/raw', cleanRooms);
  if (dr) {
    console.log('rooms', dr);
    status = 1;
  }

  for (let i = 1; i < 200; i++) {
    const d = await diff('characters/'+i);
    if (d) {
      console.log(i,d);
      status = 1;
    }
  }
  return status;
}

main().then(status => {
  process.exit(status);
});

