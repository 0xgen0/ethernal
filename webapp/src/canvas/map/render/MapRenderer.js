import { get } from 'svelte/store';
import { subscribe } from 'svelte/internal';
import 'pixi.js';
import { ease } from 'pixi-ease';

import { actionsText, teleportText } from 'data/text';
import {
  characterBalances,
  characterLevel,
  characterHP,
  characterMaxHP,
  characterQuests,
  characterFeatures,
  reachableRooms,
  currentQuest,
} from 'lib/cache';
import { aroundCoordinates, overrideFloor, formatCoordinates, parseCoordinates } from 'utils/utils';
import { mapModal, menuOverlay } from 'stores/screen';

import NameTag from 'canvas/common/NameTag';
import log from 'utils/log';
import RoomType from '../RoomType';
import Camera, { MUTATION_TYPE } from './Camera';
import MapChunk from './MapChunk';
import Room from './room/Room';
import RoomSpriteSheet from './room/RoomSpriteSheet';

import Character from './Character';
import Chest from './Chest';
import DroppedLoot from './DroppedLoot';
import Monster from './Monster';
import NPC from './NPC';
import Tomb from './Tomb';
import {
  CHUNK_ROOM_LENGTH,
  ROOM_SIZE,
  ROOM_TILE_SIZE,
  getOppositeDirection,
  toChunkCoordinates,
  MAX_CHUNKS,
  toChunkLocalCoordinates,
  coordinatesChunkId,
  coordinatesInChunk,
  coordinatesDoorId,
  _fogAtlasFrame,
  roomPixelPosition,
  toCoordinatePair,
} from './MapUtils';
import Direction from '../../utils/Direction';
import CharacterPath from './Path';
import RoomExit from './room/RoomExit';
import RadialButtonMenu from './util/RadialButtonMenu';

// TODO better way to share code
import { coordinatesToLocation } from '../../../utils/utils';
import { CameraComposer, patchTreeSearch } from './CameraComposer';
import MagicSprite from '../../utils/MagicSprite';

let clickTime;
let moving = false;

const TMP_Rect = new PIXI.Rectangle();

window.globalCounter = 0;

// PIXI.Container.prototype.updateTransform = function() {
//   window.globalCounter++;
//   this.containerUpdateTransform();
// }

/**
 * TODO: Path animation for character on client-side, ignore post transaction unless positions change.
 * TODO: Remove chunks when all rooms are removed.
 * TODO: Handle room updates as dirty flags to render updates to map chunks.
 * TODO: Document.
 */
class MapRenderer {
  /**
   * @constructor
   */
  constructor(viewport, app, ui) {
    this.viewport = viewport;
    this.app = app;
    this.ui = ui;
    this.chunks = new Map();
    this.activeChunks = [];
    this.rooms = {};
    this.floor = 0;
    this.previousReachable = [];

    this.root = new PIXI.Container();

    this.minimalCullArea = new PIXI.Rectangle();
    this.cullProvider = {
      viewport: new PIXI.Rectangle(),
      cullId: 0,
    };

    this.container = new PIXI.Container();
    this.container.interactive = true;
    this.container.containsPoint = () => true;
    // this.container.interactiveChildren = false;

    this.container.sortableChildren = false;
    this.container.sortDirty = false;

    this.chunkContainer = new PIXI.Container();

    this.fullscreenFog = new MagicSprite(PIXI.Texture.WHITE);

    this.camera = new Camera(this);
    this.cameraComposer = new CameraComposer(this.root, this.camera, true);
    this.camera.composer = this.cameraComposer;
    this.fullscreenFog.camera = this.cameraComposer;
    this.showDelay = 0;

    patchTreeSearch(app.renderer.plugins.interaction);

    app.ticker.add(() => {
      window.globalCounter = 0;
    });

    this.characters = {};
    this.monsters = {};
    this.npcs = {};
    this.chests = {};
    this.tombs = {};
    this.droppedLoot = {};
    this.doors = [];

    this.dirty = true;

    // whether map is stopped. completely.
    this.stopped = false;
  }

  stopMap() {
    if (this.stopped) {
      return;
    }
    this.stopped = true;

    this.app.ticker.stop();
    this.app.renderer.view.style.visibility = 'hidden';
  }

  startMap() {
    if (!this.stopped) {
      return;
    }
    this.stopped = false;
    this.app.ticker.start();
    this.app.renderer.view.style.visibility = 'inherit';
  }

