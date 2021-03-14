import 'pixi.js';
import seedrandom from 'seedrandom';
import quests from 'data/quests';
import RoomType from '../../RoomType';
import Dirtable from '../../../utils/Dirtable';

import {
  DEBUG_BOXES_ENABLED,
  ROOM_BOXES_DISABLED,
  EXPANSION_ENABLED,
  EXPANSION_GROW_SIZE,
  EXPANSION_SHRINK_SIZE,
  CHUNK_ROOM_LENGTH,
  ROOM_TILE_SIZE,
  ROOM_SIZE,
  drawFogRect,
  toChunkCoordinates,
  toChunkLocalCoordinates,
  getRandomNum,
  drawSprite,
} from '../MapUtils';
import Direction from '../../../utils/Direction';
import Light from '../util/Light';

/**
 * TODO: Document.
 */
class Room extends Dirtable {
  /**
   * @constructor
   * @param chunk {MapChunk}
   * @param data The API object to apply for the room.
   */
  constructor(chunk, data) {
    super();

    this.chunk = chunk;
    this.map = chunk.map;
    this.contentLower = new PIXI.Container();
    this.contentUpper = new PIXI.Container();
    this.droppedLoot = [];
    this.tombs = [];
    this.setData(data);
  }

  /**
   * @param data The API object to apply for the room.
   */
  setData(data) {
    const { hash, areaType, coordinates, expansions } = data;
    this.data = data;

    const [x, y] = coordinates.split(',').map(Number);
    this.position = new PIXI.Point(x, y);

    // TODO remove global?
    seedrandom(hash, { global: true });
    this.themePercentage = Math.random() * 0.35 + 0.5; // 0.85;

    if (this.isTeleporter()) {
      this.themePercentage = 1;
      this.type = RoomType.TELEPORT;
    } else if (this.isTemple()) {
      this.themePercentage = 1;
      this.type = RoomType.TEMPLE;
    } else if (this.isLore()) {
      this.themePercentage = 1;
      this.type = RoomType.LORE;
    } else if (this.isCarrier()) {
      this.themePercentage = 1;
      this.type = RoomType.LIFT;
    } else if (areaType === 1) {
      this.type = RoomType.FIRE;
    } else if (areaType === 2) {
      this.type = RoomType.WIND;
    } else if (areaType === 3) {
      this.type = RoomType.ELECTRIC;
    } else if (areaType === 4) {
      this.type = RoomType.WOOD;
    } else if (areaType === 5) {
      this.type = RoomType.WATER;
    } else if (areaType === 6 || areaType === 0) {
      this.type = RoomType.BOSS;
      this.themePercentage = 0.33;
    } else {
      this.type = RoomType.NORMAL;
    }

    this.spriteSheet = this.map.roomSpriteSheets[this.type];

    this.offsetX = 0;
    this.offsetY = 0;
    this.width = ROOM_SIZE;
    this.height = ROOM_SIZE;
    if (EXPANSION_ENABLED && expansions) {
      if (expansions.west != null) {
        if (expansions.west < 0) {
          this.offsetX = expansions.west * -EXPANSION_SHRINK_SIZE;
        } else {
          this.offsetX = expansions.west * -EXPANSION_GROW_SIZE;
        }
        this.width -= this.offsetX;
      }
      if (expansions.north != null) {
        if (expansions.north < 0) {
          this.offsetY = expansions.north * -EXPANSION_SHRINK_SIZE;
        } else {
          this.offsetY = expansions.north * -EXPANSION_GROW_SIZE;
        }
        this.height -= this.offsetY;
      }
      if (expansions.east != null) {
        if (expansions.east < 0) {
          this.width += expansions.east * EXPANSION_SHRINK_SIZE;
        } else {
          this.width += expansions.east * EXPANSION_GROW_SIZE;
        }
      }
      if (expansions.south != null) {
        if (expansions.south < 0) {
          this.height += expansions.south * EXPANSION_SHRINK_SIZE;
        } else {
          this.height += expansions.south * EXPANSION_GROW_SIZE;
        }
      }
    }

    const l = toChunkLocalCoordinates(this.position.x, this.position.y);
    this.lx = l.x * ROOM_SIZE + this.offsetX;
    this.ly = l.y * ROOM_SIZE + this.offsetY;
    this.chunkPosition = toChunkCoordinates(this.position.x, this.position.y);
    this.center = new PIXI.Point(
      this.chunk.position.x + Math.floor((this.lx + this.width / 2) * ROOM_TILE_SIZE),
      this.chunk.position.y + Math.floor((this.ly + this.height / 2) * ROOM_TILE_SIZE),
    );
    this.doorCenter = new PIXI.Point(
      this.chunk.position.x + Math.floor((l.x * ROOM_SIZE + ROOM_SIZE / 2) * ROOM_TILE_SIZE),
      this.chunk.position.y + Math.floor((l.y * ROOM_SIZE + ROOM_SIZE / 2) * ROOM_TILE_SIZE),
    );

    // Calculate inner dimensions for the wall structure.
    this.lxInner = this.lx;
    this.lyInner = this.ly;
    this.widthInner = this.width;
    this.heightInner = this.height;
    if (this.isHorizontalCorridor()) {
      this.lyInner = this.ly + 2 - this.offsetY;
      this.heightInner = 7;
    } else if (this.isVerticalCorridor()) {
      this.lxInner = this.lx + 3 - this.offsetX;
      this.widthInner = 5;
    }

    this.bounds = new PIXI.Rectangle(
      this.chunkPosition.x * CHUNK_ROOM_LENGTH * ROOM_SIZE + this.lx + this.offsetX,
      this.chunkPosition.y * CHUNK_ROOM_LENGTH * ROOM_SIZE + this.ly + this.offsetY,
      this.width,
      this.height,
    );

    if (DEBUG_BOXES_ENABLED && !ROOM_BOXES_DISABLED) {
      this.box = new PIXI.Graphics();
      this.box.parentGroup = this.map.debugGroup;
      this.box.lineStyle(1, this.chunk.color || 0xffffff);
      this.box.drawRect(this.lx * 8, this.ly * 8, this.width * 8, this.height * 8);
      this.box.closePath();
    }

    const tx = this.position.x * ROOM_SIZE;
    const ty = this.position.y * ROOM_SIZE;
    this.exits = {};
    this.exits[Direction.NORTH] = new PIXI.Point(
      Math.floor((tx + this.width / 2) * ROOM_TILE_SIZE),
      Math.floor(ty * ROOM_TILE_SIZE),
    );
    this.exits[Direction.SOUTH] = new PIXI.Point(
      Math.floor((tx + this.width / 2) * ROOM_TILE_SIZE),
      Math.floor((ty + this.height - 1) * ROOM_TILE_SIZE),
    );
    this.exits[Direction.EAST] = new PIXI.Point(
      Math.floor((tx + this.width - 1) * ROOM_TILE_SIZE),
      Math.floor((ty + this.height / 2) * ROOM_TILE_SIZE),
    );
    this.exits[Direction.WEST] = new PIXI.Point(
      Math.floor(tx * ROOM_TILE_SIZE),
      Math.floor((ty + this.height / 2) * ROOM_TILE_SIZE),
    );

    if (this.contentLower.children.length === 0) {
      if (this.isTeleporter()) {
        const gx = this.chunk.cx * CHUNK_ROOM_LENGTH * ROOM_SIZE + this.lxInner;
        const gy = this.chunk.cy * CHUNK_ROOM_LENGTH * ROOM_SIZE + this.lyInner;

        // console.log({ coordinates, gx, gy });
        const ttex = PIXI.utils.TextureCache.teleporter;
        this.teleport = new PIXI.Sprite(ttex);
        this.teleport.scale.set(1.5, 1.5);
        let telX = ROOM_TILE_SIZE * (gx + this.widthInner / 2);
        let telY = ROOM_TILE_SIZE * (gy + this.heightInner / 2) + ROOM_TILE_SIZE / 2;
        telX -= (ttex.width * this.teleport.scale.x) / 2;
        telY -= (ttex.height * this.teleport.scale.y) / 2;
        this.teleport.position.set(Math.floor(telX), Math.floor(telY));
        this.contentLower.addChild(this.teleport);

        this.teleportBL = new PIXI.Sprite(this.map.teleporterCorners[4]);
        this.teleportBR = new PIXI.Sprite(this.map.teleporterCorners[5]);
        this.teleportTL = new PIXI.Sprite(this.map.teleporterCorners[6]);
        this.teleportTR = new PIXI.Sprite(this.map.teleporterCorners[7]);

        const x1 = ROOM_TILE_SIZE * (gx + 1);
        const y1 = ROOM_TILE_SIZE * (gy + 1);
        const x2 = ROOM_TILE_SIZE * (gx + this.widthInner - 2) - 1;
        const y2 = ROOM_TILE_SIZE * (gy + this.heightInner - 2) - 1;

        this.teleportTL.position.set(x1, y1);
        this.teleportTR.position.set(x2, y1);
        this.teleportBR.position.set(x2, y2);
        this.teleportBL.position.set(x1, y2);

        this.contentUpper.addChild(this.teleportTL, this.teleportTR);
        this.contentUpper.addChild(this.teleportBL, this.teleportBR);

        this.updateTeleporter();
      } else if (this.isTemple()) {
        const ttex = PIXI.utils.TextureCache.temple_center;
        const gx = this.chunk.cx * CHUNK_ROOM_LENGTH * ROOM_SIZE + this.lxInner;
        const gy = this.chunk.cy * CHUNK_ROOM_LENGTH * ROOM_SIZE + this.lyInner;
        let telX = ROOM_TILE_SIZE * (gx + this.widthInner / 2);
        let telY = ROOM_TILE_SIZE * (gy + this.heightInner / 2) + ROOM_TILE_SIZE / 2;

        this.templeCenter = new PIXI.Sprite(ttex);
        this.templeCenter.scale.set(1.5, 1.5);
        telX -= (ttex.width * this.templeCenter.scale.x) / 2;
        telY -= (ttex.height * this.templeCenter.scale.y) / 2;
        this.templeCenter.position.set(Math.floor(telX), Math.floor(telY));
        this.contentLower.addChild(this.templeCenter);
      } else if (this.isCarrier()) {
        const t = PIXI.utils.TextureCache;
        // eslint-disable-next-line camelcase
        const { lift_full1, lift_full2, lift_full3, lift_full4, lift_full5, lift_full6, lift_full7, lift_full8 } = t;
        // eslint-disable-next-line camelcase
        const ttex = [lift_full1, lift_full2, lift_full3, lift_full4, lift_full5, lift_full6, lift_full7, lift_full8];
        const sprite = new PIXI.AnimatedSprite(ttex);
        sprite.animationSpeed = 0.15;
        sprite.parentGroup = this.chunk.map.upperGroup;

        const gx = this.chunk.cx * CHUNK_ROOM_LENGTH * ROOM_SIZE + this.lxInner;
        const gy = this.chunk.cy * CHUNK_ROOM_LENGTH * ROOM_SIZE + this.lyInner;
        let telX = ROOM_TILE_SIZE * (gx + this.widthInner / 2);
        let telY = ROOM_TILE_SIZE * (gy + this.heightInner / 2) + ROOM_TILE_SIZE / 2;

        telX -= ttex[0].width / 2;
        telY -= ttex[0].height;
        sprite.position.set(Math.floor(telX), Math.floor(telY));
        sprite.play();
        this.contentUpper.addChild(sprite);
      }
    }

    this.topLeft = new PIXI.Point(
      this.center.x - (this.widthInner / 2) * ROOM_TILE_SIZE,
      this.center.y - (this.heightInner / 2) * ROOM_TILE_SIZE,
    );
    this.positions = [];

    const sixth = (ROOM_TILE_SIZE * ROOM_SIZE) / 6;
    const _tx = this.topLeft.x;
    const _ty = this.topLeft.y;
    if (this.isHorizontalCorridor()) {
      this.positions.push(new PIXI.Point(_tx + 1.5 * sixth, this.center.y));
      this.positions.push(new PIXI.Point(_tx + 2.5 * sixth, this.center.y));
      this.positions.push(new PIXI.Point(_tx + 3.5 * sixth, this.center.y));
      this.positions.push(new PIXI.Point(_tx + 4.5 * sixth, this.center.y));
    } else if (this.isVerticalCorridor()) {
      this.positions.push(new PIXI.Point(this.center.x, _ty + 2 * sixth));
      this.positions.push(new PIXI.Point(this.center.x, _ty + 3 * sixth));
      this.positions.push(new PIXI.Point(this.center.x, _ty + 4 * sixth));
      this.positions.push(new PIXI.Point(this.center.x, _ty + 5 * sixth));
    } else {
      const x1 = this.topLeft.x + 3 * ROOM_TILE_SIZE;
      const y1 = this.topLeft.y + 3 * ROOM_TILE_SIZE;
      const x2 = this.topLeft.x + (this.widthInner - 6 + 3) * ROOM_TILE_SIZE;
      const y2 = this.topLeft.y + (this.heightInner - 6 + 3) * ROOM_TILE_SIZE;
      this.positions.push(new PIXI.Point(x1, y1));
      this.positions.push(new PIXI.Point(x2, y1));
      this.positions.push(new PIXI.Point(x2, y2));
      this.positions.push(new PIXI.Point(x1, y2));
    }

    this.setDirty(true);

    if (!this.light) {
      this.light = new Light(0xffffff, 0.2);
      this.light.visible = false;
      this.light.position.set(this.center.x, this.center.y + 6);
      this.contentUpper.addChild(this.light);
    }
  }

