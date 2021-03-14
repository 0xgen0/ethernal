import 'pixi.js';
import 'pixi-heaven';
import 'pixi-tilemap';
import { get } from 'svelte/store';
import { overrideFloor } from 'utils/utils';

import CulledContainer from './CulledContainer';
import { dungeon } from '../../../stores/dungeon';

import {
  ROOM_TILE_SIZE,
  ROOM_SIZE,
  CHUNK_ROOM_LENGTH,
  DEBUG_BOXES_ENABLED,
  getRandomColor,
  coordinatesInChunk,
  chunkPixelPosition,
  coordinatesDoorId,
} from './MapUtils';
import Direction from '../../utils/Direction';

const TMP_Rect = new PIXI.Rectangle();
const TMP_Point = new PIXI.Point();
const TMP_Cont = new PIXI.Container();
const ClearSprite = new PIXI.Sprite(PIXI.Texture.WHITE);

/**
 * TODO: (Passive Task) Migrate `tilemapFog` to global tilemap to pass to Room. -Josh
 * TODO: (Passive Task) Write shader for `tilemapFog` to multiply blendMode when rendered. -Josh
 */
class MapChunk extends CulledContainer {
  /**
   * @param map {MapRenderer}
   * @param cx {number}
   * @param cy {number}
   * @param initialize {boolean} whenever or not initialize content on construction
   *
   * @constructor
   */
  constructor(map, cx, cy, initialize = true) {
    super();

    this.childrenCulled = false;

    this.culled = false;
    this.id = `${cx},${cy}`;
    if (DEBUG_BOXES_ENABLED) {
      this.color = getRandomColor();
    }
    this.cx = cx;
    this.cy = cy;
    this.map = map;
    this.position.set(...chunkPixelPosition(cx, cy));
    this.zOrder = cx + cy;

    this.rooms = [];
    this.roomCoords = new Set();

    const x2 = CHUNK_ROOM_LENGTH * ROOM_SIZE * ROOM_TILE_SIZE;
    const y2 = CHUNK_ROOM_LENGTH * ROOM_SIZE * ROOM_TILE_SIZE; // Add tile for walls on edge of chunk.

    // dimensions
    this.dims = new PIXI.Rectangle(this.x, this.y, x2, y2 + ROOM_TILE_SIZE);

    const length = 64 * ROOM_SIZE;

    if (DEBUG_BOXES_ENABLED) {
      // DEBUG CODE
      this.border = new PIXI.Graphics();
      this.border.lineStyle(1, 0xff0000);
      this.border.moveTo(0, 0);
      this.border.lineTo(length, 0);
      this.border.lineTo(length, length);
      this.border.lineTo(0, length);
      this.border.lineTo(0, 0);
      this.border.closePath();
      this.border.parentGroup = map.debugGroup;
      this.addChild(this.border);
    }

    if (initialize) {
      this.initContent();
    }

    /**
     * ivan : right now, this works as extra check whether we have to update fog or room tiles
     */
    this.showing = true;
    this.showingLock = false;

    this.dirty = true;
  }

  initContent() {
    this.tilemapLower = new PIXI.tilemap.CompositeRectTileLayer(1, map.getBitmaps());
    this.tilemapUpper = new PIXI.tilemap.CompositeRectTileLayer(2, map.getBitmaps());

    this.tileLowerContainer = new PIXI.Container();
    this.tileLowerContainer.parentGroup = this.map.lowerGroup;
    this.tileLowerContainer.addChild(this.tilemapLower);
    this.tileUpperContainer = new PIXI.Container();
    this.tileUpperContainer.parentGroup = this.map.upperGroup;
    this.tileUpperContainer.addChild(this.tilemapUpper);

    // TODO : @ivan might also switch layerableChildren to false if those containers dont have other
    // parentGroup's inside.
    this.contentLower = new PIXI.Container();
    this.contentLower.parentGroup = this.map.lowerGroup;
    this.contentLower.position.set(-this.position.x, -this.position.y);
    this.contentLower.sortableChildren = true;

    this.contentUpper = new PIXI.Container();
    this.contentUpper.parentGroup = this.map.upperGroup;
    this.contentUpper.position.set(-this.position.x, -this.position.y);
    this.contentUpper.sortableChildren = true;

    // Use only one fog tilemap as it is used to render to textures, not stored per chunk.
    this.tilemapFog = new PIXI.tilemap.CompositeRectTileLayer(10, [PIXI.utils.TextureCache.fog_gradient]);
    this.tilemapFog.parentGroup = map.fogGroup;
    this.addChild(this.tilemapFog);

    this.debugContainer = new PIXI.Container();
    this.addChild(this.tileLowerContainer);
    this.addChild(this.contentLower);
    this.addChild(this.tileUpperContainer);
    this.addChild(this.contentUpper);
    this.addChild(this.debugContainer);
  }

  createContent() {
    this.initContent();
    const { rooms } = global.dungeon.cache;
    coordinatesInChunk(this.id).forEach(coordinates => {
      const newest = rooms[overrideFloor(coordinates, this.map.floor)];
      if (newest) {
        this.map.handleRoomUpdate({ newest }, false);
      }
    });
  }

