import 'pixi.js';
import { ease } from 'pixi-ease';

import Direction from '../../../utils/Direction';

class RoomExit extends PIXI.Container {
  /**
   * @constructor
   *
   * @param room {Room}
   * @param coordinates {string}
   * @param direction {string}
   */
  constructor(room, coordinates, direction, locked = false) {
    super();

    this.room = room;
    this.coordinates = coordinates;
    this.direction = direction;
    this.animations = PIXI.Loader.shared.resources.sheet.spritesheet.animations;
    this.pivot.set(0.5, 0.5);

    if (direction === Direction.NORTH || direction === Direction.SOUTH) {
      this.set = 'h';
    } else if (direction === Direction.EAST || direction === Direction.WEST) {
      this.set = 'v';
    }

    this.visible = false;
    const sprites = locked
      ? this.animations[`${this.set}_door`]
      : [PIXI.utils.TextureCache[`room_exit_${this.set}.png`]];

    this.floor = new PIXI.Sprite(PIXI.utils.TextureCache[`room_exit_${this.set}.png`]);
    this.floor.anchor.set(0.5, 0.5);
    this.door = new PIXI.AnimatedSprite(sprites);
    this.door.animationSpeed = 0.2;
    this.door.anchor.set(0.5, 0.5);
    this.door.onComplete = () => {
      ease.add(this.door, { alpha: 0 }, { duration: 1000 }).on('complete', () => {
        this.door.visible = false;
      });
    };
    this.addChild(this.floor);
    this.addChild(this.door);
  }

  /**
   * Plays the animation of the door locking.
   */
  lock() {
    if (!this.door.visible) {
      this.door.alpha = 0;
      this.door.visible = true;
      ease.add(this.door, { alpha: 1 }, { duration: 1000 });
    }
    this.door.gotoAndStop(0);
  }

  /**
   * Plays the animation of the door unlocking.
   *
   * @param callback {function} Called when the animation completes.
   */
  unlock(callback) {
    this.door.loop = false;
    this.door.play();
    this.door.on('complete', () => {
      if (callback) callback();
    });
  }
}

export default RoomExit;