  init() {
    const { root } = this;

    this.app.stage.addChild(
      // required for transfrom update
      this.camera,
      // virtual camera
      this.cameraComposer,
    );

    this.camera.init();

    PIXI.display.Group.compareZIndex = function (a, b) {
      if (a.zIndex !== b.zIndex) {
        return a.zIndex - b.zIndex;
      }
      if (a.zOrder > b.zOrder) {
        return -1;
      }
      if (a.zOrder < b.zOrder) {
        return 1;
      }
      return a.updateOrder - b.updateOrder;
    };

    const sort = element => {
      element.zOrder = element.position.x + element.position.y;
    };

    this.charGroup = new PIXI.display.Group(7, sort);
    this.fogGroup = new PIXI.display.Group(6, sort);
    this.doorGroup = new PIXI.display.Group(5, sort);
    this.upperGroup = new PIXI.display.Group(4, false);
    this.myCharGroup = new PIXI.display.Group(8, sort);
    this.mobGroup = new PIXI.display.Group(2, sort);
    this.lowerGroup = new PIXI.display.Group(1, false);
    this.backGroup = new PIXI.display.Group(0, sort);
    this.center = new PIXI.Point(this.viewport.worldWidth / 2, this.viewport.worldHeight / 2);
    this.debugGroup = new PIXI.display.Group(10, sort);
    this.uiGroup = new PIXI.display.Group(12, false);
    this.arrowGroup = new PIXI.display.Group(11, false);
    this.pathGroup = new PIXI.display.Group(4, false);
    this.radialMenuGroup = new PIXI.display.Group(13, false);

    this.back = new PIXI.Graphics();
    this.back.zOrder = 0;
    this.back.zIndex = 0;
    this.back.parentGroup = this.backGroup;
    this.drawBack();

    const backLayer = new PIXI.display.Layer(this.backGroup);
    const exteriorLayer = new PIXI.display.Layer(this.upperGroup);
    const myCharLayer = new PIXI.display.Layer(this.myCharGroup);
    const charLayer = new PIXI.display.Layer(this.charGroup);
    const mobLayer = new PIXI.display.Layer(this.mobGroup);
    const interiorLayer = new PIXI.display.Layer(this.lowerGroup);
    const doorLayer = new PIXI.display.Layer(this.doorGroup);
    const uiLayer = new PIXI.display.Layer(this.uiGroup);
    const arrowLayer = new PIXI.display.Layer(this.arrowGroup);
    const pathLayer = new PIXI.display.Layer(this.pathGroup);
    const radialMenuLayer = new PIXI.display.Layer(this.radialMenuGroup);
    const debugLayer = new PIXI.display.Layer(this.debugGroup);

    const fogLayer = new PIXI.display.Layer(this.fogGroup);
    fogLayer.clearColor = [97 / 255, 97 / 255, 97 / 255, 1.0];
    fogLayer.useRenderTexture = true;
    this.fullscreenFog.texture = fogLayer.getRenderTexture();
    this.fullscreenFog.blendMode = PIXI.BLEND_MODES.MULTIPLY;

    root.addChild(backLayer);
    root.addChild(this.back);

    this.container.addChild(interiorLayer);
    this.container.addChild(exteriorLayer);

    this.containerTop = new PIXI.Container();

    this.containerTop.sortableChildren = true;
    this.containerTop.sortDirty = true;
    this.containerTop.interactive = true;
    this.containerTop.interactiveChildren = true;

    this.containerTop.addChild(myCharLayer);
    this.containerTop.addChild(charLayer);
    this.containerTop.addChild(mobLayer);
    this.containerTop.addChild(doorLayer);
    this.containerTop.addChild(debugLayer);
    this.containerTop.addChild(uiLayer);
    this.containerTop.addChild(arrowLayer);
    this.containerTop.addChild(pathLayer);
    this.containerTop.addChild(radialMenuLayer);

    const tCache = PIXI.utils.TextureCache;

    this.bitmaps = [];
    this.bitmapMap = {};

    // alias for different versions
    const room_normal = tCache.room_normal2;
    const room_teleport = tCache.room_teleport2;

    this.addTextureToMap(tCache.fog_gradient, 'fog');
    _fogAtlasFrame.x = tCache.fog_gradient.frame.x;
    _fogAtlasFrame.y = tCache.fog_gradient.frame.y;

    this.addTextureToMap(tCache.room_boss, RoomType.BOSS);
    this.addTextureToMap(tCache.room_electric, RoomType.ELECTRIC);
    this.addTextureToMap(tCache.room_fire, RoomType.FIRE);
    this.addTextureToMap(tCache.room_lore, RoomType.LORE);
    this.addTextureToMap(room_normal, RoomType.NORMAL);
    this.addTextureToMap(room_teleport, RoomType.TELEPORT);
    this.addTextureToMap(tCache.room_water, RoomType.WATER);
    this.addTextureToMap(tCache.room_wind, RoomType.WIND);
    this.addTextureToMap(tCache.room_wood, RoomType.WOOD);
    this.addTextureToMap(tCache.room_temple, RoomType.TEMPLE);
    this.addTextureToMap(tCache.room_lift, RoomType.LIFT);

    this.roomSpriteSheets = {};
    this.roomSpriteSheets[RoomType.BOSS] = new RoomSpriteSheet(tCache.room_boss, 6, 3, 3, 3, 0);
    this.roomSpriteSheets[RoomType.ELECTRIC] = new RoomSpriteSheet(tCache.room_electric, 4, 3, 4, 0, 0);
    this.roomSpriteSheets[RoomType.FIRE] = new RoomSpriteSheet(tCache.room_fire, 3, 4, 4, 1, 0);
    this.roomSpriteSheets[RoomType.LORE] = new RoomSpriteSheet(tCache.room_lore, 8, 6, 3, 2, 0);
    this.roomSpriteSheets[RoomType.NORMAL] = new RoomSpriteSheet(room_normal, 5, 5, 2, 2, 0);
    this.roomSpriteSheets[RoomType.WATER] = new RoomSpriteSheet(tCache.room_water, 4, 3, 3, 2, 0);
    this.roomSpriteSheets[RoomType.WIND] = new RoomSpriteSheet(tCache.room_wind, 3, 3, 3, 2, 0);
    this.roomSpriteSheets[RoomType.WOOD] = new RoomSpriteSheet(tCache.room_wood, 3, 4, 2, 3, 0);
    this.roomSpriteSheets[RoomType.TELEPORT] = new RoomSpriteSheet(room_teleport, 4, 4, 2, 1, 0);
    this.roomSpriteSheets[RoomType.TEMPLE] = new RoomSpriteSheet(tCache.room_temple, 5, 5, 0, 0, 0);
    this.roomSpriteSheets[RoomType.LIFT] = new RoomSpriteSheet(tCache.room_lift, 6, 6, 3, 2, 0);

    this.roomSpriteSheets[RoomType.BOSS].index = this.bitmapMap[RoomType.BOSS];
    this.roomSpriteSheets[RoomType.ELECTRIC].index = this.bitmapMap[RoomType.ELECTRIC];
    this.roomSpriteSheets[RoomType.FIRE].index = this.bitmapMap[RoomType.FIRE];
    this.roomSpriteSheets[RoomType.LORE].index = this.bitmapMap[RoomType.LORE];
    this.roomSpriteSheets[RoomType.NORMAL].index = this.bitmapMap[RoomType.NORMAL];
    this.roomSpriteSheets[RoomType.TELEPORT].index = this.bitmapMap[RoomType.TELEPORT];
    this.roomSpriteSheets[RoomType.WATER].index = this.bitmapMap[RoomType.WATER];
    this.roomSpriteSheets[RoomType.WIND].index = this.bitmapMap[RoomType.WIND];
    this.roomSpriteSheets[RoomType.WOOD].index = this.bitmapMap[RoomType.WOOD];
    this.roomSpriteSheets[RoomType.TEMPLE].index = this.bitmapMap[RoomType.TEMPLE];
    this.roomSpriteSheets[RoomType.LIFT].index = this.bitmapMap[RoomType.LIFT];

    this.arrowTop = new PIXI.Texture(tCache.arrows.baseTexture, new PIXI.Rectangle(0, 0, 65, 64), null, null, 0);
    this.arrowBottom = new PIXI.Texture(tCache.arrows.baseTexture, new PIXI.Rectangle(0, 0, 65, 64), null, null, 8);
    this.arrowLeft = new PIXI.Texture(tCache.arrows.baseTexture, new PIXI.Rectangle(65, 0, 65, 64), null, null, 0);
    this.arrowRight = new PIXI.Texture(tCache.arrows.baseTexture, new PIXI.Rectangle(65, 0, 65, 64), null, null, 12);

    const pathDim = new PIXI.Rectangle(0, 0, 18, 18);
    this.pathTop = new PIXI.Texture(tCache.path.baseTexture, pathDim, null, null, 6);
    this.pathBottom = new PIXI.Texture(tCache.path.baseTexture, pathDim, null, null, 2);
    this.pathLeft = new PIXI.Texture(tCache.path.baseTexture, pathDim, null, null, 0);
    this.pathRight = new PIXI.Texture(tCache.path.baseTexture, pathDim, null, null, 4);

    this.teleporterCorners = [];

    const tt = tCache.teleporter_corners;

    for (let index = 0; index < 8; index += 1) {
      this.teleporterCorners.push(
        new PIXI.Texture(tt.baseTexture, new PIXI.Rectangle(tt.frame.x + index * 9, tt.frame.y, 9, 9)),
      );
    }

    const checkForTombClick = (room, point) => {
      const { coordinates } = room;
      if (!this.isMyCharacterInRoom(coordinates)) {
        return false;
      }
      if (room.clickedTomb(point)) {
        mapModal.open('scavenge', { coordinates });
        return true;
      }
      return false;
    };

    this.container.on('roomClicked', async (room, point) => {
      if (moving) return;
      const timeCurrent = new Date().getTime();
      if (!clickTime || timeCurrent - clickTime > 50) {
        clickTime = timeCurrent;
      } else {
        return;
      }

      const { currentRoom } = global.dungeon.cache;
      const from = currentRoom.coordinates;
      const to = room.coordinates;

      // Make sure the player didn't click on a tomb before moving.
      if (checkForTombClick(room, point)) {
        return;
      }

      // Toggle actions and stop if in current room or if clicking on teleporter room
      if (from === to || (room.isTeleporter() && !room.isReachable())) {
        await this.displayRoomActions(room.coordinates);
        this.displayRoomCoordinates(room.coordinates);
        return;
      }

      if (room.isReachable()) {
        this._move(to);
        return;
      }

      console.log(`room '${room.coordinates}' is NOT reachable.`);
      this.displayRoomCoordinates(room.coordinates);
    });
    // this.containerTop.parentGroup = this.debugGroup;

    root.addChild(this.container);
    this.container.addChild(fogLayer);
    this.container.addChild(this.fullscreenFog);
    root.addChild(this.containerTop);

    this.container.addChild(this.chunkContainer);

    this.charMenu = new RadialButtonMenu(52);
    this.charMenu.zOrder = 99;
    this.charMenu.zIndex = 99;
    this.charMenu.position.set(this.app.screen.width / 2, this.app.screen.height / 2);

    /**
     *
     * @param icon {string} The texture id in PIXI.utils.TextureCache.
     *
     * @return {PIXI.Container} Returns the result button.
     */
    const createButton = icon => {
      const button = new PIXI.Container();
      const buttonBack = new PIXI.Sprite(tCache.icon_box_02);
      const buttonIcon = new PIXI.Sprite(tCache[icon]);
      buttonBack.tint = 0x777777; // Use this to simply disable the button for now. Integrate this as API later on. -Josh
      buttonIcon.tint = 0x0;
      buttonIcon.scale.set(1.1625, 1.1625);
      buttonBack.anchor.set(0.5, 0.5);
      buttonIcon.anchor.set(0.5, 0.5);
      buttonIcon.interactive = true;
      buttonBack.interactive = true;
      button.interactive = true;
      button.interactiveChildren = true;
      button.addChild(buttonBack, buttonIcon);
      return button;
    };

    this.charMenu.addOption(createButton('help_icon_16'), { fill: { color: 0xffffff, alpha: 1 } });
    this.charMenu.addOption(createButton('chat_icon_16'), { fill: { color: 0xffffff, alpha: 1 } });
    this.charMenu.addOption(createButton('mail_icon_16'), { fill: { color: 0xffffff, alpha: 1 } });
    this.charMenu.addOption(createButton('trade_icon_16'), { fill: { color: 0xffffff, alpha: 1 } });
    this.charMenu.addOption(createButton('party_icon_16'), { fill: { color: 0xffffff, alpha: 1 } });
    this.charMenu.addOption(createButton('guild_icon_16'), { fill: { color: 0xffffff, alpha: 1 } });
    this.charMenu.parentGroup = this.radialMenuGroup;

    this.arrowContainer = new PIXI.Container();
    this.arrowContainer.interactive = true;
    this.arrowContainer.interactiveChildren = true;

    this.container.addChild(this.arrowContainer);
    this.container.addChild(this.charMenu);

    subscribe(reachableRooms, reachable => {
      Object.keys(reachable).forEach(coordinates => {
        this.createChunk(coordinatesChunkId(coordinates));
      });
      this.updateAllFog();
      this.previousReachable = Object.keys(reachable);
    });
  }

