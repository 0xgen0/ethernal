import 'pixi.js';
import { ease } from 'pixi-ease';
import HealthBar from '../utils/HealthBar';
import ActorModifier from './ActorModifier';
import ActorModifierType from './ActorModifierType';
import LineHealthBar from '../utils/LineHealthBar';
import { DamageAnimationType, flash } from '../../ActorAnimations';
import CharacterClass from '../../../../map/render/util/CharacterClass';

export const OtherInfoSize = {
  SMALL: 'small',
  LARGE: 'large',
};

export class OtherInfo extends PIXI.Container {
  /**
   *
   * @param actor
   * @param size {string}
   */
  constructor(actor, size) {
    super();

    // Flag to prevent attack animation on spawning the object.
    this.new = true;

    this.actor = actor;
    this.animations = PIXI.Loader.shared.resources.sheet.spritesheet.animations;

    let scale = 0.5;
    let profileTexture = PIXI.utils.TextureCache[`ui_combat_profile.png`];
    if (actor.characterClass === CharacterClass.MAGE) {
      profileTexture = PIXI.utils.TextureCache.portrait_wiz;
      scale /= 5.1;
    } else if (actor.characterClass === CharacterClass.EXPLORER) {
      profileTexture = PIXI.utils.TextureCache.portrait_adv;
      scale /= 5.1;
    } else if (actor.characterClass === CharacterClass.BARBARIAN) {
      profileTexture = PIXI.utils.TextureCache.portrait_bar;
      scale /= 5.1;
    } else if (actor.characterClass === CharacterClass.WARRIOR) {
      profileTexture = PIXI.utils.TextureCache.portrait_war;
      scale /= 5.1;
    }

    this.profile = new PIXI.Sprite(profileTexture);
    this.profile.scale.set(scale);
    this.addChild(this.profile);

    this.damageIcon = new PIXI.Sprite(PIXI.utils.TextureCache.modifier_icon_dmg_s);
    this.addChild(this.damageIcon);

    this.damageLabel = new PIXI.Text(`${this.actor.getTotalDamageInflicted()}`, {
      fontFamily: 'Space Mono',
      fontSize: 8,
      lineHeight: 12,
      fill: 0xffffff,
    });
    this.damageLabel.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    this.addChild(this.damageLabel);

    this.setSize(size);
  }

  destroy(options) {
    if (this.healthBar) {
      this.removeChild(this.healthBar);
      this.healthBar.destroy({ children: true, texture: false, baseTexture: false });
      this.healthBar = null;
    }
    if (this.nameTag) {
      this.removeChild(this.nameTag);
      this.nameTag.destroy();
      this.nameTag = null;
    }
    if (this.modifiers) {
      if (this.modifiers.hp) {
        this.removeChild(this.modifiers.hp);
        this.modifiers.hp.destroy({ children: true, texture: false, baseTexture: false });
        this.modifiers.hp = null;
      }
      if (this.modifiers.attack) {
        this.removeChild(this.modifiers.attack);
        this.modifiers.attack.destroy({ children: true, texture: false, baseTexture: false });
        this.modifiers.attack = null;
      }
    }
    if (this.damageIcon) {
      this.damageIcon.destroy();
      this.damageIcon = null;
    }
    if (this.profile) {
      this.profile.destroy();
      this.profile = null;
    }
    if (this.damageLabel) {
      this.damageLabel.destroy({ children: false, texture: true, baseTexture: true });
      this.damageLabel = null;
    }
    this.animations = null;
    super.destroy(options);
  }

  update() {
    try {
      this.actor.update();
      if (this.healthBar) {
        this.healthBar.setHealth(this.getHealth());
      }
      if (this.damageLabel) {
        this.damageLabel.text = `${this.actor.getTotalDamageInflicted()}`;
      }
    } catch (e) {
      // Ignore.
    }
  }

  getHealth() {
    return this.actor.getHealth();
  }

  getFullHealth() {
    return this.actor.getFullHealth();
  }

  setSize(size) {
    this.size = size;
    if (this.size === OtherInfoSize.SMALL) {
      this.drawSmall();
    } else if (this.size === OtherInfoSize.LARGE) {
      this.drawLarge();
    }
    this.update();
  }