  clickedTomb(point) {
    if (this.tombs.length === 0) return false;

    const tombs = Object.values(this.tombs);
    const rect = new PIXI.Rectangle();
    for (let index = 0; index < tombs.length; index += 1) {
      const next = tombs[index];
      if (next) {
        next.sprite.getBounds(false, rect);
        console.log(rect);
        if (rect.contains(point.x, point.y)) {
          return true;
        }
      }
    }

    return false;
  }

  get coordinates() {
    return this.data.coordinates;
  }

  addTomb(tomb) {
    this.tombs.push(tomb);
  }

  removeTomb(tomb) {
    if (this.tombs.length === 0) {
      return;
    }

    const tombs = Object.values(this.tombs);
    this.tombs.length = 0;
    tombs.forEach(next => {
      if (next !== tomb) {
        this.tombs.push(next);
      }
    });
  }

  addDroppedLoot(loot) {
    this.droppedLoot.push(loot);
  }

  removeDroppedLoot(loot) {
    if (this.droppedLoot.length === 0) {
      return;
    }

    const droppedLoot = Object.values(this.droppedLoot);
    this.droppedLoot.length = 0;
    droppedLoot.forEach(next => {
      if (next !== loot) {
        this.droppedLoot.push(next);
      }
    });
  }

  /**
   * @param manualSwitch {undefined|boolean} Set to true or false to manually switch on or off the teleporter.
   *   Leave undefined to check if the player is in the room.
   */
  updateTeleporter(manualSwitch = undefined) {
    if (!this.isTeleporter()) return;
    if ((manualSwitch === undefined && this.isMyCharacterInRoom()) || manualSwitch) {
      if (!this.teleportOn) {
        this.teleport.texture = PIXI.utils.TextureCache.teleporter;
        // eslint-disable-next-line prefer-destructuring
        this.teleportBL.texture = this.map.teleporterCorners[0];
        // eslint-disable-next-line prefer-destructuring
        this.teleportBR.texture = this.map.teleporterCorners[1];
        // eslint-disable-next-line prefer-destructuring
        this.teleportTL.texture = this.map.teleporterCorners[2];
        // eslint-disable-next-line prefer-destructuring
        this.teleportTR.texture = this.map.teleporterCorners[3];
        this.teleportOn = true;
      }
    } else {
      this.teleport.texture = PIXI.utils.TextureCache.teleporter_off;
      // eslint-disable-next-line prefer-destructuring
      this.teleportBL.texture = this.map.teleporterCorners[4];
      // eslint-disable-next-line prefer-destructuring
      this.teleportBR.texture = this.map.teleporterCorners[5];
      // eslint-disable-next-line prefer-destructuring
      this.teleportTL.texture = this.map.teleporterCorners[6];
      // eslint-disable-next-line prefer-destructuring
      this.teleportTR.texture = this.map.teleporterCorners[7];
      this.teleportOn = false;
    }
  }

