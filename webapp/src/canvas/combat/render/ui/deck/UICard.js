import 'pixi.js';
import { ease } from 'pixi-ease';
import CombatSide from '../../../deck/CombatSide';
import DeckType from '../../../deck/DeckType';

const COLOR_CHARGE = 0x58f898;
const COLOR_CURSE = 0xde3d37;

class UICard extends PIXI.Container {
  /**
   * @param uiDeck {UIDeck}
   * @param card {Card}
   * @param placeholder {=boolean}
   */
  constructor(uiDeck, card, placeholder) {
    super();

    if (placeholder === null || placeholder === undefined) {
      placeholder = false;
    }

    this.placeholder = placeholder;
    this.uiDeck = uiDeck;

    this.setCard(card);
  }

  createPixi() {
    this._width = 60;
    this._height = 64;
    this.alpha = 1;
    this.hitArea = new PIXI.Rectangle(0, 0, this._width, this._height);
    this.selected = false;

    this.fill = new PIXI.Graphics();
    this.fill.beginFill(0xffffff);
    this.fill.drawRect(0, 0, this._width, this._height);
    this.fill.endFill();
    this.fill.tint = 0x000000;
    this.addChild(this.fill);

    this._c = new PIXI.Container();
    this.addChild(this._c);

    this.content = new PIXI.Container();
    this.contentNormal = new PIXI.Container();
    this.contentCharging = new PIXI.Container();

    this.content.alpha = this.placeholder ? 0 : 1;
    this.content.visible = !this.placeholder;

    const textCharge = new PIXI.Text('USE CARD\r\nTO CHARGE', {
      fontFamily: 'VT323',
      fontSize: 11,
      lineHeight: 12,
      fill: 0x58f898,
      align: 'center',
    });
    textCharge.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    textCharge.anchor.set(0.5, 0.5);
    textCharge.position.set(30, 32);
    textCharge.scale.set(0.95, 1);
    this.contentCharging.addChild(textCharge);

    if (!this.card || this.card.deck.side === CombatSide.MONSTER) {
      this.drawBackground();
    } else {
      this.drawBorder();
    }

    this._c.addChild(this.content);

    // add skull
    if (!this.card || this.card.deck.side === CombatSide.MONSTER) {
      this.skullSprite = new PIXI.Sprite(PIXI.utils.TextureCache['icon_skull_s.png']);
      this.skullSprite.position.set(34, 36);
      this._c.addChild(this.skullSprite);
    }
  }

  destroyPixi() {
    if (this.background) {
      this.removeChild(this.background);
      this.background.destroy();
      this.background = null;
    }
    if (this.border) {
      this.removeChild(this.border);
      this.border.destroy();
      this.border = null;
    }
    if (this.skullSprite) {
      this.removeChild(this.skullSprite);
      this.skullSprite = null;
    }
    if (this.sprite) {
      this.contentNormal.removeChild(this.sprite);
      this.sprite = null;
    }
    if (this.topLeftText) {
      this.contentNormal.removeChild(this.topLeftText);
      this.topLeftText.destroy();
      this.topLeftText = null;
    }
    if (this.topRightText) {
      this.contentNormal.removeChild(this.topRightText);
      this.topRightText.destroy();
      this.topRightText = null;
    }
    if (this.bottomLeftText) {
      this.contentNormal.removeChild(this.bottomLeftText);
      this.bottomLeftText.destroy();
      this.bottomLeftText = null;
    }
    if (this.bottomRightText) {
      this.bottomRightText.destroy();
      this.bottomRightText = null;
    }
    if (this.topLeftIcon) {
      this.contentNormal.removeChild(this.topLeftIcon);
      this.topLeftIcon.destroy();
      this.topLeftIcon = null;
    }
    if (this.bottomLeftIcon) {
      this.contentNormal.removeChild(this.bottomLeftIcon);
      this.bottomLeftIcon.destroy();
      this.bottomLeftIcon = null;
    }
    if (this.bottomText) {
      this.contentNormal.removeChild(this.bottomText);
      this.bottomText.destroy();
      this.bottomText = null;
    }
    if (this.skullSprite) {
      this.removeChild(this.skullSprite);
      this.skullSprite.destroy();
      this.skullSprite = null;
    }
  }