  onUpdate() {
    // offset
    this.camera.offset.set(this.app.screen.width >>> 1, this.app.screen.height >>> 1);
    this.camera.onUpdate();

    if (!(this.camera.isDirty() || this.dirty)) {
      return;
    }

    for (const key in this.characters) {
      const next = this.characters[key];
      if (next && next.nameTag) {
        next.nameTag.scale.set(0.2 + this.camera.scale.x, 0.2 + this.camera.scale.y);
      }
    }

    this.doCull();

    const coordinates = this.activeChunks.reduce((set, { id }) => {
      aroundCoordinates(id, 1)
        .map(coordinatesInChunk)
        .flat()
        .map(coords => overrideFloor(coords, this.floor))
        .forEach(coord => set.add(coord));
      return set;
    }, new Set());
    global.dungeon.cache.subscribeRooms(coordinates);

    for (const key in this.activeChunks) {
      const chunk = this.activeChunks[key];
      chunk.onUpdate();
    }

    this.dirty = false;
  }

  onPostUpdate() {
    this.camera.onPostUpdate();
  }

  doCull(force = false) {
    if (!this.chunks.size) {
      return;
    }

    const v = this.cullProvider.viewport;
    const min = this.minimalCullArea;

    TMP_Rect.copyFrom(this.app.screen);
    /*
        TMP_Rect.x += 200;
        TMP_Rect.y += 200;
        TMP_Rect.width -= 400;
        TMP_Rect.height -= 400;
    */
    this.cameraComposer.listen.updateTransform();
    this.cameraComposer.transformRect(TMP_Rect, v, true);

    const process =
      force ||
      this.camera.lastMutation === MUTATION_TYPE.SCALE ||
      !v.width ||
      !v.height ||
      v.x < min.x ||
      v.y < min.y ||
      v.right > min.right ||
      v.bottom > min.bottom;

    if (!process) {
      return;
    }

    let first = true;

    const childs = this.chunkContainer.children;
    childs.length = 0;

    for (const [_, chunk] of this.chunks) {
      chunk.cullProvider = this.cullProvider;
      chunk._doCull();

      // ivan: cull place, do not modify
      if (!chunk.culled) {
        chunk.show();
        childs.push(chunk);

        if (first) {
          min.copyFrom(chunk.dims);
          first = false;
        } else {
          min.enlarge(chunk.dims);
        }
      }
    }

    this.activeChunks = childs;
    log.debug(
      'visible chunk',
      childs.map(e => e.id),
    );
  }

  updateAllFog() {
    this.hideFurthestChunks();
    if (this.activeChunks.length) {
      const reachableCoordinates = Object.keys(get(reachableRooms));
      const updateChunksIds = Array.from(new Set([...reachableCoordinates, ...this.previousReachable])).reduce(
        (s, coordinates) => s.add(coordinatesChunkId(coordinates)),
        new Set(),
      );
      this.activeChunks.forEach(({ id }) => updateChunksIds.add(id));
      Array.from(updateChunksIds).forEach(id => this.createChunk(id).renderFog());
      this.placeArrows();
    }
  }

  isRoomActive(coordinates) {
    if (coordinates) {
      const chunkId = coordinatesChunkId(coordinates);
      const chunk = this.chunks.get(chunkId);
      return chunk && !chunk.culled;
    }
  }

  // @TODO: separate to init and update function, update can be possibly split per each event - no need to compare then, we should know what happened sooner
  handleRoomUpdate({ old, newest }, animate = true) {
    if (old) {
      this.updateRoom(newest);
    } else {
      this.addRoom(newest);
    }

    if (!old && newest.onlineCharacters.length) {
      newest.onlineCharacters.forEach(character => {
        if (character === cache.characterId) {
          this.addCharacter(cache.characterId, newest.coordinates, cache.characterStatus, 'my');
        } else {
          const info = cache.onlineCharacters[character];
          if (info) {
            this.addCharacter(character, newest.coordinates, info.status.status, 'other', animate);
          }
        }
      });
    }

    if (old && old.hasMonster && !newest.hasMonster) {
      this.removeMonster(newest.coordinates);
    } else if ((!old || !old.hasMonster) && newest.hasMonster) {
      const {
        combat: { monster },
      } = newest;
      this.addMonster(newest.coordinates, monster, animate);
    }

    if (old && !!old.chest && !newest.chest) {
      this.removeChest(newest.coordinates);
    } else if (newest.chest) {
      this.addChest(newest.coordinates, newest.chest, animate);
    }

    if (old && !!old.npc && !newest.npc) {
      this.removeNPC(newest.coordinates);
    } else if ((!old || !old.npc) && !!newest.npc) {
      this.addNPC(newest.coordinates, animate);
    }

    const { gear: oldGear, corpses: oldCorpses, balance: oldBalance } = (old && old.scavenge) || {};
    const { gear: newGear, corpses: newCorpses, balance: newBalance } = (newest && newest.scavenge) || {};

    const hadGear = oldGear && oldGear.length > 0;
    const hadCorpses = oldCorpses && oldCorpses.length;
    const hadBalance =
      Object.values(oldBalance || {})
        .flat()
        .filter(Boolean).length > 0;
    const willHaveGear = newGear && newGear.length > 0;
    const willHaveCorpses = newCorpses && newCorpses.length > 0;
    const willHaveBalance =
      Object.values(newBalance || {})
        .flat()
        .filter(Boolean).length > 0;

    if (!hadGear && !hadBalance && (willHaveGear || willHaveBalance)) {
      this.addDroppedLoot(newest.coordinates, animate);
    } else if ((hadGear || hadBalance) && !willHaveGear && !willHaveBalance) {
      this.removeDroppedLoot(newest.coordinates);
    }

    if (!hadCorpses && willHaveCorpses) {
      this.addTomb(newest.coordinates, animate);
    } else if (hadCorpses && !willHaveCorpses) {
      this.removeTomb(newest.coordinates);
    }
  }