  /**
   * @param chunk {MapChunk}
   */
  drawFog(chunk) {
    const tilemap = chunk.tilemapFog;
    tilemap.fogMap = [];
    const exemptions = [];
    const addException = (tx, ty) => {
      if (!exemptions[tx]) exemptions[tx] = [];
      exemptions[tx][ty] = true;
    };

    const northRoom = this.getNeighbor(Direction.NORTH);
    const southRoom = this.getNeighbor(Direction.SOUTH);
    const eastRoom = this.getNeighbor(Direction.EAST);
    const westRoom = this.getNeighbor(Direction.WEST);

    const rx = this.lxInner;
    const ry = this.lyInner;
    const rw = this.widthInner;
    let rh = this.heightInner;
    if (!this.isCorridor() && (!southRoom || southRoom.isCorridor())) {
      rh += 1;
    }

    const { allExits } = this.data;

    if (allExits) {
      if (allExits.north) {
        addException(this.lx + 4 - this.offsetX, this.ly);
        addException(this.lx + 5 - this.offsetX, this.ly);
        addException(this.lx + 6 - this.offsetX, this.ly);
      }
      if (allExits.south) {
        const y = this.ly + rh - 1;
        addException(this.lx + 4 - this.offsetX, y);
        addException(this.lx + 5 - this.offsetX, y);
        addException(this.lx + 6 - this.offsetX, y);
      }
      if (allExits.east) {
        const x = this.lx + this.width - 1;
        addException(x, this.ly + 4 - this.offsetY);
        addException(x, this.ly + 5 - this.offsetY);
        addException(x, this.ly + 6 - this.offsetY);
      }
      if (allExits.west) {
        addException(this.lx, this.ly + 4 - this.offsetY);
        addException(this.lx, this.ly + 5 - this.offsetY);
        addException(this.lx, this.ly + 6 - this.offsetY);
      }
    }

    let northLit = this.isNeighborLit(Direction.NORTH);
    if (!this.isCorridor()) {
      if (northRoom && northRoom.isCorridor()) {
        northLit = false;
      }
    } else if (this.isHorizontalCorridor()) {
      northLit = false;
    }
    let southLit = this.isNeighborLit(Direction.SOUTH);
    if (!this.isCorridor()) {
      if (southRoom && southRoom.isCorridor()) {
        southLit = false;
      }
    } else if (this.isHorizontalCorridor()) {
      southLit = false;
    }
    let eastLit = this.isNeighborLit(Direction.EAST);
    if (!this.isCorridor()) {
      if (eastRoom && eastRoom.isCorridor()) {
        eastLit = false;
      }
    } else if (this.isVerticalCorridor()) {
      eastLit = false;
    }
    let westLit = this.isNeighborLit(Direction.WEST);
    if (!this.isCorridor()) {
      if (westRoom && westRoom.isCorridor()) {
        westLit = false;
      }
    } else if (this.isVerticalCorridor()) {
      westLit = false;
    }

    const options = { north: !northLit, south: !southLit, east: !eastLit, west: !westLit, fill: true };
    drawFogRect(tilemap, rx, ry, rw, rh, options, exemptions);

    if (this.box) {
      this.box.tint = this.isReachable() ? 0x00ff00 : 0x0000ff;
    }
  }