  removeContent() {
    const { roomCoords } = this;
    this.roomCoords = new Set();

    this.rooms.forEach(room => {
      const { allExits, onlineCharacters, coordinates } = room.data;
      onlineCharacters.forEach(character => {
        if (character !== global.dungeon.cache.characterId) {
          const characterObject = this.map.characters[character];
          if (characterObject) {
            characterObject.destroy();
            delete this.map.characters[character];
          }
        }
      });
      Object.values(Direction).forEach(direction => {
        if (allExits[direction]) {
          const doorId = coordinatesDoorId(coordinates, direction);
          const door = this.map.doors[doorId];
          if (door) {
            door.destroy();
            delete this.map.doors[doorId];
          }
        }
      });
      this.map.removeRoom(room);
    });
    this.rooms = [];

    Array.from(roomCoords).forEach(coords => {
      if (this.map.droppedLoot[coords]) {
        this.map.droppedLoot[coords].forEach(loot => {
          this.map.removeDroppedLoot(coords);
          loot.destroy();
        });
        this.map.droppedLoot[coords] = [];
      }
      if (this.map.tombs[coords]) {
        this.map.tombs[coords].forEach(tomb => {
          this.map.removeTomb(coords);
          tomb.destroy();
        });
        this.map.tombs[coords] = [];
      }
      if (this.map.monsters[coords]) {
        this.map.monsters[coords].destroy();
        this.map.removeMonster(coords);
        delete this.map.monsters[coords];
      }
      if (this.map.npcs[coords]) {
        this.map.npcs[coords].destroy();
        this.map.removeNPC(coords);
        delete this.map.npcs[coords];
      }
      if (this.map.chests[coords]) {
        this.map.chests[coords].destroy();
        this.map.removeChest(coords);
        delete this.map.chests[coords];
      }
    });
    if (this.tilemapFog) {
      this.tilemapFog.clear();
    }
    this.children.forEach(child => child.destroy());
  }

  hide() {
    if (!this.showing) {
      return;
    }

    this.removeContent();
    this.showing = false;
  }

  show() {
    if (this.showing || this.showingLock) {
      return;
    }
    this.showingLock = true;
    this.culled = false;

    setTimeout(() => {
      if (this.culled === false) {
        this.showing = true;
        this.createContent();
        this.onUpdate();
        this.renderFog();
        this.showingLock = false;
      }
    }, this.map.showDelay);
  }

  onUpdate() {
    if (!this.showing || !this.isDirty()) {
      return;
    }
    if (this.culled) {
      this.showing = false;
      return;
    }
    this.drawRooms();
    this.setDirty(false);
  }

  drawRooms() {
    // TODO: Make sure that room shapes work properly with calculating max and min tile offsets outside of the
    //  standard chunk range. These variables will be placeholer for now. -Josh

    this.tilemapLower.clear();
    this.tilemapUpper.clear();

    // LOWER TILES
    this.rooms.forEach(room => {
      room.drawExterior(this, 'lower');
      room.drawInterior(this, 'lower');
    });

    // UPPER TILES
    this.rooms.forEach(room => {
      room.drawExterior(this, 'upper');
      room.drawInterior(this, 'upper');
    });

    this.tilemapLower.width = this.dims.width;
    this.tilemapLower.height = this.dims.height;
    this.tilemapUpper.width = this.dims.width;
    this.tilemapUpper.height = this.dims.height;
  }

  renderFog() {
    if (this.tilemapFog) {
      // Clear the tilemap last to not store unused tile data between fog draws.
      this.tilemapFog.clear();
      // Draw each room's fog pass.
      this.rooms.forEach(room => {
        if (room.isLit()) {
          room.drawFog(this);
        }
      });
    }
  }

  /**
   * @param room {Room}
   */
  addRoom(room) {
    if (!this.culled && !this.roomCoords.has(room.coordinates)) {
      this.rooms.push(room);
      this.roomCoords.add(room.coordinates);

      // Debug room boxes.
      if (this.debugContainer) {
        if (room.box) {
          this.debugContainer.addChild(room.box);
        }
        if (room.boxInner) {
          this.debugContainer.addChild(room.boxInner);
        }
      }

      const zIndex = room.position.x + room.position.y * 10000;
      room.contentLower.zIndex = zIndex;
      this.contentLower.addChild(room.contentLower);
      room.contentUpper.zIndex = zIndex;
      this.contentUpper.addChild(room.contentUpper);

      // Let the chunk know that we need to redraw.
      this.setDirty(true);
    } else {
      console.log(`contains room ${room.coordinates}`);
    }
  }

  isDirty() {
    return this.dirty;
  }

  setDirty(flag) {
    this.dirty = flag;
  }

  isOutsideViewport() {
    if (!this.cullProvider || this.isLayer) {
      return false;
    }

    const { viewport } = this.cullProvider;
    const p = TMP_Point.copyFrom(this.dims);

    this.parent.toGlobal(p, p);

    if (p.x > viewport.right) {
      return true;
    }

    if (p.y > viewport.bottom) {
      return true;
    }

    p.x = this.dims.right;
    p.y = this.dims.bottom;

    this.parent.toGlobal(p, p);

    if (p.y < viewport.top) {
      return true;
    }

    if (p.x < viewport.left) {
      return true;
    }

    return false;
  }

  /**
   * @override
   *
   */
  _doCull() {
    const lastCulled = this.culled;
    this.culled = this.isOutsideViewport();

    if (lastCulled !== this.culled) {
      if (this.culled) {
        this.hide();
      }
    }

    return this.culled;
  }
}

export default MapChunk;
