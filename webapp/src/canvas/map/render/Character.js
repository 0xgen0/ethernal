import 'pixi.js';
import { ease } from 'pixi-ease';
import { ColorReplaceFilter } from '@pixi/filter-color-replace';
import layerGroups from 'canvas/common/layersGroup';
import { ELLIPSIS } from 'data/text';
import NameTag from 'canvas/common/NameTag';
import { getDirection, ROOM_SIZE, ROOM_TILE_SIZE, toCoordinatePair } from './MapUtils';
import Direction from '../../utils/Direction';
import Light from './util/Light';
import CharacterClass from './util/CharacterClass';
import ReplacementMaterial from './util/ReplacementMaterial';

const { UI_GROUP } = layerGroups;
const colorMap = [
  { original: 0xff4848, target: 0x0ae5d8 },
  { original: 0x7b0e4f, target: 0x0e687b },
  { original: 0x5f90ff, target: 0xffbd5f },
  { original: 0x211574, target: 0x743d15 },
];

class Character extends PIXI.Container {
  constructor(type, viewport, dstRoom, ui, charId, charClass) {
    super();

    this.charId = charId;
    this.charClass = charClass;
    this.tint = 0xffffff;
    this.ui = ui;
    this.lastCoords = {};
    this.viewport = viewport;
    this.isLookingAround = false;
    this.activeAnimation = undefined;

    // Manually size the hit-box for the character to reflect only the positive space for the sprite of 16xq6 pixels.
    this.hitArea = new PIXI.Rectangle(-8, -8, 16, 16);

    this.light = new Light(
      charId === global.dungeon.cache.characterId ? 0xf8d878 : 0x777777,
      charId === global.dungeon.cache.characterId ? 0.2 : 0.1,
    );
    this.light.position.set(0, 6);
    this.addChild(this.light);

    const spritesheet_legacy = PIXI.Loader.shared.resources.sheet.spritesheet;
    const animations_legacy = spritesheet_legacy.animations;
    let { char_front_walk, char_side_walk, char_back_walk, char_torch } = animations_legacy;

    // TODO: Figure out what the plan is to implement sprites separated for components. -Josh
    const charAnims = PIXI.Loader.shared.resources.character_classes.spritesheet.animations;

    // DEBUG CODE
    // char_front_walk = charAnims.char_wiz_front;
    // char_back_walk = charAnims.char_wiz_back;
    // char_side_walk = charAnims.char_wiz_side;

    if (charClass === CharacterClass.EXPLORER) {
      char_front_walk = charAnims.char_adv_front;
      char_back_walk = charAnims.char_adv_back;
      char_side_walk = charAnims.char_adv_side;
      // this.tint = 0xecc41e;
    } else if (charClass === CharacterClass.MAGE) {
      char_front_walk = charAnims.char_wiz_front;
      char_back_walk = charAnims.char_wiz_back;
      char_side_walk = charAnims.char_wiz_side;
      // this.tint = 0xecc41e;
    } else if (charClass === CharacterClass.BARBARIAN) {
      char_front_walk = charAnims.char_bar_front;
      char_back_walk = charAnims.char_bar_back;
      char_side_walk = charAnims.char_bar_side;
      // this.tint = 0xecc41e;
    } else if (charClass === CharacterClass.WARRIOR) {
      char_front_walk = charAnims.char_war_front;
      char_back_walk = charAnims.char_war_back;
      char_side_walk = charAnims.char_war_side;
      // this.tint = 0xecc41e;
    }
    const moveS = new PIXI.AnimatedSprite(char_front_walk);
    const moveW = new PIXI.AnimatedSprite(char_side_walk);
    const moveE = new PIXI.AnimatedSprite(char_side_walk);
    const moveN = new PIXI.AnimatedSprite(char_back_walk);

    moveS.tint = this.tint;
    moveW.tint = this.tint;
    moveE.tint = this.tint;
    moveN.tint = this.tint;

    const scale = 1;
    const pos = { x: 0, y: -2 };
    moveS.position.set(pos.x, pos.y);
    moveW.position.set(pos.x, pos.y);
    moveE.position.set(pos.x, pos.y);
    moveN.position.set(pos.x, pos.y);
    moveS.scale.set(scale, scale);
    moveW.scale.set(scale, scale);
    moveE.scale.set(scale, scale);
    moveN.scale.set(scale, scale);

    // eslint-disable-next-line no-multi-assign
    moveE.scale.x = -moveE.scale.x;

    const lookAround = new PIXI.AnimatedSprite(char_torch);
    this.charAnimations = { moveS, moveW, moveE, moveN, lookAround };
    lookAround.scale.set(1.25, 1.25);
    lookAround.tint = this.tint;

    this.view = new PIXI.SimplePlane(moveE.texture);
    this.view.pivot.set(16, 16);

    if (true || type === 'other') {
      this.view.material = new ReplacementMaterial(PIXI.Texture.WHITE, colorMap);
    }

    Object.values(this.charAnimations).forEach(animation => {
      animation.animationSpeed = 0.25;
    });

    this._syncAnimation(moveE);
    this.addChild(this.view);
    this.showName();
    this.interactive = true;
  }

