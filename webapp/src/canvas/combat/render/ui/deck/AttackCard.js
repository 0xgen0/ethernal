import 'pixi.js';
import { ease } from 'pixi-ease';
import CombatSide from '../../../deck/CombatSide';
import UICard from './UICard';
import { SETTINGS } from '../utils/CombatUtils';
import log from 'utils/log';

class AttackCard extends UICard {
  // @Override
  createPixi() {
    super.createPixi();

    const { card } = this;
    if (card) {
      const type = card.getTarget(); // ['health', 'damage', 'defense', 'attack', 'armor']
      log.trace(`type: ${type}`);
      if (type === 'health') {
        this.drawHealthCard();
      } else {
        this.drawCurseCard(type);
      }
    }
  }

  drawHealthCard() {
    const { deck } = this.card;
    let value = this.card.getBonus();
    if (deck.hasCharge()) {
      value += deck.getCharge();
    }

    const topLeftIconTexture = PIXI.utils.TextureCache.icon_hp_s;
    this.topLeftIcon = new PIXI.Sprite(topLeftIconTexture);
    this.topLeftIcon.position.set(7, 8);
    this.topLeftIcon.scale.set(0.25);
    this.contentNormal.addChild(this.topLeftIcon);

    const bottomLeftIconTexture = PIXI.utils.TextureCache.icon_dmg_s;
    this.bottomLeftIcon = new PIXI.Sprite(bottomLeftIconTexture);
    this.bottomLeftIcon.position.set(7, 50);
    this.bottomLeftIcon.scale.set(0.25);
    this.contentNormal.addChild(this.bottomLeftIcon);

    this.drawTriangle();

    const iconTextureFile = `icon_action_hp`;

    // The center sprite to render.
    this.sprite = new PIXI.Sprite(PIXI.utils.TextureCache[iconTextureFile]);
    this.sprite.scale.set(0.24);
    this.sprite.position.set(18, 20);
    this.contentNormal.addChild(this.sprite);

    // Top-Left Text
    this.topLeftText = new PIXI.Text('ATK', {
      fontFamily: 'VT323',
      fontSize: 12,
      lineHeight: 9,
      fill: 0xffffff,
    });
    this.topLeftText.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    this.topLeftText.position.set(15, 8);
    this.contentNormal.addChild(this.topLeftText);

    // Top-Right Text
    this.topRightText = new PIXI.Text(`${value}`, {
      fontFamily: 'VT323',
      fontSize: 20,
      lineHeight: 20,
      align: 'right',
      fill: 0xffffff,
    });
    this.topRightText.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    this.topRightText.anchor.set(1, 0);
    this.topRightText.position.set(54, 6);
    this.contentNormal.addChild(this.topRightText);

    // Bottom-Right Text
    this.bottomRightText = new PIXI.Text(`DMG`, {
      fontFamily: 'VT323',
      fontSize: 12,
      lineHeight: 12,
      align: 'right',
      fill: 0xffffff,
    });
    this.bottomRightText.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    this.bottomRightText.anchor.set(1, 1);
    this.bottomRightText.position.set(54, 62);
    this.contentNormal.addChild(this.bottomRightText);

    // Bottom-Left Text
    this.bottomLeftText = new PIXI.Text(`${this.card.getValue()}`, {
      fontFamily: 'VT323',
      fontSize: 16,
      lineHeight: 16,
      fill: 0xffffff,
    });
    this.bottomLeftText.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    this.bottomLeftText.anchor.set(0, 1);
    this.bottomLeftText.position.set(16, 64);
    this.contentNormal.addChild(this.bottomLeftText);
  }

  /**
   *
   * @param type {string}
   */
  drawCurseCard(type) {
    const { deck } = this.card;
    let value = this.card.getBonus();
    if (deck.hasCharge()) {
      value += deck.getCharge();
    }

    let shortHand;
    if (type === 'attack') {
      shortHand = `atk`;
    } else if (type === 'defense') {
      shortHand = 'def';
    } else if (type === 'damage') {
      shortHand = 'dmg';
    } else if (type === 'protection') {
      shortHand = 'armor';
    }

    // The center sprite to render.
    this.sprite = new PIXI.Sprite(PIXI.utils.TextureCache[`icon_action_${shortHand}`]);
    this.sprite.scale.set(0.24);
    this.sprite.position.set(18, 20);
    this.contentNormal.addChild(this.sprite);

    const topLeftIconTexture = PIXI.utils.TextureCache[`icon_${shortHand}_s`];
    this.topLeftIcon = new PIXI.Sprite(topLeftIconTexture);
    this.topLeftIcon.position.set(7, 8);
    this.topLeftIcon.scale.set(0.25);
    this.contentNormal.addChild(this.topLeftIcon);

    this.drawTriangle();

    // Top-Left Text
    this.topLeftText = new PIXI.Text('CURSE', {
      fontFamily: 'VT323',
      fontSize: 12,
      lineHeight: 9,
      fill: 0xffffff,
    });
    this.topLeftText.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    this.topLeftText.position.set(15, 8);
    this.contentNormal.addChild(this.topLeftText);

    // Top-Right Text
    this.topRightText = new PIXI.Text(`${value}`, {
      fontFamily: 'VT323',
      fontSize: 20,
      lineHeight: 20,
      align: 'right',
      fill: 0xffffff,
    });
    this.topRightText.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    this.topRightText.anchor.set(1, 0);
    this.topRightText.position.set(54, 6);
    this.contentNormal.addChild(this.topRightText);

    this.bottomText = new PIXI.Text(`-${this.card.getValue()} ${shortHand.toUpperCase()}`, {
      fontFamily: 'VT323',
      fontSize: 12,
      lineHeight: 12,
      align: 'center',
      fill: 0xffffff,
    });
    this.bottomText.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    this.bottomText.anchor.set(0.5, 1);
    this.bottomText.position.set(30, 62);
    this.contentNormal.addChild(this.bottomText);
  }

  drawTriangle() {
    const deckSide = CombatSide.CHAR;
    // Create the arrow to be displayed by attack cards. Monsters display the arrow going down.
    //   Character cards point up at the monster.
    this.triangleSprite = new PIXI.Sprite(PIXI.utils.TextureCache['icon_triangle.png']);
    if (deckSide === CombatSide.MONSTER) {
      // Flip the triangle on the x-axis and set it to be the bottom of the card.
      this.triangleSprite.scale.set(2, -2);
      this.triangleSprite.position.set(22, 76);
    } else {
      this.triangleSprite.scale.set(2, 2);
      this.triangleSprite.position.set(22, -14);
    }
    this.triangleSprite.visible = false;
    this.triangleSprite.alpha = 0;
    this.contentNormal.addChild(this.triangleSprite);
  }

  // @Override
  select() {
    super.select();
    if (this.triangleSprite) {
      this.triangleSprite.visible = true;
      this.triangleSprite.tint = 0xffffff;
      ease.add(this.triangleSprite, { alpha: 1 }, { duration: 200 });
    }
  }

  // @Override
  deselect() {
    super.deselect();
    if (this.triangleSprite) {
      this.triangleSprite.tint = 0x999999;
      const hideTriangle = ease.add(this.triangleSprite, { alpha: 0 }, { duration: 200 });
      hideTriangle.on('complete', () => {
        this.triangleSprite.visible = false;
      });
    }
  }
}

export default AttackCard;