  addRoom(roomData) {
    if (!roomData) {
      console.warn('Room data is undef!');
      return;
    }
    const { coordinates } = roomData;
    const { z } = parseCoordinates(coordinates);
    if (this.floor !== z) {
      return;
    }
    if (!this.rooms[coordinates]) {
      const [rx, ry] = coordinates.split(',').map(Number);
      const chunkCoordinates = toChunkCoordinates(rx, ry);
      const chunkId = `${chunkCoordinates.x},${chunkCoordinates.y}`;

      let chunk = this.chunks.get(chunkId);
      if (!chunk) {
        chunk = this.createChunk(chunkId);
      }

      const room = new Room(chunk, roomData);
      chunk.addRoom(room);
      this.rooms[coordinates] = room;

      const createExit = (_room, doorCoordinates, direction, locked) => {
        if (!this.doors[doorCoordinates]) {
          const door = new RoomExit(_room, doorCoordinates, direction, locked);
          door.parentGroup = this.doorGroup;
          this.doors[doorCoordinates] = door;
          chunk.contentUpper.addChild(door);
        }
      };

      if (room.data.status !== 'undiscovered') {
        if (room.hasExit(Direction.NORTH)) {
          createExit(room, `${rx},${ry - 0.5}`, Direction.NORTH, room.hasLockedDoor(Direction.NORTH));
        }
        if (room.hasExit(Direction.SOUTH)) {
          createExit(room, `${rx},${ry + 0.5}`, Direction.SOUTH, room.hasLockedDoor(Direction.SOUTH));
        }
        if (room.hasExit(Direction.EAST)) {
          createExit(room, `${rx + 0.5},${ry}`, Direction.EAST, room.hasLockedDoor(Direction.EAST));
        }
        if (room.hasExit(Direction.WEST)) {
          createExit(room, `${rx - 0.5},${ry}`, Direction.WEST, room.hasLockedDoor(Direction.WEST));
        }
      }
    } else {
      log.debug(`room already present at ${coordinates}, remove it first.`);
    }

    this.dirty = true;
  }

  removeRoom(roomData) {
    const { coordinates } = roomData;
    const room = this.rooms[coordinates];
    if (!room) {
      log.info(`no room at ${coordinates}`);
      return;
    }
    this.removeObject(room);
    delete this.rooms[coordinates];
  }

  updateRoom(roomData) {
    let room = this.rooms[roomData.coordinates];
    if (room) {
      room.setData(roomData);
    } else {
      this.addRoom(roomData, false);
      room = this.rooms[roomData.coordinates];
    }

    // Only update the chunk of the room updated.
    if (room) {
      room.chunk.setDirty(true);
    }

    this.dirty = true;
  }

  addCharacter(charId, to, status, type = 'other', animate = true) {
    if (status === 'just died' || status === 'dead') {
      return;
    }

    let character = this.characters[charId];
    if (character) {
      // eslint-disable-next-line no-console
      log.debug(`character on map with id: ${charId} already there, moving it instead...`);
      this.moveCharacter(charId, null, to);
      return;
    }
    const { cache } = global.dungeon;
    const { stats } = cache.onlineCharacters[charId] || {};
    if (!stats) {
      // Very rarely I'll get the character without a stats object to grab the characterClass. -Josh
      log.debug(
        `character on map with id: ${charId} does not have stats (And a char class). Not creating PIXI object..`,
      );
      return;
    }
    const { characterClass } = stats;
    character = this.addObjectAtCoords(new Character(type, this.container, to, this.ui, charId, characterClass), to, {
      noCull: true,
      animate,
      x: 6.5,
      y: 4.5,
      parentGroup: this.charGroup,
    });

    character.interactive = character.buttonMode = true;
    character.on('pointerdown', event => {
      event.stopPropagation();
      this.camera.setPosition(character.position.x, character.position.y, 1000);
    });

    if (type === 'my') {
      this.myCharacter = character;
      this.myCharacter.parentGroup = this.myCharGroup;

      setTimeout(() => {
        this.updateAllFog();
      }, 200);

      // The event hooks to enable and disable the radial menu for my charactr.
      this.myCharacter.on('pointerdown', () => {
        this.charMenu.position.set(this.myCharacter.position.x, this.myCharacter.position.y);
        if (!this.charMenu.isOpen()) {
          this.charMenu.open();
        } else {
          this.charMenu.close();
        }
      });

      this.camera.setPosition(this.myCharacter.position.x, this.myCharacter.position.y);
    } else {
      character.parentGroup = this.charGroup;
    }
    this.characters[charId] = character;

    if (this.myCharacter === character) {
      this.rooms[to].updateTeleporter();
      this.displayRoomActions(this.rooms[to].coordinates);
    }

    this.dirty = true;
  }

  createPath(character, from, to, path, unlockDoors = false) {
    if (!path) {
      let room = get(reachableRooms)[to];
      if (room && room.parent) {
        path = room.parent.path;
      } else {
        room = this.rooms[to];
        if (room) {
          const position = room.getPosition(character.charId);
          character.teleport(position.x, position.y);
        } else {
          const [rx, ry] = to.split(',').map(Number);
          const c = toChunkCoordinates(rx, ry);
          character.teleport(
            CHUNK_ROOM_LENGTH * c.x + rx * ROOM_SIZE + ROOM_SIZE / 2,
            CHUNK_ROOM_LENGTH * c.y + ry * ROOM_SIZE + ROOM_SIZE / 2,
          );
        }
        return undefined;
      }
    }

    const cPath = new CharacterPath(character, to);

    if (!from) {
      const room = this.rooms[to];
      const position = room.getPosition(character.charId);
      character.moveTo(position.x, position.y);
      return undefined;
    }

    const [fromX, fromY, fromZ] = from.split(',').map(Number);
    let currentX = fromX;
    let currentY = fromY;

    const unlockDoor = (_currentX, _currentY, dir) => {
      const doorId = coordinatesDoorId([_currentX, _currentY], dir);
      const door = this.doors[doorId];
      if (door) {
        door.unlock(() => {
          this.doors[doorId] = undefined;
          door.room.chunk.content.removeChild(door);
        });
      } else {
        console.log('door not found', _currentX, _currentY, doorId);
      }
    };

    let firstRoom = this.rooms[from];

    for (let i = 0; i < path.length; i += 1) {
      const direction = path[i];
      if (direction === Direction.NORTH) {
        currentY -= 1;
      } else if (direction === Direction.SOUTH) {
        currentY += 1;
      } else if (direction === Direction.EAST) {
        currentX += 1;
      } else if (direction === Direction.WEST) {
        currentX -= 1;
      }
      const roomPosition = [currentX, currentY, fromZ].filter(n => n != null).join(',');
      const room = this.rooms[roomPosition];

      if (unlockDoors) {
        if (firstRoom) {
          unlockDoor(firstRoom.position.x, firstRoom.position.y, direction);
          firstRoom = null;
        }
        unlockDoor(currentX, currentY, getOppositeDirection(direction));
      }

      let position;
      if (room) {
        position = room.getPosition(this.myCharacter.charId);
      } else {
        const [x, y] = to.split(',').map(Number);
        const halfRoom = ROOM_SIZE / 2;
        position = { x: ROOM_TILE_SIZE * (ROOM_SIZE * x + halfRoom), y: ROOM_TILE_SIZE * (ROOM_SIZE * y + halfRoom) };
      }
      cPath.addStep({
        x: position.x,
        y: position.y,
        direction,
        easeMode: 'easeInOutQuad',
        room,
      });
    }
    return cPath;
  }