  _syncAnimation(target) {
    if (this.activeAnimation === target) {
      return;
    }

    if (this.activeAnimation) {
      this.activeAnimation.onFrameChange = undefined;
    }

    this.activeAnimation = target;

    this.view.scale.copyFrom(this.activeAnimation.scale);
    this.activeAnimation.onFrameChange = t => this._syncTexture(this.activeAnimation.textures[t]);

    this._syncTexture(this.activeAnimation.texture);
  }

  _syncTexture(texture) {
    this.view.texture = texture;
  }

  stop() {
    if (!this.path || this.path.isFinished()) {
      this.charAnimations.moveN.stop();
      this.charAnimations.moveS.stop();
      this.charAnimations.moveE.stop();
      this.charAnimations.moveW.stop();
      this.charAnimations.lookAround.stop();
      this.isLookingAround = false;
    }
  }

  notifyDestinationReached() {
    this.charAnimations.lookAround.stop();
  }

  appear(x, y) {
    this.x = x;
    this.y = y;
    this.lastCoords.x = x;
    this.lastCoords.y = y;
    ease.add(this, { alpha: 1 }, { duration: 1000 });
  }

  teleport(newX, newY) {
    const moveChar = ease.add(this, { alpha: 0 }, { duration: 500 });
    moveChar.once('complete', () => {
      this.x = newX;
      this.y = newY;
      ease.add(this, { alpha: 1 }, { duration: 500 });
    });

    this.lastCoords.x = newX;
    this.lastCoords.y = newY;
  }

  teleportTo(x, y, callback) {
    // If the character is already in this position, we don't need to do anything.
    if (Math.round(this.position.x) === Math.round(x) && Math.round(this.position.y) === Math.round(y)) {
      if (callback) {
        callback();
      }
      return;
    }

    const moveChar = ease.add(this, { alpha: 0 }, { duration: 500 });
    moveChar.once('complete', () => {
      if (callback) {
        callback();
      }
      this.x = x;
      this.y = y;
      ease.add(this, { alpha: 1 }, { duration: 500 });
    });

    this.lastCoords.x = x;
    this.lastCoords.y = y;
  }

  moveTo(x, y, duration = 0, animate = true, forceTeleport = false) {
    // If the character is already in this position, we don't need to do anything.
    if (Math.round(this.position.x) === Math.round(x) && Math.round(this.position.y) === Math.round(y)) {
      return;
    }

    if (forceTeleport) {
      this.teleportTo(x, y);
      return;
    }

    // Test if the distance for the location is greater than a normal movement. If so, teleport.
    const a = this.position.x - x;
    const b = this.position.y - y;
    const threshold = 6 * ROOM_SIZE * ROOM_TILE_SIZE;
    const distance = Math.sqrt(a * a + b * b);
    if (distance > threshold) {
      this.teleportTo(x, y);
      return;
    }

    if (duration === 0) {
      this.position.set(x, y);
    } else {
      const dir = getDirection(this.position.x, this.position.y, x, y);
      if (animate) {
        Object.values(this.charAnimations).forEach(animation => {
          animation.alpha = 0;
        });
        this.playDirection(dir);
      }
      const animation = ease.add(this, { x, y }, { duration });
      animation.on('complete', () => {
        if (animate) {
          this.stop();
        }
      });
    }
  }

