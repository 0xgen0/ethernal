import 'pixi.js';
import Direction from '../../utils/Direction';

/** The size (in pixels), a tile is for room SpriteSheets. */
export const ROOM_TILE_SIZE = 8;

/** The size (in tiles), a room is without any expansions. */
export const ROOM_SIZE = 11;

/** The size (in tiles), to shrink a room with an expansion value of -0.5 on a direction. */
export const EXPANSION_SHRINK_SIZE = 2;

/** The Size (in tiles), to expand a room with an expansion value of 0.5 on a direction. */
export const EXPANSION_GROW_SIZE = 4;

/** The length of rooms to be contained within one chunk. (Don't change this please) */
export const CHUNK_ROOM_LENGTH = 8;

/** Set this to true to render rooms with the expansions properties applied to their dimensions. */
export const EXPANSION_ENABLED = true;

export const DEBUG_BOXES_ENABLED = false;
export const ROOM_BOXES_DISABLED = false;

export const MAX_CHUNKS = 32;
export const MAX_ROOMS = MAX_CHUNKS * CHUNK_ROOM_LENGTH * CHUNK_ROOM_LENGTH;

export const EASE_CHUNK_UPDATES = true;

export const FogType = Object.freeze({
  TOP_LEFT_OUTER: 'top_left_outer',
  TOP_RIGHT_OUTER: 'top_right_outer',
  BOTTOM_LEFT_OUTER: 'bottom_left_outer',
  BOTTOM_RIGHT_OUTER: 'bottom_right_outer',
  TOP_LEFT_INNER: 'top_left_inner',
  TOP_RIGHT_INNER: 'top_right_inner',
  BOTTOM_LEFT_INNER: 'bottom_left_inner',
  BOTTOM_RIGHT_INNER: 'bottom_right_inner',
  TOP: 'top',
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right',
  FILL: 'fill',
  VOID: 'void,',
});

export const fogTiles = [];
fogTiles[FogType.TOP_LEFT_OUTER] = { x: 0, y: 0, rotate: 0 };
fogTiles[FogType.TOP_RIGHT_OUTER] = { x: 0, y: 0, rotate: 12 };
fogTiles[FogType.BOTTOM_LEFT_OUTER] = { x: 0, y: 0, rotate: 8 };
fogTiles[FogType.BOTTOM_RIGHT_OUTER] = { x: 0, y: 0, rotate: 4 };
fogTiles[FogType.TOP_LEFT_INNER] = { x: 16, y: 0, rotate: 0 };
fogTiles[FogType.TOP_RIGHT_INNER] = { x: 16, y: 0, rotate: 12 };
fogTiles[FogType.BOTTOM_LEFT_INNER] = { x: 16, y: 0, rotate: 8 };
fogTiles[FogType.BOTTOM_RIGHT_INNER] = { x: 16, y: 0, rotate: 4 };
fogTiles[FogType.TOP] = { x: 8, y: 0, rotate: 0 };
fogTiles[FogType.BOTTOM] = { x: 8, y: 0, rotate: 4 };
fogTiles[FogType.LEFT] = { x: 8, y: 0, rotate: 2 };
fogTiles[FogType.RIGHT] = { x: 8, y: 0, rotate: 6 };
fogTiles[FogType.VOID] = { x: 0, y: 8, rotate: 0 };
fogTiles[FogType.FILL] = { x: 8, y: 8, rotate: 0 };

/**
 * unifies coordinates to pair format
 *
 * @param coordinates as [x,y] or "x,y" or {x,y}
 * @returns [x,y]
 */
export const toCoordinatePair = coordinates => {
  if (coordinates.x) {
    const { x, y } = coordinates;
    return [x, y];
  }

  if (Array.isArray(coordinates)) {
    return coordinates.map(Number).slice(0, 2);
  }

  const [x, y] = coordinates.split(',').map(Number);
  return [x, y];
};

/**
 * creates doorId from coordinates and direction
 * identifies door or exit between 2 rooms
 *
 * @param coordinates of the room on chain
 * @param direction from Direction enum
 * @returns {string} doorId
 */
export const coordinatesDoorId = (coordinates, direction) => {
  const [x, y] = toCoordinatePair(coordinates);
  if (direction === Direction.NORTH) {
    return `${x},${y - 0.5}`;
  } else if (direction === Direction.SOUTH) {
    return `${x},${y + 0.5}`;
  } else if (direction === Direction.EAST) {
    return `${x + 0.5},${y}`;
  } else if (direction === Direction.WEST) {
    return `${x - 0.5},${y}`;
  }
};

/**
 * converts coordinates to the chunk id (pair of chunk coordinates)
 *
 * this function sorts all coordinates (and rooms on that coordinates) into chunks
 *
 * @param coordinates of the room on chain
 * @returns {string} chunkId that is represented by pair of chunk coordinates
 */