  moveMyCharacter(from, to) {
    const roomFrom = this.rooms[from];
    const roomTo = this.rooms[to];

    const character = this.myCharacter;
    this.rooms[to].updateTeleporter();

    if (roomTo.isMyCharacterInRoom()) {
      this.displayRoomActions(roomTo.coordinates);
    }

    if (character.dstRoom === to && character.path) {
      if (character.path.isFinished()) {
        character.notifyDestinationReached();
      } else {
        character.path.finish();
      }
    }

    // If the backend replies nominally with the move after the path completes, stop the torch animation.
    if (!character.path && character.isLookingAround) {
      character.lookAround(false);
    }
    // If the character has a path. We need to stop it.
    if (character.path) {
      const pathTo = character.path.to;
      const teleport = pathTo !== to;
      if (teleport) {
        // Make sure any ongoing paths are stopped.
        character.path.finish(teleport);
      } else {
        character.moving = false;
      }
      return;
    }

    const position = roomTo.getPosition(character.charId);

    // Move with teleportation if both rooms are teleports
    const teleport = !roomFrom || !roomTo || (roomFrom.isTeleporter() && roomTo.isTeleporter());
    if (teleport) {
      character.teleportTo(position.x, position.y, () => {
        if (roomFrom) {
          roomFrom.updateTeleporter(false);
        }
        this.displayRoomActions(roomTo.coordinates);
      });
      return;
    }

    // Move to room and display room actions
    character.moveTo(position.x, position.y, 2000);
  }

  moveCharacter(charId, from, to, mode, path) {
    const character = this.characters[charId];
    if (!character) {
      // eslint-disable-next-line no-console
      console.error(`no character on map with id: ${charId}, need to be added first, adding it for now...`);
      this.addCharacter(charId, to);
      return;
    }

    let chunk;
    const roomTo = this.rooms[to];
    if (roomTo) {
      chunk = roomTo.chunk;
    } else {
      const [rx, ry] = to.split(',').map(Number);
      const chunkCoordinates = toChunkCoordinates(rx, ry);
      const chunkId = `${chunkCoordinates.x},${chunkCoordinates.y}`;
      chunk = this.chunks.get(chunkId);
    }
    chunk.contentUpper.addChild(character);

    if (charId === this.myCharacter.charId) {
      this.moveMyCharacter(from, to);
      return;
    }

    if (character.dstRoom === to && character.path) {
      if (character.path.isFinished()) {
        character.notifyDestinationReached();
      } else {
        character.path.finish();
      }
      return;
    }

    // eslint-disable-next-line no-console
    character.dstRoom = to;

    if (character === this.myCharacter) {
      // ...
    } else {
      character.path = this.createPath(character, from, to, path);
      if (character.path) {
        const len = character.path.steps.length;
        let prevRoom;
        character.path.play(
          (index, step) => {
            if (prevRoom) {
              this.updateRoomCharacters(prevRoom, [], [character]);
            }
            this.updateRoomCharacters(step.room, [character], [], [character]);

            if (index < len - 1) {
              prevRoom = step.room;
            } else {
              prevRoom = undefined;
            }
          },
          () => {
            if (prevRoom) {
              this.updateRoomCharacters(prevRoom, [], [character]);
            }
            character.path = undefined;
            character.moving = false;
            character.stop();
          },
        );
        if (this.rooms[from]) {
          this.updateRoomCharacters(this.rooms[from], [], [character]);
        }
        character.moving = true;
      }
    }
  }

  removeCharacter(charId) {
    const character = this.characters[charId];
    if (character) {
      const charFadeout = ease.add(character, { alpha: 0 }, { duration: 1000 });
      charFadeout.once('complete', () => {
        this.removeObject(character);
        delete this.characters[charId];
      });
    } else {
      // eslint-disable-next-line no-console
      console.error(`no character on map with id: ${charId}. skip removing ...`);
    }

    this.dirty = true;
  }

  killCharacter(characterId, coordinates, focusCam) {
    setTimeout(() => {
      this.addTomb(coordinates, true, focusCam);
    }, 500);
    this.removeCharacter(characterId);
  }

  /**
   * @param coords {string}
   * @param monster {object}
   * @param animate {boolean}
   */
  addMonster(coords, monster, animate = true) {
    if (this.monsters[coords]) {
      // eslint-disable-next-line no-console
      console.error(`monster already present at ${coords}`);
      return;
    }
    this.monsters[coords] = this.addObjectAtCoords(new Monster(monster), coords, {
      animate,
      x: 4.5,
      y: 4.5,
      parentGroup: this.mobGroup,
    });
    this.dirty = true;
  }

  /**
   * @param coords {string}
   */
  removeMonster(coords) {
    const monster = this.monsters[coords];
    if (!monster) {
      log.debug(`no monster at ${coords}, cannot remove`);
      return;
    }
    this.removeObject(monster);
    this.monsters[coords] = null;
    this.dirty = true;
  }

  /**
   * @param coords {string}
   * @param animate {boolean}
   */
  addNPC(coords, animate = true) {
    if (this.npcs[coords]) {
      // eslint-disable-next-line no-console
      console.error(`NPC already present at ${coords}`);
      return;
    }
    const room = this.rooms[coords];
    this.npcs[coords] = this.addObjectAtCoords(new NPC(room.data.npc.type), coords, {
      animate,
      x: 4.5,
      y: 4.5,
      parentGroup: this.mobGroup,
    });
    // Move away from center
    const position = room.positions[1];
    this.npcs[coords].position.set(position.x, position.y);
    this.dirty = true;
  }

  /**
   * @param coords {string}
   */
  removeNPC(coords) {
    const npc = this.npcs[coords];
    if (!npc) {
      // eslint-disable-next-line no-console
      console.error(`no NPC at ${coords}`);
      return;
    }
    this.removeObject(npc);
    this.npcs[coords] = null;
    this.dirty = true;
  }

  /**
   * @param coords {string}
   * @param chest {string}
   * @param animate {boolean}
   */
  addChest(coords, chest, animate = true) {
    const { status } = chest;
    if (!this.chests[coords]) {
      this.chests[coords] = this.addObjectAtCoords(new Chest(status), coords, {
        animate,
        x: 4.5,
        y: 4.5,
        parentGroup: this.mobGroup,
      });
    } else {
      // eslint-disable-next-line no-console
      console.error(`Chest already present at ${coords}`);
      this.chests[coords].update(status);
    }

    // Move away from center
    const room = this.rooms[coords];
    const position = room.positions[2];
    this.chests[coords].position.set(position.x, position.y);
    this.dirty = true;
  }