  /**
   *
   * @param used {=boolean} (Optional) Forces the render to be for used or unused, regardless of the state of the card.
   * NOTE: This is used for placeholder cards.
   */
  update(used) {
    // Set the proper group of content based on the charging state of the card.
    this.content.removeChildren();

    if (this.isCharging()) {
      this.content.addChild(this.contentCharging);
    } else {
      this.content.addChild(this.contentNormal);
    }
    if (used == null) {
      used = this.card && this.card.isUsed();
    }

    const { deck } = this.card;
    let charge = 0;
    let curseTop = 0;
    let curseBottom = 0;
    if (deck.type === DeckType.ATTACK) {
      charge += this.uiDeck.getChargeModifier();
      let actor;
      if (deck.side === CombatSide.CHAR) {
        actor = this.uiDeck.uiCombat.combat.character;
      } else if (deck.side === CombatSide.MONSTER) {
        actor = this.uiDeck.uiCombat.combat.monster;
      }
      charge += actor.getCharge();
      curseTop += actor.getAttackModifier();
      curseBottom += actor.getDamageModifier();
    } else if (deck.type === DeckType.DEFENSE) {
      let actor;
      if (deck.side === CombatSide.CHAR) {
        actor = this.uiDeck.uiCombat.combat.character;
      } else if (deck.side === CombatSide.MONSTER) {
        actor = this.uiDeck.uiCombat.combat.monster;
      }
      curseTop += actor.getDefenseModifier();
      curseBottom += actor.getArmorModifier();
    }

    const originalTopRightValue = this.card.getBonus();
    let modifiedTopRightValue = originalTopRightValue + charge + curseTop;
    let topRightColor = used ? 0x666666 : 0xffffff;
    if (modifiedTopRightValue < 0) {
      modifiedTopRightValue = 0;
    }
    if (charge || modifiedTopRightValue > originalTopRightValue) {
      topRightColor = COLOR_CHARGE;
    } else if (modifiedTopRightValue < originalTopRightValue) {
      topRightColor = COLOR_CURSE;
    }
    if (this.topRightText) {
      this.topRightText.text = modifiedTopRightValue;
    }

    const originalBottomLeftValue = this.card.getValue();
    let modifiedBottomLeftValue = originalBottomLeftValue + curseBottom;
    let bottomLeftColor = used ? 0x666666 : 0xffffff;
    if (modifiedBottomLeftValue < 0) {
      modifiedBottomLeftValue = 0;
    }
    if (modifiedBottomLeftValue < originalBottomLeftValue) {
      bottomLeftColor = COLOR_CURSE;
    }
    if (this.bottomLeftText) {
      this.bottomLeftText.text = modifiedBottomLeftValue;
    }

    if (used) {
      if (this.background) {
        this.background.tint = 0x090909;
      }
      if (this.border) {
        this.border.tint = 0x3b3b3b;
      }
      if (this.skullSprite) {
        this.skullSprite.tint = 0x666666;
      }
      if (this.sprite) {
        this.sprite.tint = 0x666666;
      }
      if (this.topLeftText) {
        this.topLeftText.tint = 0x666666;
      }
      if (this.topRightText) {
        this.topRightText.tint = topRightColor;
      }
      if (this.bottomLeftText) {
        this.bottomLeftText.tint = bottomLeftColor;
      }
      if (this.bottomRightText) {
        this.bottomRightText.tint = 0x666666;
      }
      if (this.topLeftIcon) {
        this.topLeftIcon.tint = 0x666666;
      }
      if (this.bottomLeftIcon) {
        this.bottomLeftIcon.tint = 0x666666;
      }
      if (this.bottomText) {
        this.bottomText.tint = 0x666666;
      }
    } else {
      if (this.background) {
        this.background.tint = 0x1a1a1a;
      }
      if (this.border) {
        this.border.tint = 0xc4c4c4;
      }
      if (this.skullSprite) {
        this.skullSprite.tint = 0xffffff;
      }
      if (this.sprite) {
        this.sprite.tint = 0xffffff;
      }
      if (this.topLeftText) {
        this.topLeftText.tint = 0xffffff;
      }
      if (this.topRightText) {
        this.topRightText.tint = topRightColor;
      }
      if (this.bottomLeftText) {
        this.bottomLeftText.tint = bottomLeftColor;
      }
      if (this.bottomRightText) {
        this.bottomRightText.tint = 0x787878;
      }
      if (this.bottomText) {
        this.bottomText.tint = 0x787878;
      }
      if (this.topLeftIcon) {
        this.topLeftIcon.tint = 0xffffff;
      }
      if (this.bottomLeftIcon) {
        this.bottomLeftIcon.tint = 0x787878;
      }
    }
  }