  /**
   * @param chunk {MapChunk}
   * @param renderPass {string} The current pass being rendered. This will affect what tiles render for z-layer purposes.
   */
  drawExterior(chunk, renderPass) {
    const tilemap = renderPass === 'lower' ? chunk.tilemapLower : chunk.tilemapUpper;

    seedrandom(`${this.position.x},${this.position.y}`, { global: true });

    if (this.isCorridor()) {
      this.drawCorridorRoof(tilemap, renderPass);
    } else {
      this.drawRoof(tilemap, renderPass);
    }
  }

  /**
   * @param chunk {MapChunk}
   * @param renderPass {string} The current pass being rendered. This will affect what tiles render for z-layer purposes.
   */
  drawInterior(chunk, renderPass) {
    const tilemap = renderPass === 'lower' ? chunk.tilemapLower : chunk.tilemapUpper;

    seedrandom(`${this.position.x},${this.position.y}`, { global: true });

    if (this.isCorridor()) {
      this.drawCorridorWalls(tilemap, renderPass);
    } else {
      // Floor and props should display below content and players.
      if (renderPass === 'lower') {
        if (this.spriteSheet.floors.length !== 0) {
          this.drawFloors(tilemap);
        }
        this.drawProps(tilemap);
      }
      this.drawWalls(tilemap, renderPass);
    }
  }

  /**
   * @param tilemap {PIXI.tilemap.CompositeRectTileLayer}
   * @param renderPass {string} The current pass being rendered. This will affect what tiles render for z-layer purposes.
   */
  drawCorridorRoof(tilemap, renderPass) {
    const { allExits, expansions } = this.data;
    const roomNorth = this.getNeighbor(Direction.NORTH);
    const roomSouth = this.getNeighbor(Direction.SOUTH);
    const roomEast = this.getNeighbor(Direction.EAST);
    const roomWest = this.getNeighbor(Direction.WEST);
    const fillNorth =
      allExits.north && roomNorth && expansions.north === -0.5 && roomNorth.data.expansions.south === -0.5;
    const fillSouth =
      allExits.south && roomSouth && expansions.south === -0.5 && roomSouth.data.expansions.north === -0.5;
    const fillEast = allExits.east && roomEast && expansions.east === -0.5 && roomEast.data.expansions.west === -0.5;
    const fillWest = allExits.west && roomWest && expansions.west === -0.5 && roomWest.data.expansions.east === -0.5;

    if (allExits.north && allExits.south) {
      const left = this.lx + 3 - this.offsetX;
      const right = this.lx + 7 - this.offsetX;
      if (renderPass === 'lower') {
        for (let y = 0; y < Math.floor(this.height / 2); y += 1) {
          drawSprite(tilemap, this.nextRoof(), left, this.ly + y);
          drawSprite(tilemap, this.nextRoof(), right, this.ly + y);
        }
        if (fillNorth) {
          drawSprite(tilemap, this.nextRoof(), left, this.ly - 1);
          drawSprite(tilemap, this.nextRoof(), left, this.ly - 2);
          drawSprite(tilemap, this.nextRoof(), right, this.ly - 1);
          drawSprite(tilemap, this.nextRoof(), right, this.ly - 2);
        }
      } else if (renderPass === 'upper') {
        for (let y = Math.floor(this.height / 2); y < this.height; y += 1) {
          drawSprite(tilemap, this.nextRoof(), left, this.ly + y);
          drawSprite(tilemap, this.nextRoof(), right, this.ly + y);
        }
        if (fillSouth) {
          drawSprite(tilemap, this.nextRoof(), left, this.ly + this.height);
          drawSprite(tilemap, this.nextRoof(), left, this.ly + this.height + 1);
          drawSprite(tilemap, this.nextRoof(), right, this.ly + this.height);
          drawSprite(tilemap, this.nextRoof(), right, this.ly + this.height + 1);
        }
      }
      this.updateDoorPosition(Direction.NORTH, this.lx + (5.5 - this.offsetX), this.ly + 1.5);
      this.updateDoorPosition(Direction.SOUTH, this.lx + (5.5 - this.offsetX), this.ly + this.height + 0.5);
    } else if (allExits.east && allExits.west) {
      if (renderPass === 'lower') {
        const top = this.ly + 2 - this.offsetY;
        for (let x = 0; x < this.width; x += 1) {
          drawSprite(tilemap, this.nextRoof(), this.lx + x, top);
        }
        if (fillEast) {
          drawSprite(tilemap, this.nextRoof(), this.lx + this.width, top);
          drawSprite(tilemap, this.nextRoof(), this.lx + this.width + 1, top);
        }
        if (fillWest) {
          drawSprite(tilemap, this.nextRoof(), this.lx - 1, top);
          drawSprite(tilemap, this.nextRoof(), this.lx - 2, top);
        }
      } else if (renderPass === 'upper') {
        const bottom = this.ly + 7 - this.offsetY;
        for (let x = 0; x < this.width; x += 1) {
          drawSprite(tilemap, this.nextRoof(), this.lx + x, bottom);
        }
        if (fillEast) {
          drawSprite(tilemap, this.nextRoof(), this.lx + this.width, bottom);
          drawSprite(tilemap, this.nextRoof(), this.lx + this.width + 1, bottom);
        }
        if (fillWest) {
          drawSprite(tilemap, this.nextRoof(), this.lx - 1, bottom);
          drawSprite(tilemap, this.nextRoof(), this.lx - 2, bottom);
        }
      }
      this.updateDoorPosition(Direction.EAST, this.lx + this.width - 0.5, this.ly + (5.5 - this.offsetY));
      this.updateDoorPosition(Direction.WEST, this.lx + 0.5, this.ly + (5.5 - this.offsetY));
    }
  }