export const coordinatesChunkId = coordinates => {
  const [rx, ry] = toCoordinatePair(coordinates);
  const chunkCoordinates = toChunkCoordinates(rx, ry);
  return `${chunkCoordinates.x},${chunkCoordinates.y}`;
};

/**
 * calculates all possible coordinates that can be in particular chunk
 *
 * reverse of `coordinatesChunkId`
 *
 * @param chunkId
 * @returns {[]} set of all possible coordinates in chunk
 */
export const coordinatesInChunk = chunkId => {
  const [cx, cy] = chunkId.split(',').map(Number);
  const coordinates = [];
  for (let x = cx * 8; x < cx * 8 + 8; x++) {
    for (let y = cy * 8; y < cy * 8 + 8; y++) {
      coordinates.push(`${x},${y}`);
    }
  }
  return coordinates;
};

/**
 * calculates position of the chunk in pixel space
 *
 * @param cx chunk coordinate x
 * @param cy chunk coordinate y
 * @returns {number[]}
 */
export const chunkPixelPosition = (cx, cy) => {
  return [cx * CHUNK_ROOM_LENGTH * ROOM_SIZE * ROOM_TILE_SIZE, cy * CHUNK_ROOM_LENGTH * ROOM_SIZE * ROOM_TILE_SIZE];
};

/**
 * calculates approximate position of the room in pixel space
 *
 * this is less accurate then room.center because expansions
 * are ignored in this calculation
 *
 * @param coordinates of the room on chain
 * @returns {number[]} x and y pair
 */
export const roomPixelPosition = coordinates => {
  const [x, y] = toCoordinatePair(coordinates);
  const c = toChunkCoordinates(x, y);
  const [cpx, cpy] = chunkPixelPosition(c.x, c.y);
  const l = toChunkLocalCoordinates(x, y);
  const lx = l.x * ROOM_SIZE;
  const ly = l.y * ROOM_SIZE;
  return [
    cpx + Math.floor((lx + ROOM_SIZE / 2) * ROOM_TILE_SIZE),
    cpy + Math.floor((ly + ROOM_SIZE / 2) * ROOM_TILE_SIZE),
  ];
};

/**
 * Converts global coordinates to the chunk coordinates that the coordinates are inside of.
 *
 * @param gx {number} The global room 'X' coordinate to convert.
 * @param gy {number} The global room 'Y' coordinate to convert.
 *
 * @return {{x: number, y: number}} Returns the chunk's coordinates.
 */
export const toChunkCoordinates = (gx, gy) => {
  return {
    x: Math.round(gx) >> 3,
    y: Math.round(gy) >> 3,
  };
};

/**
 * Converts global coordinates to the room's local coordinates that are inside of a chunk.
 *
 * @param gx {number} The global room 'X' coordinate to convert.
 * @param gy {number} The global room 'Y' coordinate to convert.
 *
 * @return {{x: number, y: number}} Returns the room's local coordinates inside of a chunk.
 */
export const toChunkLocalCoordinates = (gx, gy) => {
  gx = Math.round(gx);
  gy = Math.round(gy);
  let x = 0;
  let y = 0;
  if (gx < 0) {
    x = -(gx + 1) % 8;
    x = 7 - x;
  } else if (gx > 0) {
    x = gx % 8;
  }
  if (gy < 0) {
    y = -(gy + 1) % 8;
    y = 7 - y;
  } else if (gy > 0) {
    y = gy % 8;
  }
  return { x, y };
};

/**
 * Draws a tile onto a PIXI tilemap.
 *
 * @param tilemap {PIXI.tilemap.CompositeRectTileLayer} The tilemap to draw on.
 * @param textureId {number} The id of the bitmap source to draw.
 * @param tx {number} The tile's X coordinate to draw. (In tilemap space)
 * @param ty {number} The tile's Y coordinate to draw. (In tilemap space)
 * @param dim {PIXI.Rectangle} The tile's dimensions on the bitmap to project.
 * @param flipX {boolean|number?} (Optional) If number, use 1 for true and 2 for random.
 * @param flipY {boolean|number?} (Optional) If number, use 1 for true and 2 for random.
 * @param rotate {number?} (Optional) If number, use 1 for true and 2 for random.
 */
export const drawTile = (tilemap, textureId, tx, ty, dim, flipX, flipY, rotate) => {
  let flag = 0;
  if (rotate) {
    flag = rotate;
  } else {
    if (typeof flipX === 'number') {
      if (flipX === 1) {
        flipX = true;
      } else if (flipX === 2) {
        flipX = Math.random() >= 0.5;
      }
    }
    if (typeof flipY === 'number') {
      if (flipY === 1) {
        flipY = true;
      } else if (flipY === 2) {
        flipY = Math.random() >= 0.5;
      }
    }

    // Calculate texture rotation value.
    if (flipX && flipY) {
      flag = 4;
    } else if (flipX) {
      flag = 12;
    } else if (flipY) {
      flag = 8;
    }
  }

  // Draw the tile.
  tilemap.addRect(
    textureId,
    dim.x,
    dim.y,
    tx * ROOM_TILE_SIZE,
    ty * ROOM_TILE_SIZE,
    dim.width,
    dim.height,
    null,
    null,
    flag,
  );
};