  /** @private */
  drawBackground() {
    this.background = new PIXI.Graphics();
    this.background.beginFill(0xffffff);
    this.background.drawRect(0, 0, this._width, this._height);
    this.background.endFill();
    this._c.addChild(this.background);
  }

  /** @private */
  drawBorder() {
    const width = 60;
    const height = 64;

    this.border = new PIXI.Graphics();
    this.border.lineStyle(1, 0xffffff);

    // Top border.
    this.border.moveTo(1.5, 0.5);
    this.border.lineTo(width - 0.5, 0.5);

    // Right border.
    this.border.moveTo(width - 0.5, 0.5);
    this.border.lineTo(width - 0.5, height - 1.5);

    // Bottom border.
    this.border.moveTo(1.5, height - 0.5);
    this.border.lineTo(width - 0.5, height - 0.5);

    // Left border.
    this.border.moveTo(0.5, 0.5);
    this.border.lineTo(0.5, height - 1.5);

    this.border.closePath();
    this._c.addChild(this.border);
  }

  enable() {
    if (this.card.deck.side === CombatSide.CHAR) {
      this.interactive = true;
      this.buttonMode = true;
    }
    this.enabled = true;
    this.update();
  }

  disable() {
    if (this.card.deck.side === CombatSide.CHAR) {
      this.interactive = false;
      this.buttonMode = false;
    }
    this.selected = false;
    this.enabled = false;
    this.update();
  }

  select() {
    this.selected = true;

    ease.add(this, { y: -20 }, { duration: 200 });
    this.update();

    // if (this.sqrSprite) {
    //   this.sqrSprite.tint = 0xffffff;
    // }
  }

  deselect() {
    this.selected = false;
    ease.add(this, { y: 0 }, { duration: 200 });
    this.update();
  }

  isCharging() {
    return this.card.isCharging();
  }

  setCharging(flag) {
    this.card.setCharging(flag);
    this.update();
  }

  /**
   * @param card {Card}
   */
  setCard(card) {
    this.card = card;
    this.destroyPixi();
    this.createPixi();
    this.update();
  }

  animateUse(duration) {
    if (duration === null || duration === undefined) {
      duration = 400;
    }

    if (this.border) {
      ease.add(this.border, { alpha: 0.4 }, { duration });
    }
    return ease.add(this._c, { alpha: 0.4 }, { duration });
  }

  animateUnused(duration) {
    if (duration === null || duration === undefined) {
      duration = 400;
    }

    if (this.border) {
      ease.add(this.border, { alpha: 1 }, { duration });
    }
    return ease.add(this._c, { alpha: 1 }, { duration });
  }

  hide() {
    this.visible = false;
  }
}

export default UICard;