  /**
   * @param tilemap {PIXI.tilemap.CompositeRectTileLayer}
   * @param renderPass {string} The current pass being rendered. This will affect what tiles render for z-layer purposes.
   */
  drawCorridorWalls(tilemap, renderPass) {
    const { allExits } = this.data;
    if (allExits.east && allExits.west) {
      const top = this.ly + 3 - this.offsetY;
      const bottom = this.ly + 8 - this.offsetY;
      for (let x = 0; x < this.width; x += 1) {
        if (renderPass === 'lower') {
          drawSprite(tilemap, this.nextWall(), this.lx + x, top);
        } else if (renderPass === 'upper') {
          drawSprite(tilemap, this.nextWall(), this.lx + x, bottom);
        }
      }
    }
  }

  /**
   * @param tilemap {PIXI.tilemap.CompositeRectTileLayer}
   * @param renderPass {string} The current pass being rendered. This will affect what tiles render for z-layer purposes.
   *
   * @private
   */
  drawRoof(tilemap, renderPass) {
    const { allExits, expansions } = this.data;
    const roomNorth = this.getNeighbor(Direction.NORTH);
    const roomSouth = this.getNeighbor(Direction.SOUTH);
    const roomEast = this.getNeighbor(Direction.EAST);
    const roomWest = this.getNeighbor(Direction.WEST);
    const fillNorth =
      allExits.north && roomNorth && expansions.north === -0.5 && roomNorth.data.expansions.south === -0.5;
    const fillSouth =
      allExits.south && roomSouth && expansions.south === -0.5 && roomSouth.data.expansions.north === -0.5;
    const fillEast = allExits.east && roomEast && expansions.east === -0.5 && roomEast.data.expansions.west === -0.5;
    const fillWest = allExits.west && roomWest && expansions.west === -0.5 && roomWest.data.expansions.east === -0.5;
    // Top Roof.
    if (renderPass === 'lower') {
      if (allExits.north) {
        const doors = [];
        doors[4 - this.offsetX] = true;
        doors[5 - this.offsetX] = true;
        doors[6 - this.offsetX] = true;
        for (let x = 1; x < this.width - 1; x += 1) {
          if (!doors[x]) {
            drawSprite(tilemap, this.nextRoof(), this.lx + x, this.ly);
          }
        }
        this.updateDoorPosition(Direction.NORTH, this.lx + (5.5 - this.offsetX), this.ly + 1.5);
      } else {
        for (let x = 1; x < this.width - 1; x += 1) {
          drawSprite(tilemap, this.nextRoof(), this.lx + x, this.ly);
        }
      }

      if (fillWest) {
        drawSprite(tilemap, this.nextRoof(), this.lx - 1, this.ly + 2);
        drawSprite(tilemap, this.nextRoof(), this.lx - 2, this.ly + 2);
      }
      if (fillEast) {
        drawSprite(tilemap, this.nextRoof(), this.lx + this.width, this.ly + 2);
        drawSprite(tilemap, this.nextRoof(), this.lx + this.width + 1, this.ly + 2);
      }
    }

    // Bottom Roof.
    if (renderPass === 'upper') {
      const y = this.ly + this.height - 1;
      if (allExits.south) {
        const doors = [];
        doors[4 - this.offsetX] = true;
        doors[5 - this.offsetX] = true;
        doors[6 - this.offsetX] = true;
        this.updateDoorPosition(Direction.SOUTH, this.lx + (5.5 - this.offsetX), y + 1.5);
        for (let x = 1; x < this.width - 1; x += 1) {
          if (!doors[x]) {
            drawSprite(tilemap, this.nextRoof(), this.lx + x, y);
          }
        }
      } else {
        for (let x = 1; x < this.width - 1; x += 1) {
          drawSprite(tilemap, this.nextRoof(), this.lx + x, y);
        }
      }

      if (fillWest) {
        drawSprite(tilemap, this.nextRoof(), this.lx - 1, y - 2);
        drawSprite(tilemap, this.nextRoof(), this.lx - 2, y - 2);
      }
      if (fillEast) {
        drawSprite(tilemap, this.nextRoof(), this.lx + this.width, y - 2);
        drawSprite(tilemap, this.nextRoof(), this.lx + this.width + 1, y - 2);
      }
    }

    // Left Roof.
    if (allExits.west) {
      const doors = [];
      doors[4 - this.offsetY] = true;
      doors[5 - this.offsetY] = true;
      doors[6 - this.offsetY] = true;
      this.updateDoorPosition(Direction.WEST, this.lx + 0.5, this.ly + (5.5 - this.offsetY));
      if (renderPass === 'lower') {
        for (let y = 1; y < Math.floor(this.height / 2); y += 1) {
          if (!doors[y]) {
            drawSprite(tilemap, this.nextRoof(), this.lx, this.ly + y);
          }
        }

        if (fillNorth) {
          drawSprite(tilemap, this.nextRoof(), this.lx + 2, this.ly - 1);
          drawSprite(tilemap, this.nextRoof(), this.lx + 2, this.ly - 2);
        }
      } else if (renderPass === 'upper') {
        for (let y = Math.floor(this.height / 2); y < this.height - 1; y += 1) {
          if (!doors[y]) {
            drawSprite(tilemap, this.nextRoof(), this.lx, this.ly + y);
          }
        }

        if (fillSouth) {
          drawSprite(tilemap, this.nextRoof(), this.lx + 2, this.ly + this.height);
          drawSprite(tilemap, this.nextRoof(), this.lx + 2, this.ly + this.height + 1);
        }
      }
    } else if (renderPass === 'lower') {
      for (let y = 1; y < Math.floor(this.height / 2); y += 1) {
        drawSprite(tilemap, this.nextRoof(), this.lx, this.ly + y);
      }
      if (fillNorth) {
        drawSprite(tilemap, this.nextRoof(), this.lx + 2, this.ly - 1);
        drawSprite(tilemap, this.nextRoof(), this.lx + 2, this.ly - 2);
      }
    } else if (renderPass === 'upper') {
      for (let y = Math.floor(this.height / 2); y < this.height - 1; y += 1) {
        drawSprite(tilemap, this.nextRoof(), this.lx, this.ly + y);
      }
      if (fillSouth) {
        drawSprite(tilemap, this.nextRoof(), this.lx + 2, this.ly + this.height);
        drawSprite(tilemap, this.nextRoof(), this.lx + 2, this.ly + this.height + 1);
      }
    }
    // Right Roof.
    if (allExits.east) {
      const doors = [];
      doors[4 - this.offsetY] = true;
      doors[5 - this.offsetY] = true;
      doors[6 - this.offsetY] = true;
      this.updateDoorPosition(Direction.EAST, this.lx + this.width - 0.5, this.ly + (5.5 - this.offsetY));
      if (renderPass === 'lower') {
        for (let y = 1; y < Math.floor(this.height / 2); y += 1) {
          if (!doors[y]) {
            drawSprite(tilemap, this.nextRoof(), this.lx + this.width - 1, this.ly + y);
          }

          if (fillNorth) {
            drawSprite(tilemap, this.nextRoof(), this.lx + this.width - 1 - 2, this.ly - 1);
            drawSprite(tilemap, this.nextRoof(), this.lx + this.width - 1 - 2, this.ly - 2);
          }
        }
      } else if (renderPass === 'upper') {
        for (let y = Math.floor(this.height / 2); y < this.height - 1; y += 1) {
          if (!doors[y]) {
            drawSprite(tilemap, this.nextRoof(), this.lx + this.width - 1, this.ly + y);
          }
        }
        if (fillSouth) {
          drawSprite(tilemap, this.nextRoof(), this.lx + this.width - 1 - 2, this.ly + this.height);
          drawSprite(tilemap, this.nextRoof(), this.lx + this.width - 1 - 2, this.ly + this.height + 1);
        }
      }
    } else if (renderPass === 'lower') {
      for (let y = 1; y < Math.floor(this.height / 2); y += 1) {
        drawSprite(tilemap, this.nextRoof(), this.lx + this.width - 1, this.ly + y);
      }
      if (fillNorth) {
        drawSprite(tilemap, this.nextRoof(), this.lx + this.width - 1 - 2, this.ly - 1);
        drawSprite(tilemap, this.nextRoof(), this.lx + this.width - 1 - 2, this.ly - 2);
      }
    } else if (renderPass === 'upper') {
      for (let y = Math.floor(this.height / 2); y < this.height - 1; y += 1) {
        drawSprite(tilemap, this.nextRoof(), this.lx + this.width - 1, this.ly + y);
      }
      if (fillSouth) {
        drawSprite(tilemap, this.nextRoof(), this.lx + this.width - 1 - 2, this.ly + this.height);
        drawSprite(tilemap, this.nextRoof(), this.lx + this.width - 1 - 2, this.ly + this.height + 1);
      }
    }

    if (renderPass === 'lower') {
      // Top-Left Roof
      drawSprite(tilemap, this.nextRoof(), this.lx, this.ly);
      // Top-Right Roof
      drawSprite(tilemap, this.nextRoof(), this.lx + this.width - 1, this.ly);
    } else if (renderPass === 'upper') {
      // Bottom-Right Roof
      drawSprite(tilemap, this.nextRoof(), this.lx + this.width - 1, this.ly + this.height - 1);
      // Bottom-Right Roof
      drawSprite(tilemap, this.nextRoof(), this.lx, this.ly + this.height - 1);
    }
  }