  /**
   * @param coords {string}
   */
  removeChest(coords) {
    const chest = this.chests[coords];
    if (!chest) {
      // eslint-disable-next-line no-console
      console.error(`no chest at ${coords}`);
      return;
    }
    this.removeObject(chest);
    this.chests[coords] = null;
    this.dirty = true;
  }

  /**
   * @param coords {string}
   * @param animate {boolean}
   * @param moveCamTo {boolean}
   */
  addTomb(coords, animate = true, moveCamTo = false) {
    let tombs = this.tombs[coords];
    if (!tombs) {
      tombs = [];
      this.tombs[coords] = tombs;
    }

    const room = this.rooms[coords];
    const tomb = this.addObjectAtCoords(new Tomb(this, coords), coords, {
      animate,
      x: 4.5,
      y: 4.5,
      parentGroup: this.mobGroup,
    });

    room.addTomb(tomb);

    if (tombs.length < 4) {
      const position = room.positions[tombs.length];
      tomb.position.set(position.x, position.y);
    } else {
      return;
    }
    tomb.zIndex = tombs.length;
    tomb.parentGroup = this.myCharGroup;
    tombs.push(tomb);

    if (moveCamTo) {
      this.camera.setPosition(tomb.position.x, tomb.position.y, 1000);
    }

    this.dirty = true;
  }

  /**
   * @param coords {string}
   */
  removeTomb(coords) {
    const tombs = this.tombs[coords];
    if (!tombs) {
      // eslint-disable-next-line no-console
      console.error(`no tomb at ${coords}`);
      return;
    }

    const tomb = tombs.pop();
    this.removeObject(tomb);
    if (tombs.length === 0) {
      delete this.tombs[coords];
    }

    this.dirty = true;
  }

  /**
   * @param coords {string}
   * @param animate {boolean}
   * @param moveCamTo {boolean}
   */
  addDroppedLoot(coords, animate = true, moveCamTo = false) {
    let droppedLoot = this.droppedLoot[coords];
    if (!droppedLoot) {
      droppedLoot = [];
      this.droppedLoot[coords] = droppedLoot;
    }
    if (droppedLoot.length) {
      return;
    }

    const room = this.rooms[coords];
    const loot = this.addObjectAtCoords(new DroppedLoot(this, coords), coords, {
      animate,
      x: 4.5,
      y: 4.5,
      parentGroup: this.mobGroup,
    });

    room.addDroppedLoot(loot);

    if (droppedLoot.length < 4) {
      const position = room.positions[droppedLoot.length];
      loot.position.set(position.x, position.y);
    } else {
      return;
    }
    loot.zIndex = droppedLoot.length;
    loot.parentGroup = this.myCharGroup;
    droppedLoot.push(loot);

    if (moveCamTo) {
      this.camera.setPosition(loot.position.x, loot.position.y, 1000);
    }

    this.dirty = true;
  }

  /**
   * @param coords {string}
   */
  removeDroppedLoot(coords) {
    const droppedLoot = this.droppedLoot[coords];
    if (!droppedLoot) {
      // eslint-disable-next-line no-console
      console.error(`no loot at ${coords}`);
      return;
    }

    const loot = droppedLoot.pop();
    this.removeObject(loot);
    if (droppedLoot.length === 0) {
      delete this.droppedLoot[coords];
    }

    this.dirty = true;
  }

  createChunk(chunkId, initialize = true) {
    let chunk = this.chunks.get(chunkId);
    if (chunk) {
      return chunk;
    }

    const [cx, cy] = toCoordinatePair(chunkId);

    chunk = new MapChunk(this, cx, cy, initialize);
    this.chunks.set(chunkId, chunk);
    this.chunkContainer.addChild(chunk);
    return chunk;
  }

  removeChunk(chunkId) {
    const chunk = this.chunks.get(chunkId);
    chunk.removeContent();
    this.chunks.delete(chunkId);
    this.chunkContainer.removeChild(chunk);
  }

  addObjectAtCoords(item, coords, options = {}) {
    const { parentGroup, animate } = options;

    // Add room data if known
    if (!this.rooms[coords]) {
      const roomData = global.dungeon.cache.rooms[coords];
      if (roomData) {
        this.addRoom(roomData);
      }
    }

    // Get room, otherwise return items
    const room = this.rooms[coords];
    if (!room) {
      return item;
    }

    if (item.charId) {
      const position = room.getPosition(item.charId);
      item.x = position.x;
      item.y = position.y;
    } else {
      item.x = room.center.x;
      item.y = room.center.y;
    }

    if (typeof parentGroup !== 'undefined') {
      item.parentGroup = parentGroup;
    }
    if (animate) {
      item.alpha = 0;
      if (item.appear) {
        item.appear(item.x, item.y);
      } else {
        ease.add(item, { alpha: 1 }, { duration: 1000 });
      }
    }
    const [rx, ry] = coords.split(',').map(Number);
    const chunkCoordinates = toChunkCoordinates(rx, ry);
    const chunkId = `${chunkCoordinates.x},${chunkCoordinates.y}`;
    const chunk = this.chunks.get(chunkId);
    chunk.contentUpper.addChild(item);
    return item;
  }

  removeObject(obj) {
    if (obj.parent) obj.parent.removeChild(obj);
  }

  addTextureToMap(texture, roomId) {
    if (!texture) {
      console.error('Resource wasnt loaded');
    }

    for (let i = 0; i < this.bitmaps.length; i++) {
      if (this.bitmaps[i].baseTexture === texture.baseTexture) {
        this.bitmapMap[roomId] = i;
        return;
      }
    }

    this.bitmapMap[roomId] = this.bitmaps.length;
    this.bitmaps.push(texture);
  }

  getBitmaps() {
    return this.bitmaps;
  }

  refocus(coords, duration = 1000) {
    let coordinates = coords;
    if (!coordinates && global.dungeon.cache && global.dungeon.cache.currentRoom) {
      ({ coordinates } = global.dungeon.cache.currentRoom);
    }
    if (coordinates) {
      aroundCoordinates(coordinatesChunkId(coordinates)).forEach(id => {
        this.createChunk(id);
      });
      const room = this.rooms[coordinates];
      if (room) {
        this.camera.setPosition(room.center.x, room.center.y, duration);
      } else {
        this.showDelay = 66;
        const [x, y] = roomPixelPosition(coordinates);
        this.camera.setPosition(x, y, duration);
        this.showDelay = 0;
      }
    }
  }

  drawBack() {
    this.back.clear();
    this.back.beginFill(0x0, 1);
    this.back.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
    this.back.endFill();
  }

  isCharacterInTeleport() {
    return global.dungeon.cache.currentRoom.kind === '2';
  }

  updateRoomCharacters(room, include = [], exclude = [], excludeAnimation = []) {
    if (!room || room.data.characters === 0) {
      return;
    }

    let offset = 0;
    /** {Array} */
    const chars = [...Object.values(global.dungeon.cache.onlineCharacters)].sort((a, b) => {
      return a.charId - b.charId;
    });

    const charsToMove = [];
    const contains = (array, element) => {
      if (!array || array.length === 0) return false;
      for (let index = 0; index < array.length; index += 1) {
        if (array[index] === element) return true;
      }
      return false;
    };

    for (let index = 0; index < chars.length; index += 1) {
      const char = chars[index];
      if (char) {
        const character = this.characters[char.characterId];
        if (!contains(exclude, character) && (contains(include, character) || char.coordinates === room.coordinates)) {
          charsToMove.push(character);
        }
      }
    }

    if (charsToMove.length > 4 || charsToMove.length === 1) {
      for (let index = 0; index < charsToMove.length; index += 1) {
        const position = room.center;
        const next = charsToMove[index];
        if (next) {
          next.moveTo(position.x, position.y, 2000, !contains(excludeAnimation, next));
        }
      }
    } else {
      for (let index = 0; index < Math.min(4, charsToMove.length); index += 1) {
        const position = room.positions[offset];
        const next = charsToMove[index];
        if (next) {
          next.moveTo(position.x, position.y, 2000, !contains(excludeAnimation, next));
        }
        offset += 1;
      }
    }
  }