  /* Destroy secondary elements that are different or not displayed when switching sizes. */
  resize() {
    if (this.healthBar) {
      this.removeChild(this.healthBar);
      this.healthBar.destroy({ children: true, texture: false, baseTexture: false });
      this.healthBar = null;
    }
    if (this.nameTag) {
      this.removeChild(this.nameTag);
      this.nameTag.destroy();
      this.nameTag = null;
    }
    if (this.modifiers) {
      if (this.modifiers.hp) {
        this.removeChild(this.modifiers.hp);
        this.modifiers.hp.destroy({ children: true, texture: false, baseTexture: false });
        this.modifiers.hp = null;
      }
      if (this.modifiers.attack) {
        this.removeChild(this.modifiers.attack);
        this.modifiers.attack.destroy({ children: true, texture: false, baseTexture: false });
        this.modifiers.attack = null;
      }
    }
  }

  drawSmall() {
    this.resize();

    this.profile.position.set(0, 12);

    this.healthBar = new LineHealthBar(this.getHealth(), this.getFullHealth());
    this.healthBar.position.set(0, 33);
    this.addChild(this.healthBar);

    this.damageIcon.position.set(0, 0);
    this.damageLabel.position.set(this.damageIcon.position.x + this.damageIcon.width + 2, 1);
  }

  drawLarge() {
    this.resize();

    const fontOptions1 = {
      fontFamily: 'Space Mono',
      fontWeight: 'bold',
      fontSize: 7,
      lineHeight: 10,
      fill: 0xffffff,
    };

    const fontOptions2 = {
      fontFamily: 'Space Mono',
      fontSize: 7,
      lineHeight: 10,
      align: 'right',
      fill: 0x6b6b6b,
    };

    this.profile.position.set(0, 0);

    this.modifiers = {
      hp: new ActorModifier(ActorModifierType.HP, 0, false, 10, 10),
      attack: new ActorModifier(ActorModifierType.ATTACK, 0, false, 14, 14),
    };

    this.modifiers.hp.position.set(1, 22);
    this.addChild(this.modifiers.hp);

    this.modifiers.attack.visible = false;
    this.modifiers.attack.position.set(40, -12);

    const triangleSprite = new PIXI.Sprite(PIXI.utils.TextureCache['icon_triangle.png']);
    triangleSprite.position.set(4, -6);
    this.modifiers.attack.addChild(triangleSprite);
    this.addChild(this.modifiers.attack);

    this.healthBar = new HealthBar(65, 11, this.getHealth(), this.getFullHealth(), fontOptions1, fontOptions2);
    this.healthBar.position.set(15, 22);
    this.addChild(this.healthBar);

    this.nameTag = new PIXI.Text(`${this.actor.name}`, {
      fontFamily: 'Space Mono',
      fontSize: 8,
      lineHeight: 12,
      fill: 0xffffff,
    });
    this.nameTag.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    this.nameTag.position.set(23, 7);
    this.addChild(this.nameTag);

    this.damageIcon.position.set(24 + this.nameTag.width, 6);

    this.damageLabel.position.set(this.damageIcon.position.x + this.damageIcon.width + 1, 7);
  }

  /**
   * @param type {string}
   * @param damage {number} The damage value to render.
   */
  renderDamage(type, damage, callback) {
    this.setAttackMode(() => {
      const damageText = new PIXI.Text(`-${damage}`, {
        fontFamily: 'VT323',
        fontSize: 24,
        fill: 0xde3d37,
        align: 'center',
      });
      damageText.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
      damageText.alpha = 0;
      damageText.y = 5;
      damageText.position.x = this.size === OtherInfoSize.LARGE ? 40 : 1;

      const dmgAnimation = new PIXI.AnimatedSprite(this.animations.fx_attack_slash);
      dmgAnimation.anchor.set(0.5);
      dmgAnimation.scale.set(0.5);

      this.addChild(dmgAnimation, damageText);
      dmgAnimation.animationSpeed = 0.25;
      dmgAnimation.gotoAndPlay(0);
      dmgAnimation.loop = false;
      dmgAnimation.onComplete = () => {
        dmgAnimation.alpha = 0;
        flash(DamageAnimationType.DAMAGE, this, damageText, () => {
          if (callback) callback();
        });

        let newHealth = this.healthBar.health - damage;
        if (newHealth < 0) {
          newHealth = 0;
        }
        this.healthBar.setHealth(newHealth);
      };
    });
  }

  setAttackMode(callback) {
    ease.add(this, { y: -20 }, { duration: 600 }).on('complete', () => {
      if (callback) callback();
    });

    if (this.modifiers && this.modifiers.attack) {
      this.modifiers.attack.visible = true;
    }
  }

  setIdleMode() {
    ease.add(this, { y: 0 }, { duration: 600 });
    if (this.modifiers && this.modifiers.attack) {
      this.modifiers.attack.visible = false;
    }
  }
}