  /**
   * @param tilemap {PIXI.tilemap.CompositeRectTileLayer}
   * @param renderPass {string} The current pass being rendered. This will affect what tiles render for z-layer purposes.
   *
   * @private
   */
  drawWalls(tilemap, renderPass) {
    const { allExits } = this.data;
    if (renderPass === 'lower') {
      if (allExits.north) {
        const doors = [];
        doors[4 - this.offsetX] = true;
        doors[5 - this.offsetX] = true;
        doors[6 - this.offsetX] = true;
        for (let x = 1; x < this.width - 1; x += 1) {
          if (!doors[x]) {
            drawSprite(tilemap, this.nextWall(), this.lx + x, this.ly + 1);
          }
        }
      } else {
        for (let x = 1; x < this.width - 1; x += 1) {
          drawSprite(tilemap, this.nextWall(), this.lx + x, this.ly + 1);
        }
      }
      if (this.isTeleporter()) {
        drawSprite(tilemap, this.nextWall(), this.lx + 1, this.ly + 2);
        drawSprite(tilemap, this.nextWall(), this.lx + this.widthInner - 2, this.ly + 2);
      }
    } else if (renderPass === 'upper') {
      const doors = [];
      doors[3 - this.offsetX] = true;
      doors[4 - this.offsetX] = true;
      doors[5 - this.offsetX] = true;
      doors[6 - this.offsetX] = true;
      doors[7 - this.offsetX] = true;

      // Bottom Wall.
      const southRoom = this.getNeighbor(Direction.SOUTH);
      if (!southRoom || southRoom.isCorridor()) {
        for (let x = 0; x < this.width; x += 1) {
          if (!allExits.south || !doors[x]) {
            drawSprite(tilemap, this.nextWall(), this.lx + x, this.ly + this.height);
          }
        }
      }
    }
  }

