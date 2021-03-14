const fs = require('fs').promises;
const request = require('request-promise');
const sharp = require('sharp');

// const server = 'http://localhost:3399';
const server = 'https://ethernal.dev.tmcloud.io';
// const server = 'https://ethernal2.prod.tmcloud.io';

const calculatePositions = rooms =>
  rooms.reduce(
    (prev, { coordinates }) => {
      const [x, y] = coordinates.split(',').map(Number);
      return {
        minX: Math.min(x, prev.minX),
        minY: Math.min(y, prev.minY),
        maxX: Math.max(x, prev.maxX),
        maxY: Math.max(y, prev.maxY),
      };
    },
    { minX: 0, minY: 0, maxX: 0, maxY: 0 },
  );

const chunkRooms = (rooms, chunkSize) => {
  const chunks = {};
  const { minX, minY, maxX, maxY } = calculatePositions(rooms);
  const xOffset = 0;
  const yOffset = 0;

  // Generate all chunks
  for (let x = Math.floor((minX - xOffset) / chunkSize); x <= Math.floor((maxX - yOffset) / chunkSize); x += 1) {
    for (let y = Math.floor((minY - xOffset) / chunkSize); y <= Math.floor((maxY - yOffset) / chunkSize); y += 1) {
      const key = [x, y].join(',');
      chunks[key] = [];
    }
  }

  // Assign rooms to chunks
  rooms.forEach(room => {
    const { coordinates } = room;
    const [x, y] = coordinates.split(',').map(Number);

    const chunkX = Math.floor((x - xOffset) / chunkSize);
    const chunkY = Math.floor((y - yOffset) / chunkSize);
    const key = [chunkX, chunkY].join(',');

    chunks[key].push(room);
  });

  return { minX, minY, maxX, maxY, xOffset, yOffset, chunks };
};

async function main(chunkSize = 10) {
  const rooms = await request(`${server}/rooms`).then(JSON.parse).then(Object.values);

  // Draw chunks
  const { minX, minY, maxX, maxY, xOffset, yOffset, chunks } = chunkRooms(rooms, chunkSize);
  for (let key of Object.keys(chunks)) {
    await minimap(key, chunks[key], { chunkSize });
  }

  // Draw HTML for viewing all
  let html = '';
  for (let y = Math.floor((minY - xOffset) / chunkSize); y <= Math.floor((maxY - yOffset) / chunkSize); y += 1) {
    html += '<tr>';
    for (let x = Math.floor((minX - xOffset) / chunkSize); x <= Math.floor((maxX - yOffset) / chunkSize); x += 1) {
      html += `<td><img src="rooms/room_${x}_${y}.png" alt="" title="${x},${y}" /></td>`;
    }
    html += '</tr>';
  }
  // html = '<tr><td><img src="rooms/room_full.png" alt="" /></td></tr>';
  await fs.writeFile(
    `./static/rooms-chunked.html`,
    `<html><head><style>* {margin: 0; padding: 0;} body {background: black;} img {display: inline-block; border: 1px solid rgba(255,255,0,0.24);}</style></head><body><table width="100%">${html}</table></body></html>`,
  );

  // Draw full map
  await minimap('full', rooms, { outputWidth: 3000 });
  await fs.writeFile(
    './static/rooms-full.html',
    '<html><head><style>* {margin: 0; padding: 0;} body {background: black;} img {display: inline-block;}</style></head><body><table width="100%"><tr><td><img src="rooms/room_full.png" alt="" /></td></tr></table></body></html>',
  );

  return true;
}

async function minimap(key, rooms, { roomSize = 10, chunkSize, outputWidth = 250 }) {
  let { minX, minY, maxX, maxY } = calculatePositions(rooms);
  if (chunkSize) {
    const [x, y] = key.split(',').map(Number);
    minX = x * chunkSize;
    minY = y * chunkSize;
  }

  // @TODO - NORMALIZE INSIDE CHUNK, IF GIVEN

  const chunkWidth = chunkSize || maxX - minX;
  const chunkHeight = chunkSize || maxY - minY;
  const xOffset = -minX; // moving negative x to normalized 0,0 point
  const yOffset = -minY; // moving negative y to normalized 0,0 point

  /* Map to styles inline, Sharp/libsvg has issues with classes on multiple lines?? (weird...) */
  const styles = {
    /* Default room style */
    r: 'fill: #FFF;',

    /* Room levels */
    /* @TODO - COULD LATER CHANGE STYLES */
    l0: '',
    l1: '',
    l2: '',
    l3: '',
    l4: '',
    l5: '',
    l6: '',
    l7: '',
    l8: '',
    l9: '',

    /* Room types */
    /* @TODO - COULD LATER CHANGE STYLES */
    r1: '' /* Regular room */,
    r2: '' /* Teleport room */,
    r3: '' /* Temple room */,
    r4: '' /* Lore room */,
    r5: '' /* Carrier room */,

    /* Special area */
    sa: 'fill: #EA4D46;',
  };

  // Generate SVG (needs testing)
  const svg = `<svg
    version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
    width="${chunkWidth * roomSize}"
    height="${chunkHeight * roomSize}"
    viewBox="0 0 ${chunkWidth * roomSize} ${chunkHeight * roomSize}"
  >
    <style>
      ${Object.entries(styles)
        .map(([k, v]) => `.${k} {${v}}`)
        .join(' ')}
    </style>
    <g id="rooms">
      ${rooms
        .map(room => {
          const { coordinates, corridor, allExits } = room;
          const [x, y] = coordinates.split(',').map(Number);
          let width = roomSize;
          let height = roomSize;
          let xd = 0;
          let yd = 0;
          if (corridor) {
            // if (allExits.north) {
            //   width = roomSize / 4;
            //   xd += roomSize / 2 - width / 2
            // } else {
            //   height = roomSize / 4;
            //   yd += roomSize / 2 - height / 2
            // }
          }
          const xx = (x + xOffset) * roomSize + xd;
          const yy = (y + yOffset) * roomSize + yd;
          return `<rect class="r ${room.areaType !== 6 ? 'sa' : ''} r${room.kind} l${
            room.monsterLevel
          }" width="${width}" height="${height}" x="${xx}" y="${yy}" />`;
        })
        .join('')}
    </g>
  </svg>
  `;

  // Write to file system to also view/debug??
  await fs.writeFile(`./static/rooms/room_${key.replace(',', '_')}.svg`, svg);

  // Convert SVG to PNG
  // Sharp docs -> https://sharp.pixelplumbing.com/
  return sharp(Buffer.from(svg, 'utf8'))
    .resize(outputWidth, Math.floor((chunkHeight / chunkWidth) * outputWidth))
    .toFormat('png')
    .toFile(`./static/rooms/room_${key.replace(',', '_')}.png`);
}

Promise.resolve(main(25)).then(status => {
  console.log(status);
  // process.exit(status);
});
