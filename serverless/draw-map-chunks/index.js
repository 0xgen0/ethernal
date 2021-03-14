const request = require('request-promise');

const { createImage, createSVG } = require('./generate');
const { calculateViewport } = require('./helpers');

/** Supported image formats */
const IMAGE_FORMATS = Object.freeze(['png']);

/** Cache Control */
const CACHE_MAX_AGE = 120; // 2 minutes

/**
 * Environment Cache URLs
 * !! NOTE: AWS Lambda@Edge does not support defined ENVs. ENVs here are for defining during testing. !!
 */
const CACHE_URLS = Object.freeze({
  local: process.env.CACHE_URL_LOCAL || 'http://localhost:3399',
  dev: process.env.CACHE_URL_DEV || 'https://ethernal-be-alpha.herokuapp.com', // alpha3
  alpha: process.env.CACHE_URL_ALPHA || 'https://ethernal-cache-2.herokuapp.com', // alpha3
});

/**
 * Fetch rooms from cache
 * @param {string} env - environment name (dev or alpha, default: dev)
 * @param {string} chunk - chunk coordinates
 * @param {string} chunkSize - chunk size
 * @return {array}
 */
const fetchRooms = async (env = 'dev', chunk, chunkSize) => {
  const hostname = CACHE_URLS[env];
  if (chunk === 'full') {
    return request(`${hostname}/rooms`).then(JSON.parse).then(Object.values);
  }
  return request(`${hostname}/map/chunks/${chunk}/${chunkSize}`).then(JSON.parse).then(Object.values);
};

/**
 * Split rooms into chunks
 * @param {array} rooms - array of rooms
 * @param {integer} chunkSize - number of rooms in a chunk
 * @return {object}
 */
const chunkRooms = (rooms, chunkSize) => {
  const chunks = {};
  const { minX, minY, maxX, maxY } = calculateViewport(rooms);
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

/**
 * Handle origin response
 * @param {object} event
 * @return {object}
 */
exports.handler = async event => {
  // Get params
  const { request, response } = event.Records[0].cf;
  const { uri } = request;

  // Skip if not a cache miss
  if (!['403', '404'].includes(response.status)) {
    return response;
  }

  // Get chunk from URI format `/:env/map/chunks/:chunk`
  const [, env, , , chunkName] = uri.split('/');
  const [coords, format] = chunkName.split('.');

  // Skip if not environment or format
  if (!CACHE_URLS[env] || ![...IMAGE_FORMATS, 'svg'].includes(format)) {
    return response;
  }

  // Set chunk size of 32x32 within a 1024x1024 tile
  let key = 'full';
  let chunkSize = 32;
  let outputWidth = 1024;

  // Get room data, chunk size, and requested chunk data
  const rooms = await fetchRooms(env, coords, chunkSize);

  let chunk = rooms;
  if (coords === 'full') {
    chunkSize = null;
    outputWidth = 4096;
  } else {
    const [x, y] = coords.split(',');
    key = [x ,y].join(',');
    const { chunks } = chunkRooms(rooms, chunkSize);
    chunk = chunks[key] || [];
  }

  // Render room chunks by requested format
  let contentType;
  let cacheControl = `public, max-age=${CACHE_MAX_AGE}`;
  if (IMAGE_FORMATS.includes(format)) {
    const { content } = await createImage(key, chunk, { chunkSize, format, outputWidth });
    response.body = content.toString('base64');
    response.bodyEncoding = 'base64';
    contentType = 'image/png';

  } else if (format === 'svg') {
    const { content } = await createSVG(key, chunk, { chunkSize });
    response.body = content;
    contentType = 'image/svg+xml';
  }

  // All done :)
  response.headers['cache-control'] = [{ key: 'Cache-Control', value: cacheControl }];
  response.headers['content-type'] = [{ key: 'Content-Type', value: contentType }];
  response.status = '200';
  response.statusDescription = 'OK';
  return response;
};