  playDirection(direction) {
    console.log(`playDirection(${direction})`);

    let spriteToMove;
    switch (direction) {
      case Direction.NORTH: {
        spriteToMove = this.charAnimations.moveN;
        break;
      }
      case Direction.EAST: {
        spriteToMove = this.charAnimations.moveE;
        break;
      }
      case Direction.SOUTH: {
        spriteToMove = this.charAnimations.moveS;
        break;
      }
      case Direction.WEST: {
        spriteToMove = this.charAnimations.moveW;
        break;
      }
      default: {
        return;
      }
    }
    spriteToMove.alpha = 1;
    spriteToMove.play();

    this._syncAnimation(spriteToMove);
  }

  move(direction, x, y, mode, callback, context) {
    context = context || this;
    const character = this;
    const charType = character.charId === global.dungeon.cache.characterId ? 'my' : 'other';

    Object.values(character.charAnimations).forEach(animation => {
      animation.alpha = 0;
    });

    let spriteToMove;
    switch (direction) {
      case Direction.NORTH: {
        spriteToMove = character.charAnimations.moveN;
        break;
      }
      case Direction.EAST: {
        spriteToMove = character.charAnimations.moveE;
        break;
      }
      case Direction.SOUTH: {
        spriteToMove = character.charAnimations.moveS;
        break;
      }
      case Direction.WEST: {
        spriteToMove = character.charAnimations.moveW;
        break;
      }
      default: {
        return;
      }
    }

    spriteToMove.alpha = 1;
    spriteToMove.play();

    const moveChar = context.ease.add(character, { x, y }, { duration: 2000, ease: mode });
    moveChar.once('complete', () => {
      if (!character.moving) {
        spriteToMove.stop();
      }

      // @TODO check whether new room has been discovered
      if (charType !== 'other') {
        if (character.moving) {
          character.lookAround(true);
        } else {
          character.stop();
        }
      }
      if (callback) callback();
    });

    character.lastCoords.x = x;
    character.lastCoords.y = y;

    character._syncAnimation(spriteToMove);
  }

  lookAround(start) {
    // Object.values(this.charAnimations).forEach(animation => {
    //   animation.alpha = 0;
    // });
    // this.charAnimations.lookAround.alpha = 1;

    if (start) {
      // this.charAnimations.lookAround.play();
      this.isLookingAround = true;
    } else {
      // this.charAnimations.lookAround.stop();
      this.isLookingAround = false;
      // this.charAnimations.lookAround.alpha = 0;
      // Object.values(this.charAnimations).forEach(animation => {
      //   animation.alpha = 0;
      // });
      // this.charAnimations.moveS.alpha = 1;
      this.stop();
    }
  }

  showName() {
    this.nameTag = new PIXI.Sprite();
    this.nameTag.parentGroup = UI_GROUP;

    // const screenPoint = this.ui.viewport.toScreen(this.x, this.y);
    this.nameTag.anchor.set(0.5, 0);
    // if (screenPoint.y < 100) {
    //   this.nameTag.y = 30;
    // } else {
    this.nameTag.y = -24;
    this.nameTag.alpha = 0.8;
    // }

    // this.current = this.nameTag;

    const info = this.ui.cache.onlineCharacters[this.charId];
    let text = info ? info.characterName : '';
    if (text.length > 19) {
      text = `${text.substr(0, 16)}${ELLIPSIS}`;
    }
    const textSprite = new NameTag(text);
    this.nameTag.addChild(textSprite);
    this.addChild(this.nameTag);
  }
}

export default Character;
