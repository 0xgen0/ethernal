const sharp = require('sharp');

const { calculateViewport, format } = require('./helpers');

const positionAt = (info, pixels) => {
  const { x, y, width, height, scale } = info;
  const pos = {};
  for (let i = 0; i < pixels; i += 1) {
    Object.assign(pos, {
      [`x${i}`]: x + (i/pixels * width) + scale,
      [`y${i}`]: y + (i/pixels * height) + scale,
      [`width${i}`]: i/pixels * width,
      [`height${i}`]: i/pixels * height,
    });
  }
  return pos;
};

// SVG file and styling
const svgFile = opts => {
  const { scale } = opts;
  const etc = {
    weight1: 1 * scale,
    weight1_5: 1.5 * scale,
    weight4: 4 * scale,
  }
  return format`<?xml version="1.0" encoding="utf-8"?>
<svg
  version="1.1"
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  width="${'width'}"
  height="${'height'}"
  viewBox="0 0 ${'width'} ${'height'}"
>
  <style type="text/css">
    /* Default room style */
    .r { fill: #424242; stroke-width: 0; stroke: #000; }

    /* Room levels */
    .l0 {}
    .l1 {}
    .l2 {}
    .l3 {}
    .l4 {}
    .l5 {}
    .l6 {}
    .l7 {}
    .l8 {}
    .l9 {}

    /* Room types */
    .r1 {} /* Regular room */
    .r2 { fill: #d3d3d3 !important; stroke-width: ${'weight4'} !important; stroke: #d3d3d3 !important; } /* Teleport room */
    .r2-x { stroke-width: ${'weight1_5'} !important; stroke: #000 !important; stroke-linecap: round !important; }
    .r3 { fill: #979797 !important; stroke-width: ${'weight4'} !important; stroke: #979797 !important; } /* Temple room */
    .r3-x { fill: #000 !important; }
    .r4 { fill: #979797 !important; stroke-width: ${'weight4'} !important; stroke: #979797 !important; } /* Lore room */
    .r5 { fill: #979797 !important; stroke-width: ${'weight4'} !important; stroke: #979797 !important; } /* Carrier room */
    .r5-x { fill: #000 !important; }
  </style>

  <g id="rooms">
    ${'rooms'}
  </g>
</svg>`({ ...opts, ...etc });
};

// SVG room rectangle
const svgRoom = opts => {
  const room = [
    format`<path class="r ${'className'} r${'kind'} l${'monsterLevel'}" d="M${'x'} ${'y'} L${'x'} ${'y1'} L ${'x1'} ${'y1'} L ${'x1'} ${'y'} Z" />`(opts),
  ];
  switch (Number(opts.kind)) {
    // Teleport room (cross)
    case 2: {
      const { x, y, x1, y1, scale = 1 } = opts;
      const offset = 2 * scale;
      const pos = { x1: x + offset, x2: x1 - offset, y1: y + offset, y2: y1 - offset };
      room.push(format`<line class="r r2-x" x1="${'x1'}" y1="${'y1'}" x2="${'x2'}" y2="${'y2'}" />`(pos));
      room.push(format`<line class="r r2-x" x1="${'x1'}" y1="${'y2'}" x2="${'x2'}" y2="${'y1'}" />`(pos));
      break;
    }
    // Temple room (heart)
    case 3: {
      const { x, y, x1, y1, scale = 1 } = opts;
      const offset = 2 * scale;
      const width = Math.abs(x1 - x) - offset;
      const height = Math.abs(y1 - y) - offset;
      const pos = positionAt({ x, y, width, height, scale }, 10);
      room.push(format`<rect class="r r3-x" x="${'x0'}" y="${'y1'}" width="${'width4'}" height="${'height4'}"/>`(pos));
      room.push(format`<rect class="r r3-x" x="${'x6'}" y="${'y1'}" width="${'width4'}" height="${'height4'}"/>`(pos));
      room.push(format`<rect class="r r3-x" x="${'x4'}" y="${'y7'}" width="${'width2'}" height="${'height2'}"/>`(pos));
      room.push(format`<rect class="r r3-x" x="${'x2'}" y="${'y3'}" width="${'width6'}" height="${'height4'}"/>`(pos));
      break;
    }
    // Carrier room (arrows)
    case 5: {
      const { x, y, x1, y1, scale = 1 } = opts;
      const offset = 2 * scale;
      const width = Math.abs(x1 - x) - offset;
      const height = Math.abs(y1 - y) - offset;
      const pos = positionAt({ x, y, width, height, scale }, 10);
      room.push(format`<rect class="r r5-x" x="${'x1'}" y="${'y2'}" width="${'width9'}" height="${'height1'}"/>`(pos));
      room.push(format`<rect class="r r5-x" x="${'x0'}" y="${'y7'}" width="${'width9'}" height="${'height1'}"/>`(pos));
      room.push(format`<rect class="r r5-x" x="${'x0'}" y="${'y3'}" width="${'width1'}" height="${'height1'}"/>`(pos));
      room.push(format`<rect class="r r5-x" x="${'x9'}" y="${'y6'}" width="${'width1'}" height="${'height1'}"/>`(pos));
      room.push(format`<rect class="r r5-x" x="${'x1'}" y="${'y6'}" width="${'width1'}" height="${'height3'}"/>`(pos));
      room.push(format`<rect class="r r5-x" x="${'x8'}" y="${'y1'}" width="${'width1'}" height="${'height3'}"/>`(pos));
      room.push(format`<rect class="r r5-x" x="${'x2'}" y="${'y5'}" width="${'width1'}" height="${'height5'}"/>`(pos));
      room.push(format`<rect class="r r5-x" x="${'x7'}" y="${'y0'}" width="${'width1'}" height="${'height5'}"/>`(pos));
      break;
    }
    default: {
      break;
    }
  }
  return room.join('');
};