  /**
   * @param tilemap
   *
   * @private
   */
  drawFloors(tilemap) {
    const x1 = this.lx + 1;
    const y1 = this.ly + 2;
    const x2 = this.lx + this.width - 2;
    const y2 = this.ly + this.height - 2;
    const floorCount = getRandomNum(0, (this.width * this.height) / 12);
    for (let index = 0; index < floorCount; index += 1) {
      const x = getRandomNum(x1, x2);
      const y = getRandomNum(y1, y2);
      const nextFloor = this.nextFloor();
      if (nextFloor) {
        drawSprite(tilemap, nextFloor, x, y);
      }
    }
  }

  /**
   * @param tilemap {PIXI.tilemap.CompositeRectTileLayer}
   *
   * @private
   */
  drawProps(tilemap) {
    const x1 = this.lx + 1;
    const y1 = this.ly + 2;
    const x2 = this.lx + this.width - 2;
    const y2 = this.ly + this.height - 2;

    const propCount = getRandomNum(0, (this.width * this.height) / 24);
    for (let index = 0; index < propCount; index += 1) {
      const prop = this.nextProp();
      if (prop) {
        const x = getRandomNum(x1, x2);
        const y = getRandomNum(y1, y2);
        drawSprite(tilemap, prop, x, y);
      }
    }
  }

  getPosition(charId, forceSlot = false) {
    const charCount = forceSlot && !this.inside(charId) ? this.data.characters + 1 : this.data.characters;
    if (charCount <= 1 || charCount > 4) {
      return this.center;
    }

    const charIds = Object.keys(global.dungeon.cache.onlineCharacters);

    let offset = 0;
    /** {Array} */
    const chars = [...Object.values(global.dungeon.cache.onlineCharacters)].sort((a, b) => {
      return a.charId - b.charId;
    });

    const isCharacterAt = (_charId, x, y) => {
      const char =
        this.chunk.map.myCharacter && this.chunk.map.myCharacter.charId
          ? this.chunk.map.myCharacter
          : this.chunk.map.characters[_charId];
      return char && Math.round(char.position.x) === Math.round(x) && Math.round(char.position.y) === Math.round(y);
    };

    const isACharAt = (x, y) => {
      for (let index = 0; index < charIds.length; index += 1) {
        if (isCharacterAt(charIds[index], x, y)) {
          return true;
        }
      }
      return false;
    };

    // console.log(chars);

    for (let index = 0; index < chars.length; index += 1) {
      const char = chars[index];
      // console.log(`\tnext: [${index}] => ${char}`);
      if (char) {
        let position;
        do {
          position = this.positions[offset];
          offset += 1;
          if (offset >= 4) {
            return this.center;
          }
        } while (isACharAt(position.x, position.y));

        if (char.characterId === charId) {
          return this.positions[offset];
        }
        if (char.coordinates === this.coordinates) {
          offset += 1;
        }
      }
    }

    // console.log(`returning center point for ${charId}. (End search)`);
    return this.center;
  }

  inside(charId) {
    if (this.chunk.map.myCharacter.charId === charId) {
      return this.chunk.map.myCharacter.coordinates === this.coordinates;
    }
    const char = this.chunk.map.characters[charId];
    return char && char.coordinates === this.coordinates;
  }

  /**
   *
   * @param tint {number} The hex value as a number for the light. If 0x0 is passed, the light is set invisible.
   */
  setLight(tint = 0x0) {
    this.light.setTint(tint);
    this.light.visible = tint !== 0x0;
  }

  /**
   * @return {RoomSpriteSheet} Returns the next rolled sprite sheet.
   */
  nextSheet() {
    let spriteSheet;
    if (this.themePercentage === 0) {
      spriteSheet = this.map.roomSpriteSheets[RoomType.NORMAL];
    } else if (this.themePercentage === 1) {
      spriteSheet = this.spriteSheet;
    } else {
      const result = Math.random() < this.themePercentage;
      if (result) {
        spriteSheet = this.spriteSheet;
      } else {
        spriteSheet = this.map.roomSpriteSheets[RoomType.NORMAL];
      }
    }
    return spriteSheet;
  }