  async displayRoomCoordinates(coordinates) {
    const room = this.rooms[coordinates];
    if (!room) {
      return;
    }

    // Generate action, check if not null, and place
    const action = this.ui.roomLabel({
      id: `room-label-${coordinates}`,
      parent: this.container,
      text: ` ${formatCoordinates(coordinates)} `,
    });
    if (action) {
      // Position within UI group
      action.parentGroup = this.uiGroup;
      if (action.anchor) {
        action.anchor.set(0.5);
      } else {
        const lb = action.getLocalBounds();
        action.pivot.set(lb.x + lb.width / 2, lb.y + lb.height / 2);
      }
      action.position.set(room.center.x, room.center.y - ROOM_TILE_SIZE - 4);
      this.container.addChild(action);
    }
  }

  async displayRoomActions(coordinates) {
    const room = this.rooms[coordinates];
    if (!room) {
      return;
    }

    const { cache } = global.dungeon;
    const { characterStatus, currentRoom } = cache;

    if (['just died', 'dead'].includes(characterStatus)) {
      this.ui.remove();
      return;
    }

    const loc = coordinatesToLocation(room.coordinates);

    const id = `room-${loc}`;

    const buttons = [];
    let label;
    let allowCancel = true;

    switch (true) {
      // Teleporter room
      case room.isTeleporter(): {
        // Do not display if current room
        const { rooms } = cache;
        if (room.coordinates === currentRoom.coordinates) {
          // Check if has minimap feature
          const { portal } = get(characterFeatures);
          if (portal) {
            // Add teleport floor portal button
            buttons.push({
              type: 'confirm',
              text: 'Use as portal',
              data: { fontSize: 11 },
              onClick: async () => mapModal.open('portal'),
              closeable: false,
            });
            allowCancel = true;
          }
          break;
        }

        // Skip if room character is not in teleport
        // @TODO - MOVE ELSEWHERE
        const charRoom = rooms[currentRoom.coordinates];
        if (!charRoom || charRoom.kind !== '2') {
          this.ui.log(teleportText.notInRoom);
          break;
        }

        const cost = await cache.teleportCost(room.coordinates);
        const level = rooms[room.coordinates].monsterLevel;
        const lowLevel = level > characterLevel;
        const { coins } = get(characterBalances);
        const text = lowLevel ? teleportText.requiresLevel({ level }) : teleportText.goHere({ cost });
        const disabled = cost > coins || lowLevel;
        allowCancel = !disabled;

        // Add teleport button
        buttons.push({
          type: 'confirm',
          disabled,
          text,
          confirmingText: actionsText.teleporting,
          data: { fontSize: 11 },
          onClick: async () => {
            await global.dungeon.teleport(room.coordinates);
            this.container.removeChild(action);
            room.updateTeleporter(false);
          },
          onCancel: () => {
            this.container.removeChild(action);
            room.updateTeleporter(false);
          },
        });

        // Add room label
        label = `LVL: ${level}`;
        room.updateTeleporter(true);
        break;
      }
      // Temple room
      case room.isTemple(): {
        buttons.push({
          type: 'confirm',
          text: 'Heal',
          disabled: get(characterHP) === get(characterMaxHP),
          data: { fontSize: 11 },
          onClick: async () => mapModal.open('heal'),
          closeable: false,
        });
        break;
      }
      // Carrier room
      case room.isCarrier(): {
        buttons.push({
          type: 'confirm',
          text: 'Send items',
          data: { fontSize: 11 },
          onClick: async () => mapModal.open('carrierRoom'),
          closeable: false,
        });
        break;
      }
      // Regular room
      default: {
        break;
      }
    }

    // Additional actions for current rooms
    if (room.coordinates === currentRoom.coordinates) {
      // Quest or NPC
      const quest = get(currentQuest);
      if (quest) {
        buttons.push({
          type: 'confirm',
          text: quest.label || 'Learn',
          data: { fontSize: 11 },
          onClick: async () => mapModal.toggle('quest', { id: quest.id }),
          closeable: false,
        });
      } else if (room.hasNPC() && currentRoom.npc.type === 'recycler') {
        buttons.push({
          type: 'confirm',
          text: 'Talk',
          data: { fontSize: 11 },
          onClick: async () => mapModal.toggle('talkToNpc'),
          closeable: false,
        });
      }

      // Treasure chest
      if (room.hasChest()) {
        buttons.push({
          type: 'confirm',
          text: 'Look at chest',
          data: { fontSize: 11 },
          onClick: async () => mapModal.toggle('treasureChest'),
          closeable: false,
        });
      }

      // Scavenge room
      if (
        room.data.scavenge &&
        (room.data.scavenge.gear.length ||
          room.data.scavenge.corpses.length ||
          Object.values(room.data.scavenge.balance || {})
            .flat()
            .filter(Boolean).length)
      ) {
        buttons.push({
          type: 'confirm',
          text: 'Search room',
          data: { fontSize: 11 },
          onClick: async () => mapModal.toggle('scavenge'),
          closeable: false,
        });
      }
    }

    // Stop and remove existing if no action buttons
    if (buttons.filter(Boolean).length === 0) {
      this.ui.remove();
      return;
    }

    // Always include cancel button
    if (allowCancel) {
      buttons.push({
        type: 'cancel',
        text: 'Cancel',
        data: { fontSize: 11 },
        onClick: () => true,
      });
    }

    // Generate action, check if not null, and place
    const action = this.ui.buttons({
      id,
      parent: this.container,
      buttons,
    });
    if (action) {
      // Add room label if so defined
      if (label) {
        const labelTag = new PIXI.Sprite();
        labelTag.anchor.set(0.5);
        labelTag.y = -24;

        const labelText = new NameTag(label, { fontSize: 13 });
        labelTag.addChild(labelText);
        action.addChild(labelTag);
      }

      // Position within UI group
      action.parentGroup = this.uiGroup;
      if (action.anchor) {
        action.anchor.set(0.5);
      } else {
        const lb = action.getLocalBounds();
        action.pivot.set(lb.x + lb.width / 2, lb.height / 2);
      }
      action.position.set(room.center.x, room.center.y + ROOM_SIZE * ROOM_TILE_SIZE + (label ? -7 : -7));
      this.container.addChild(action);
    }
  }

