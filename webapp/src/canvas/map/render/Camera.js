import 'pixi.js';
import { Ease } from 'pixi-ease';
// unsafe. please not use it!
// import gesture from 'pixi-simple-gesture';
import { ROOM_TILE_SIZE } from './MapUtils';

const TMP_Point = new PIXI.Point();
const scales = [1 / 2.5, 1 / 2, 1 / 1.5, 1, 1 / 0.75, 1 / 0.5];

const lerp = (start, stop, percent) => {
  if (start === stop) {
    return start;
  }
  return start + percent * (stop - start);
};

const easeInOut = t => {
  return t > 0.5 ? 4 * (t - 1) ** 3 + 1 : 4 * t ** 3;
};

export const MUTATION_TYPE = {
  NONE: 0,
  MOVE: 1,
  SCALE: 4,
};
class Camera extends PIXI.Container {
  /**
   * @constructor
   *
   * @param mapRenderer {MapRenderer}
   */
  constructor(mapRenderer) {
    super();
    this.mapRenderer = mapRenderer;
    this.dirty = true;
    this.scale.set(scales[3]);

    /**
     * @type {PIXI.DisplayObject}
     */
    this.trackedObject = undefined;

    /**
     * @type {CameraComposer}
     */
    this.composer = undefined;

    this.ease = new Ease({});
    this.lastMutation = 0;
  }

  get offset() {
    return this.pivot;
  }

  init() {
    if (this.initted) {
      return;
    }
    this.initMouseEvents();
    // this.initTouchEvents();
    this.initted = true;
  }

  /**
   * @private
   */
  // TODO fix zoom events
  // initTouchEvents() {
  //   const { app } = this.mapRenderer;
  //   const iter = this.mapRenderer.container;
  //
  //   const inertia = true;
  //   gesture.pinchable(iter, true);
  //
  //   iter.on('pinchstart', e => {
  //     console.log('pinch start', e);
  //   });
  //
  //   iter.on('pinchmove', e => {
  //     console.log('pinch move', e);
  //   });
  //
  //   iter.on('pinchend', e => {
  //     console.log('pinch end', e);
  //   });
  //
  //   // stage.on('touchstart', e => {
  //   //   console.log('touchstart', e);
  //   // });
  //   //
  //   // stage.on('touchend', e => {
  //   //   console.log('touchend', e);
  //   // });
  //   //
  //   // stage.on('touchendoutside', e => {
  //   //   console.log('touchendoutside', e);
  //   // });
  //   // stage.on('touchmove', e => {
  //   //   console.log('touchmove', e);
  //   // });
  // }

  toPixelCoordinates(sx, sy) {
    return {
      x: Math.round(sx + this.cx),
      y: Math.round(sy + this.cy),
    };
  }
  /**
   * @private
   */
  initMouseEvents() {
    let last;
    let downMs;
    const { screen } = this.mapRenderer.app;
    let clickTime;
    let upTime;
    let pixel;

    const toTileCoordinates = (tx, ty) => {
      return {
        x: Math.floor(tx / (ROOM_TILE_SIZE * this.scale.x)),
        y: Math.floor(ty / (ROOM_TILE_SIZE * this.scale.y)),
      };
    };

    const onClick = global => {
      const timeCurrent = new Date().getTime();
      if (!clickTime || timeCurrent - clickTime > 50) {
        clickTime = timeCurrent;
      } else {
        return;
      }

      pixel = TMP_Point.copyFrom(global);
      if (this.composer) {
        this.composer.transformPoint(pixel, pixel, true);
        pixel.x *= this.scale.x;
        pixel.y *= this.scale.x;
      } else {
        pixel = this.toPixelCoordinates(pixel.x, pixel.y);
      }

      const tile = toTileCoordinates(pixel.x, pixel.y);
      console.log('map clicked', pixel.x, pixel.y, { pixel, tile, global });

      let room;
      // could be more optimized by checking which chunk was clicked 1st, this requires correct chunk bounds transformation
      for (let i = 0; i < this.mapRenderer.activeChunks.length; i++) {
        room = this.mapRenderer.activeChunks[i].rooms.find(room => room.contains(tile.x, tile.y));
        if (room) break;
      }

      if (room) {
        this.mapRenderer.container.emit('roomClicked', room, new PIXI.Point(global.x, global.y));
        console.log('room clicked', room.coordinates, room);
      }
    };

    const onDragStart = event => {
      if (this.trackedObject) {
        return;
      }

      this.ease.removeAll(true);

      pixel = TMP_Point.copyFrom(event.data.global);

      if (this.composer) {
        this.composer.transformPoint(pixel, pixel, true);
      } else {
        pixel = this.toPixelCoordinates(pixel.x, pixel.y);
      }

      const tile = toTileCoordinates(pixel.x, pixel.y);
      const rooms = this.mapRenderer.rooms;

      const { global } = event.data;
      downMs = Date.now();
      last = { x: global.x, y: global.y };

      if (this.mapRenderer.charMenu.isOpen()) {
        this.mapRenderer.charMenu.close();
      }
    };

    const onDragMove = event => {
      if (last == null) {
        return;
      }

      const current = event.data.global;
      const deltaX = (current.x - last.x) * this.scale.x;
      const deltaY = (current.y - last.y) * this.scale.x;

      this.move(-deltaX, -deltaY);
      last.x = current.x;
      last.y = current.y;
    };

    const onDragEnd = event => {
      if (!last) {
        return;
      }

      pixel = TMP_Point.copyFrom(event.data.global);
      if (this.composer) {
        this.composer.transformPoint(pixel, pixel, true);
        pixel.x *= this.scale.x;
        pixel.y *= this.scale.x;
      } else {
        pixel = this.toPixelCoordinates(pixel.x, pixel.y);
      }

      const timeCurrent = Date.now();
      if (!upTime || timeCurrent - upTime > 50) {
        upTime = timeCurrent;
      } else {
        return;
      }

      if (timeCurrent - downMs < 200) {
        try {
          onClick(event.data.global);
        } catch (e) {
          console.error(e);
        }
      }
      last = undefined;
      downMs = undefined;
    };

    const { app } = this.mapRenderer;
    const iter = this.mapRenderer.container;

    app.stage.interactive = true;
    app.stage.interactiveChildren = true;

    iter.on('pointerdown', onDragStart, this);
    iter.on('pointermove', onDragMove, this);
    iter.on('pointerup', onDragEnd, this);
    iter.on('pointerupoutside', onDragEnd, this);

    let scale = 2;

    const wheel = event => {
      this.lastMutation = MUTATION_TYPE.SCALE;

      let target = scale;
      if (event.deltaY < 0 && scale - 1 > 0) {
        target += Math.floor(event.deltaY / 10);
      } else if (event.deltaY > 0 && scale + 1 < scales.length - 1) {
        target += Math.floor(event.deltaY / 10);
      }

      if (target !== scale) {
        const s = scales[target];
        if (s) {
          this.scale.set(s);
          console.log(`CAMERA SCALE: ${s}`);
          this.setDirty(true);
          scale = target;
        }
      }
    };
    app.view.addEventListener('wheel', wheel);
  }