/**
 * Draws a tile on tilemap as a proxy, using the RoomSprite definition to provide details for {@link drawTile()};
 *
 * @param tilemap {PIXI.tilemap.CompositeRectTileLayer} The tilemap to draw on.
 * @param tx {number} The tile's X coordinate to draw. (In tilemap space)
 * @param ty {number} The tile's Y coordinate to draw. (In tilemap space)
 * @param sprite {RoomSprite} The RoomSprite to draw.
 */
export const drawSprite = (tilemap, sprite, tx, ty) => {
  drawTile(
    tilemap,
    sprite.sheet.index,
    tx,
    ty,
    sprite.dimensions,
    sprite.canFlipHorizontally() ? 2 : 0,
    sprite.canFlipVertically() ? 2 : 0,
  );
};

const _fogRect = new PIXI.Rectangle(0, 0, 8, 8);
export const _fogAtlasFrame = new PIXI.Rectangle(0, 0, 1, 1);

/**
 *
 * @param tilemap {PIXI.tilemap.CompositeRectTileLayer}
 * @param tx {number} The X coordinate. (In tiles)
 * @param ty {number} The Y coordinate. (In tiles)
 * @param type {string} The Type of {@link FogType} to render.
 */
export const drawFogTile = (tilemap, tx, ty, type) => {
  const tile = fogTiles[type];
  if (!tile) {
    console.error(`INVALID FOG TYPE: ${type}`);
    return;
  }

  // Set the dimensions for the tile to render using a temporary rectangle.
  _fogRect.x = tile.x + _fogAtlasFrame.x;
  _fogRect.y = tile.y + _fogAtlasFrame.y;

  drawTile(tilemap, 0, tx, ty, _fogRect, 0, 0, tile.rotate);

  // Fill fogMap to draw void later on.
  if (!tilemap.fogMap) tilemap.fogMap = [];
  if (!tilemap.fogMap[tx]) tilemap.fogMap[tx] = [];
  tilemap.fogMap[tx][ty] = 1;
};

/**
 * @param tilemap {PIXI.tilemap.CompositeRectTileLayer} The tilemap to draw on.
 * @param rx {number} The X coordinate of the rectangle. (In tiles)
 * @param ry {number} The Y coordinate of the rectangle. (In tiles)
 * @param width {number} The width of the rectangle. (In tiles)
 * @param height {number} The height of the rectangle. (In tiles)
 */
export const drawFogVoid = (tilemap, rx, ry, width, height) => {
  for (let ty = ry; ty <= ry + height; ty += 1) {
    for (let tx = rx; tx <= rx + width; tx += 1) {
      if (!tilemap.fogMap || !tilemap.fogMap[tx] || !tilemap.fogMap[tx][ty]) {
        drawFogTile(tilemap, tx, ty, FogType.VOID);
      }
    }
  }
};

/**
 *
 * @param tilemap {PIXI.tilemap.CompositeRectTileLayer} The tilemap to draw on.
 * @param rx {number} The X coordinate of the rectangle. (In tiles)
 * @param ry {number} The Y coordinate of the rectangle. (In tiles)
 * @param width {number} The width of the rectangle. (In tiles)
 * @param height {number} The height of the rectangle. (In tiles)
 * @param options {Object} The options to render the fog rectangle. <br/>
 * <ul>
 *   <li>north: Set to true to draw the north gradient. Set to false to render as fill.
 *   <li>south: Set to true to draw the north gradient. Set to false to render as fill.
 *   <li>east: Set to true to draw the north gradient. Set to false to render as fill.
 *   <li>west: Set to true to draw the north gradient. Set to false to render as fill.
 *   <li>fill: Set to true to draw fill inside of the rectangle.
 * </ul>
 * @param exemptions {number[][]} Define tile-coordinates to exempt from having fog tiles drawn in the same location.
 */