  // TODO arrows should be part of the room so they can be placed easily like doors
  createArrow(coordinates, direction, parentRoom) {
    const halfRoom = ROOM_SIZE / 2;
    const { expansions } = parentRoom.data;
    const expansion = expansions[direction];
    let [x, y] = toCoordinatePair(coordinates);
    let [_x, _y] = [x, y];

    // Calculate direction and offset for the arrow.
    let texture;
    let pathTexture;
    const expansionOffset = expansion < 0 ? -0.1 : 0.2;
    const arrowOffset = 0.3;
    const pathOffset = 0.5;
    if (direction === Direction.NORTH) {
      texture = this.arrowTop;
      pathTexture = this.pathTop;
      y += arrowOffset - expansionOffset;
      _y += pathOffset - expansionOffset;
    } else if (direction === Direction.SOUTH) {
      texture = this.arrowBottom;
      pathTexture = this.pathBottom;
      y -= arrowOffset - 0.2 - expansionOffset;
      _y -= pathOffset - 0.2 - expansionOffset;
    } else if (direction === Direction.WEST) {
      texture = this.arrowLeft;
      pathTexture = this.pathLeft;
      x += arrowOffset - expansionOffset / 3 - 0.1;
      _x += pathOffset - expansionOffset / 3 - 0.1;
    } else if (direction === Direction.EAST) {
      texture = this.arrowRight;
      pathTexture = this.pathRight;
      x -= arrowOffset - expansionOffset - 0.1;
      _x -= pathOffset - expansionOffset - 0.1;
    }

    const px = ROOM_TILE_SIZE * (ROOM_SIZE * x + halfRoom);
    const py = ROOM_TILE_SIZE * (ROOM_SIZE * y + halfRoom);

    const _px = ROOM_TILE_SIZE * (ROOM_SIZE * _x + halfRoom);
    const _py = ROOM_TILE_SIZE * (ROOM_SIZE * _y + halfRoom);

    // Create the sprite to add to the map.
    const arrow = new PIXI.Sprite(texture);
    arrow.parentGroup = this.arrowGroup;
    arrow.buttonMode = true;
    arrow.anchor.set(0.5, 0.5);
    arrow.scale.set(0.25, 0.25);
    arrow.position.set(px, py);
    arrow.interactive = true;
    arrow.buttonMode = true;

    const path = new PIXI.Sprite(pathTexture);
    path.anchor.set(0.5, 0.5);
    path.position.set(_px, _py);
    path.parentGroup = this.pathGroup;

    // Create the listener for the arrow to interact and move on clicks.
    let downTime;
    const clickListener = async () => {
      mapModal.open('discoverRoom', { coordinates });
      // this.removeArrows();
      // await this._move(coordinates);
      // setTimeout(() => {
      //   this.placeArrows();
      // }, 1000);
    };
    const downListener = event => {
      event.stopPropagation();
      downTime = new Date().getTime();
    };
    const upListener = () => {
      const timeCurrent = new Date().getTime();
      if (timeCurrent - downTime < 250) {
        clickListener();
      }
      downTime = undefined;
    };
    arrow.on('pointerdown', downListener);
    arrow.on('pointerup', upListener);
    arrow.on('pointerupoutside', upListener);

    this.arrowContainer.addChild(path);
    this.arrowContainer.addChild(arrow);
  }

  removeArrows() {
    this.arrowContainer.removeChildren();
  }

  placeArrows() {
    this.removeArrows();
    if (moving) return;

    Object.values(get(reachableRooms)).forEach(room => {
      if (!room) return;
      if (room.status === 'undiscovered') {
        const { parent } = room;
        const dir = parent.exit;
        const parentRoom = this.rooms[parent.coordinates];
        if (!parentRoom) return;
        this.createArrow(room.coordinates, dir, parentRoom);
        this.dirty = true;
      }
    });
  }

  /**
   * TODO: Clean up and migrate to Character class. -Josh
   *
   * @param to {string} The coordinates to move to. (In room space)
   * @return {Promise<void>}
   *
   * @private
   */
  async _move(to) {
    const from = global.dungeon.cache.currentRoom.coordinates;
    moving = true;

    // Hide open modals
    mapModal.close();

    if (this.myCharacter.path) {
      this.myCharacter.path.finish();
    }

    // Make sure that the radial menu is closed and arrows removed while moving.
    this.removeArrows();
    if (this.charMenu.isOpen()) {
      this.charMenu.close();
    }

    this.myCharacter.path = this.createPath(this.myCharacter, from, to, undefined, true);
    if (this.myCharacter.path) {
      const len = this.myCharacter.path.steps.length;
      this.camera.setTrackedObject(this.myCharacter, 2000);

      let prevRoom;
      const toRoom = this.rooms[to];
      if (toRoom) {
        toRoom.setLight(0xffffff);
      }

      this.myCharacter.path.play(
        // For completion of each segment of the path.
        (index, step) => {
          if (prevRoom) {
            this.updateRoomCharacters(prevRoom, [], [this.myCharacter]);
          }
          this.updateRoomCharacters(step.room, [this.myCharacter], [], [this.myCharacter]);
          if (index < len - 1) {
            prevRoom = step.room;
          } else {
            prevRoom = undefined;
          }
        },
        // For when the path is finished.
        (x, y, teleport) => {
          if (prevRoom) {
            this.updateRoomCharacters(prevRoom, [], [this.myCharacter]);
          }
          this.camera.setTrackedObject(undefined);
          this.myCharacter.path = undefined;
          if (teleport) {
            this.camera.setPosition(x, y, 1000);
          }
          this.myCharacter.moving = false;
          if (toRoom) {
            toRoom.setLight(0x0);
          }
        },
      );

      const roomTo = this.rooms[to];
      if (roomTo && roomTo.isTeleporter()) {
        roomTo.updateTeleporter(true);
      }

      const roomFrom = this.rooms[from];
      if (roomFrom) {
        if (roomFrom.isTeleporter()) {
          roomFrom.updateTeleporter(false);
        }
        this.updateRoomCharacters(this.rooms[from], [], [this.myCharacter]);
      }
    }

    this.myCharacter.moving = true;
    this.ui.remove();
    this.updateFog = false;
    await global.dungeon.cache.move(to);
    moving = false;
  }

  hideFurthestChunks() {
    this.doCull(true);

    // Make sure the character is loaded since his/her location is used to calculate the furthest position.
    // NOTE: We could use the camera. It depends on how much data we'd want to send to the client.
    const charCoordinates = global.dungeon.cache.currentRoom.coordinates;
    if (!charCoordinates) {
      return;
    }

    // Get chunks, skip if less than max
    const chunks = [];
    for (const [_, chunk] of this.chunks) {
      if (chunk.showing) {
        chunks.push(chunk);
      }
    }
    if (chunks.length <= MAX_CHUNKS) {
      return;
    }

    const [rx, ry] = charCoordinates.split(',').map(Number);
    const charChunk = toChunkCoordinates(rx, ry);
    const charChunkLocal = toChunkLocalCoordinates(rx, ry);
    const chunkLen = CHUNK_ROOM_LENGTH * ROOM_SIZE * ROOM_TILE_SIZE;

    const charGlobal = {
      x: charChunk.x * chunkLen + charChunkLocal.x,
      y: charChunk.y * chunkLen + charChunkLocal.y,
    };

    const halfChunk = chunkLen / 2;
    const getDistance = chunk => {
      const a = charGlobal.x - (chunk.position.x + halfChunk);
      const b = charGlobal.y - (chunk.position.y + halfChunk);
      return Math.sqrt(a * a + b * b);
    };

    chunks.sort((a, b) => getDistance(a) - getDistance(b));
    for (let index = MAX_CHUNKS; index < chunks.length; index += 1) {
      chunks[index].hide();
    }
  }

  /**
   * Converts map-pixel coordinates to map-tile coordinates.
   *
   * @param position {Point|{x: number, y: number}} The position in pixel-map space.
   * @return {{x: number, y: number}}
   */
  getTileCoordinates(position) {
    return {
      x: Math.floor(position.x / ROOM_TILE_SIZE),
      y: Math.floor(position.y / ROOM_TILE_SIZE),
    };
  }

  /**
   * Returns whether or not the local character is registered in the room coordinates provided.
   * @param coords {string} The room coordinates to test. (Format: `${roomX},${roomY}`)
   *
   * @return Returns true if the local character is in the room coordinates provided.
   */
  isMyCharacterInRoom(coords) {
    return coords === global.dungeon.cache.currentRoom.coordinates;
  }
}

export default MapRenderer;