  getTopLeftPixel() {
    const w2 = this.x;
    const h2 = this.y;

    const pixel = this.toPixelCoordinates(this.x, this.y);
    return { x: pixel.x - w2, y: pixel.y - h2 };
  }

  getScreenBounds() {
    const { screen } = this.mapRenderer.app;
    const topLeft = this.getTopLeftPixel();
    return new PIXI.Rectangle(topLeft.x, topLeft.y, screen.width, screen.height);
  }

  onUpdate() {
    // If a tracked object is set, then check if the camera is in the position of the character. If not, position
    //   the camera to the trackedObject's global position.
    if (!this.trackedObject) {
      return;
    }

    const sx = this.scale.x;

    if (this.clampLerp < 0.9999) {
      const current = Date.now();

      this.clampLerp = easeInOut((current - this.clampTimestamp) / this.clampTime);
      if (this.clampLerp > 0.9999) this.clampLerp = 1;
      else if (this.clampLerp < 0) this.clampLerp = 0;

      const x = lerp(this.onTrackCameraPosition.x, this.trackedObject.position.x, this.clampLerp);
      const y = lerp(this.onTrackCameraPosition.y, this.trackedObject.position.y, this.clampLerp);

      this.x = Math.round(x);
      this.y = Math.round(y);

      this.lastMutation = MUTATION_TYPE.MOVE;
      this.setDirty(true);
    } else {
      const { x, y } = this.trackedObject.position;

      this.x = Math.round(x);
      this.y = Math.round(y);

      this.lastMutation = MUTATION_TYPE.MOVE;
      this.setDirty(true);
    }
  }

  onPostUpdate() {
    this.lastMutation = 0;
    this.setDirty(false);
  }

  /**
   *
   * @param x {number}
   * @param y {number}
   * @param duration {number?}
   */
  setPosition(x, y, duration) {
    if (Math.abs(this.x - x) + Math.abs(this.y - y) < 1) {
      return;
    }

    if (!duration || duration <= 0) {
      this.position.set(x, y);
      this.lastMutation = MUTATION_TYPE.MOVE;
      this.setDirty(true);
      this.mapRenderer.viewport.emit('moved-end', this.mapRenderer.viewport);
    } else {
      const path = this.ease.add(this, { x: x, y: y }, { duration, ease: 'easeOutQuad' });
      path.on('each', () => {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);

        this.lastMutation = MUTATION_TYPE.MOVE;
        this.setDirty(true);
      });
      path.on('complete', () => {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);

        this.lastMutation = MUTATION_TYPE.MOVE;
        this.setDirty(true);
        this.mapRenderer.viewport.emit('moved-end', this.mapRenderer.viewport);
      });
    }
  }

  setTrackedObject(trackedObject, clampTime = 0) {
    if (this.trackedObject === trackedObject) {
      return;
    }

    this.onTrackCameraPosition = new PIXI.Point(this.x, this.y);
    this.trackedObject = trackedObject;
    this.clampLerp = 0;
    this.clampTime = clampTime;
    this.clampTimestamp = Date.now();
  }

  move(x, y) {
    this.position.set(this.x + x, this.y + y);
    this.setDirty(true);
    this.mapRenderer.viewport.emit('moved-end', this.mapRenderer.viewport);
  }

  // js support get/set, this is not java =)
  /**
   * @return {boolean}
   */
  isDirty() {
    return this.dirty;
  }

  /**
   * @param flag {boolean}
   */
  setDirty(flag) {
    this.dirty = flag;
  }
}

export default Camera;