/**
 * Generate SVG of rooms
 * @param {string} key - chunk key name
 * @param {array} chunks - array of rooms
 * @param {integer} opts.chunkSize - number of rooms in a chunk
 * @param {integer} opts.roomSize - dimension of each room (default: 32)
 * @return {string}
 */
const createSVG = async (key, chunks, { chunkSize, roomSize = 32 }) => {
  let { minX, minY, maxX, maxY } = calculateViewport(chunks);
  if (chunkSize) {
    const [x, y] = key.split(',').map(Number);
    minX = x * chunkSize;
    minY = y * chunkSize;
  }

  const scale = roomSize / 16;
  const chunkWidth = chunkSize || maxX - minX;
  const chunkHeight = chunkSize || maxY - minY;
  const xOffset = -minX; // moving negative x to normalized 0,0 point
  const yOffset = -minY; // moving negative y to normalized 0,0 point

  // Generate SVG rooms
  // - reverse sort by kind as SVG layering index is bottom->up, which allow special rooms' styling to overlap non-special rooms
  const sortIndex = k => Number(k) === 2 ? 99 : Number(k);
  const rooms = chunks
    .sort((a, b) => (sortIndex(a.kind) - sortIndex(b.kind)))
    .map(room => {
      const { coordinates, corridor, allExits, kind, areaType, monsterLevel } = room;
      const [x, y] = coordinates.split(',').map(Number);
      let width = roomSize - (2 * scale);
      let height = roomSize - (2 * scale);
      let xd = 1 * scale;
      let yd = 1 * scale;
      let rx = 0;
      let ry = 0;

      if ([2, 4, 5].includes(Number(kind))) {
        // rx = 2;
        // ry = 2;
        // width += 2;
        // height += 2;
        // xd -= 1;
        // yd -= 1;
      } else if (corridor) {
        if (allExits.north) {
          width = roomSize / 1.8;
          xd = (roomSize - width) / 2;
        } else {
          height = roomSize / 1.8;
          yd = (roomSize - height) / 2;
        }
      }

      // Generate SVG
      return svgRoom({
        width,
        height,
        scale,
        x: (x + xOffset) * roomSize + xd,
        y: (y + yOffset) * roomSize + yd,
        x1: (x + xOffset) * roomSize + xd + width,
        y1: (y + yOffset) * roomSize + yd + height,
        rx,
        ry,
        kind,
        monsterLevel,
        className: areaType !== 6 ? 'sa' : '',
      });
    })
    .join('');

  // Generate SVG file
  const content = svgFile({
    width: chunkWidth * roomSize,
    height: chunkHeight * roomSize,
    rooms,
    scale,
  });
  return { content, chunkHeight, chunkWidth };
};

/**
 * Generate PNG of rooms
 * @param {string} key - chunk key name
 * @param {array} rooms - array of rooms
 * @param {integer} opts.chunkSize - number of rooms in a chunk
 * @param {integer} opts.format - output format (default: png)
 * @param {integer} opts.outputWidth - width of image (default: 512)
 * @param {integer} opts.roomSize - dimension of each room
 * @return {Buffer}
 */
const createImage = async (key, rooms, { chunkSize, format = 'png', outputWidth = 1024, roomSize }) => {
  // Generate SVG
  const { content: svg, chunkHeight, chunkWidth } = await createSVG(key, rooms, { chunkSize, roomSize });

  // Convert SVG to PNG
  const content = await sharp(Buffer.from(svg, 'utf8'))
    .resize(outputWidth, Math.floor((chunkHeight / chunkWidth) * outputWidth))
    .toFormat(format)
    .toBuffer();
  return { content, chunkHeight, chunkWidth };
};

module.exports = { createImage, createSVG };