export const drawFogRect = (tilemap, rx, ry, width, height, options, exemptions) => {
  if (!options) {
    options = { north: true, south: true, east: true, west: true, fill: true };
  }

  const isExempt = (tx, ty) => {
    return exemptions && exemptions[tx] && exemptions[tx][ty];
  };

  let tile;
  // North Roof.
  tile = !options.north ? FogType.FILL : FogType.TOP;
  for (let x = 1; x < width - 1; x += 1) {
    const tx = rx + x;
    const ty = ry;
    if (!isExempt(tx, ty)) {
      drawFogTile(tilemap, tx, ty, tile);
    }
  }
  // South Roof.
  tile = !options.south ? FogType.FILL : FogType.BOTTOM;
  for (let x = 1; x < width - 1; x += 1) {
    const tx = rx + x;
    const ty = ry + height - 1;
    if (!isExempt(tx, ty)) {
      drawFogTile(tilemap, tx, ty, tile);
    }
  }
  // West Roof.
  tile = !options.west ? FogType.FILL : FogType.LEFT;
  for (let y = 1; y < height - 1; y += 1) {
    const tx = rx;
    const ty = ry + y;
    if (!isExempt(tx, ty)) {
      drawFogTile(tilemap, tx, ty, tile);
    }
  }
  // East Roof.
  tile = !options.east ? FogType.FILL : FogType.RIGHT;
  for (let y = 1; y < height - 1; y += 1) {
    const tx = rx + width - 1;
    const ty = ry + y;
    if (!isExempt(tx, ty)) {
      drawFogTile(tilemap, tx, ty, tile);
    }
  }

  // Northwest Roof
  if (!options.north && !options.west) {
    tile = FogType.TOP_LEFT_INNER;
  } else if (!options.north && options.west) {
    tile = FogType.LEFT;
  } else if (options.north && !options.west) {
    tile = FogType.TOP;
  } else {
    tile = FogType.TOP_LEFT_OUTER;
  }
  drawFogTile(tilemap, rx, ry, tile);

  // Northeast Roof
  if (!options.north && !options.east) {
    tile = FogType.TOP_RIGHT_INNER;
  } else if (!options.north && options.east) {
    tile = FogType.RIGHT;
  } else if (options.north && !options.east) {
    tile = FogType.TOP;
  } else {
    tile = FogType.TOP_RIGHT_OUTER;
  }
  drawFogTile(tilemap, rx + width - 1, ry, tile);

  // Southwest Roof
  if (!options.south && !options.west) {
    tile = FogType.BOTTOM_LEFT_INNER;
  } else if (!options.south && options.west) {
    tile = FogType.LEFT;
  } else if (options.south && !options.west) {
    tile = FogType.BOTTOM;
  } else {
    tile = FogType.BOTTOM_LEFT_OUTER;
  }
  drawFogTile(tilemap, rx, ry + height - 1, tile);

  // Southeast Roof
  if (!options.south && !options.east) {
    tile = FogType.BOTTOM_RIGHT_INNER;
  } else if (!options.south && options.east) {
    tile = FogType.RIGHT;
  } else if (options.south && !options.east) {
    tile = FogType.BOTTOM;
  } else {
    tile = FogType.BOTTOM_RIGHT_OUTER;
  }
  drawFogTile(tilemap, rx + width - 1, ry + height - 1, tile);

  // Fill
  if (options.fill) {
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const tx = rx + x;
        const ty = ry + y;
        if (!isExempt(tx, ty)) {
          drawFogTile(tilemap, tx, ty, FogType.FILL);
        }
      }
    }
  }
};

/**
 * @param x1 {number} The initial X coordinate of the object.
 * @param y1 {number} The initial Y coordinate of the object.
 * @param x2 {number} The destination X coordinate of the object.
 * @param y2 {number} The destination Y coordinate of the object.
 *
 * @return {string} Returns the direction that the destination is facing.
 */
export const getDirection = (x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  if (dx > 0) {
    if (dy < 0) {
      if (ady > adx) return Direction.SOUTH;
      return Direction.EAST;
    }
    if (dy > 0) {
      if (ady > adx) return Direction.NORTH;
      return Direction.EAST;
    }
    return Direction.EAST;
  }
  if (dx < 0) {
    if (dy < 0) {
      if (ady > adx) return Direction.SOUTH;
      return Direction.WEST;
    }
    if (dy > 0) {
      if (ady > adx) return Direction.NORTH;
      return Direction.WEST;
    }
    if (dy < 0) return Direction.SOUTH;
    if (dy > 0) return Direction.NORTH;
    return Direction.WEST;
  }

  if (dy < 0) return Direction.NORTH;
  return Direction.SOUTH;
};

export const getOppositeDirection = direction => {
  if (direction === Direction.NORTH) return Direction.SOUTH;
  if (direction === Direction.SOUTH) return Direction.NORTH;
  if (direction === Direction.EAST) return Direction.WEST;
  if (direction === Direction.WEST) return Direction.EAST;
  return undefined;
};

export const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '0x';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

/**
 * Rolls a {@link Math.random()} and is converted to the range given.
 *
 * @param min The minimum number to return.
 * @param max The maximum number to return.
 *
 * @return {number} Returns the result number rolled.
 */
export const getRandomNum = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