  /**
   * @return {undefined|RoomSprite} Returns the next rolled roof sprite.
   */
  nextRoof() {
    const collection = this.nextSheet().roofs;
    if (!collection || collection.length === 0) {
      return undefined;
    }
    return collection[getRandomNum(0, collection.length - 1)];
  }

  /**
   * @return {undefined|RoomSprite} Returns the next rolled wall sprite.
   */
  nextWall() {
    const collection = this.nextSheet().walls;
    if (!collection || collection.length === 0) {
      return undefined;
    }
    return collection[getRandomNum(0, collection.length - 1)];
  }

  /**
   * @return {undefined|RoomSprite} Returns the next rolled floor sprite.
   */
  nextFloor() {
    const collection = this.nextSheet().floors;
    if (!collection || collection.length === 0) {
      return undefined;
    }
    return collection[getRandomNum(0, collection.length - 1)];
  }

  /**
   * @return {undefined|RoomSprite} Returns the next rolled prop sprite.
   */
  nextProp() {
    const collection = this.nextSheet().props;
    if (!collection || collection.length === 0) {
      return undefined;
    }
    return collection[getRandomNum(0, collection.length - 1)];
  }

  /**
   * @param tx {number} The X coordinate. (In tiles)
   * @param ty {number} The Y coordinate. (In tiles)
   * @return {boolean} Returns true if the room's outer boundaries contains both tile coordinates.
   */
  contains(tx, ty) {
    return this.bounds.contains(tx, ty);
  }

  /**
   * @param direction The direction that the neighbor is located adjacently to the room.
   * @return {Room} Returns the neighboring room. If the room isn't loaded or doesn't exist, undefined is returned.
   */
  getNeighbor(direction) {
    const { currentFloor } = global.dungeon.cache;
    let { x, y } = this.position;
    if (direction === Direction.NORTH) {
      y -= 1;
    } else if (direction === Direction.SOUTH) {
      y += 1;
    } else if (direction === Direction.EAST) {
      x += 1;
    } else if (direction === Direction.WEST) {
      x -= 1;
    }

    const position = [x, y, currentFloor || null].filter(n => n != null).join(',');
    return this.map.rooms[position];
  }

  /**
   * @param direction The direction that the neighbor is located adjacently to the room.
   * @return {boolean} Returns true if the neighboring room is lit. If the room is not loaded or doesn't exist, false is returned.
   */
  isNeighborLit(direction) {
    const neighbor = this.getNeighbor(direction);
    return neighbor && neighbor.isLit();
  }

  /**
   * @return {boolean} Returns true if the player's character is inside the room.
   */
  isMyCharacterInRoom() {
    return global.dungeon.cache.currentRoom.coordinates === this.coordinates;
  }

  /**
   * @return {boolean} Returns true if the room is currently reachable by the player in one turn.
   */
  isReachable() {
    const { reachableRooms } = global.dungeon.cache;
    return !!reachableRooms[this.coordinates];
  }

  /**
   * @return {boolean} Returns true if the room is currently lit by being reachable, or if the main character is inside the room.
   */
  isLit() {
    return (this.isTeleporter() && this.map.isCharacterInTeleport()) || this.isReachable();
  }

  /**
   * @return {boolean} Returns true if the room is a temple room.
   */
  isTemple() {
    return this.data.kind === '3';
  }

  /**
   * @return {boolean} Returns true if the room is a teleport room.
   */
  isTeleporter() {
    return this.data.kind === '2';
  }

  /**
   * @return {boolean} Returns true if the room is a lore room.
   */
  isLore() {
    return this.data.kind === '4';
  }

  /**
   * @return {boolean} Returns true if the room is a carrier room.
   */
  isCarrier() {
    return this.data.kind === '5';
  }

  /**
   * @return {boolean} Returns true if NPC is in a room
   */
  hasNPC() {
    return !!this.data.npc;
  }

  /**
   * @return {boolean} Returns true if chest is in a room
   */
  hasChest() {
    return this.data.chest;
  }

  /**
   * @return {boolean} Returns true if monster is in a room
   */
  hasMonster() {
    return this.data.hasMonster;
  }

  hasExit(direction) {
    return this.data.allExits[direction];
  }

  hasLockedDoor(direction) {
    return this.hasExit(direction) && this.data.locks && this.data.locks[direction]
      && !global.dungeon.cache.moves.isExitVisited(this.coordinates, direction);
  }

  /**
   * @return {boolean} Returns true if the room is a corridor.
   */
  isCorridor() {
    return this.isHorizontalCorridor() || this.isVerticalCorridor();
  }

  /**
   * @return {boolean} Returns true if the room is a horizontal corridor.
   */
  isHorizontalCorridor() {
    const { corridor, allExits } = this.data;
    return corridor && !allExits.north && !allExits.south && allExits.east && allExits.west;
  }

  /**
   * @return {boolean} Returns true if the room is a vertical corridor.
   */
  isVerticalCorridor() {
    const { corridor, allExits } = this.data;
    return corridor && allExits.north && allExits.south && !allExits.east && !allExits.west;
  }

  // @override
  isDirty() {
    return this.dirty;
  }

  // @override
  setDirty(flag) {
    this.dirty = flag;
  }

  get x() {
    return this.position.x;
  }

  get y() {
    return this.position.y;
  }

  updateDoorPosition(dir, x, y) {
    let [rx, ry] = this.coordinates.split(',').map(Number);
    if (dir === Direction.NORTH) {
      ry -= 0.5;
    } else if (dir === Direction.SOUTH) {
      ry += 0.5;
    } else if (dir === Direction.EAST) {
      rx += 0.5;
    } else if (dir === Direction.WEST) {
      rx -= 0.5;
    }
    const door = this.chunk.map.doors[`${rx},${ry}`];
    if (door) {
      door.position.set(this.chunk.position.x + x * ROOM_TILE_SIZE, this.chunk.position.y + y * ROOM_TILE_SIZE);
      door.visible = true;
    }
  }
}

export default Room;
