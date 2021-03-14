import 'pixi.js';

import { actionsText } from 'data/text';

import ActorInfo from './ActorInfo';
import TextButton from '../utils/TextButton';
import { DamageAnimationType, flash } from '../../ActorAnimations';
import AttackType from '../../../AttackType';
import CharacterClass from '../../../../map/render/util/CharacterClass';

class CharacterInfo extends ActorInfo {
  constructor(actor) {
    super(actor);

    this.animations = PIXI.Loader.shared.resources.sheet.spritesheet.animations;
    this.curseAnimations = PIXI.Loader.shared.resources.fx_curses.spritesheet.animations;

    let scale = 1;
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
    this.profile.scale.set(scale, scale);
    this.addChild(this.profile);

    this.healthBar.position.x += 46;
    this.healthBar.position.y = 26;

    Object.keys(this.modifiers).forEach(key => {
      const modifier = this.modifiers[key];
      modifier.position.x += 46;
      modifier.position.y = 26;
    });

    this.nameTag = new PIXI.Text(`${this.actor.name}`, {
      fontFamily: 'Space Mono',
      fontSize: 10,
      lineHeight: 15,
      fill: 0xffffff,
    });
    this.nameTag.position.set(47, 4);
    this.nameTag.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    this.addChild(this.nameTag);

    this.runButtonText = new PIXI.Text(actionsText.run, {
      fontFamily: 'Space Mono',
      fontSize: 10,
      lineHeight: 15,
      align: 'center',
      fill: 0xffffff,
    });
    // this.runButtonText.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    this.runButton = new TextButton(new PIXI.Rectangle(156 + 46 + 14 + 40, 0, 40, 40), this.runButtonText);
    this.runButtonText.position.x += 1;
    this.runButtonText.position.y += 2;
    this.addChild(this.runButton);
  }

  // update() {
  // const health = this.actor.getHealth();
  // if (health < this.healthBar.health) {
  //   this.renderDamage(this.healthBar.health - health);
  // }
  // this.healthBar.setHealth(health);
  // }

  /**
   * @param type {string}
   * @param damage {number} The damage value to render.
   */
  renderDamage(type, damage) {
    let damageFont = {
      fontFamily: 'VT323',
      fontSize: 24,
      fill: 0xde3d37,
      align: 'center',
    };

    if (type !== AttackType.HP) {
      damageFont = {
        fontFamily: 'Space Mono',
        fontSize: 10,
        lineHeight: 15,
        fontWeight: 'bold',
        align: 'center',
        fill: 0xde3d37,
      };
    }

    const damageText = new PIXI.Text(`-${damage}`, damageFont);
    damageText.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    damageText.alpha = 0;
    if (type === AttackType.HP) {
      damageText.position.set(122, 0);
      this.addChild(damageText);
    } else if (type === AttackType.ARMOR) {
      damageText.position.set(6, 0);
      damageText.anchor.set(0.5, 1);
      this.modifiers.armor.addChild(damageText);
      this.modifiers.armor.alpha = 0.4;
    } else if (type === AttackType.ATTACK) {
      damageText.position.set(6, 0);
      damageText.anchor.set(0.5, 1);
      this.modifiers.attack.addChild(damageText);
      this.modifiers.attack.alpha = 0.4;
    } else if (type === AttackType.DAMAGE) {
      damageText.position.set(6, 0);
      damageText.anchor.set(0.5, 1);
      this.modifiers.damage.addChild(damageText);
      this.modifiers.damage.alpha = 0.4;
    } else if (type === AttackType.DEFENSE) {
      damageText.position.set(6, 0);
      damageText.anchor.set(0.5, 1);
      this.modifiers.defense.addChild(damageText);
      this.modifiers.defense.alpha = 0.4;
    }

    this.profile.alpha = 0.4;

    let anim;
    if (type === AttackType.HP) {
      anim = this.animations.fx_attack_slash;
    } else if (type === AttackType.ATTACK) {
      anim = this.curseAnimations.attack_curse;
    } else if (type === AttackType.ARMOR) {
      anim = this.curseAnimations.armor_curse;
    } else if (type === AttackType.DAMAGE) {
      anim = this.curseAnimations.damage_curse;
    } else if (type === AttackType.DEFENSE) {
      anim = this.curseAnimations.defense_curse;
    } else {
      anim = this.animations.fx_attack_slash;
    }

    const dmgAnimation = new PIXI.AnimatedSprite(anim);
    dmgAnimation.anchor.set(0.5);
    dmgAnimation.scale.set(0.5);
    dmgAnimation.position.set(20, 20);

    this.addChild(dmgAnimation);
    dmgAnimation.animationSpeed = 0.25;
    dmgAnimation.gotoAndPlay(0);
    dmgAnimation.loop = false;
    dmgAnimation.onComplete = () => {
      dmgAnimation.alpha = 0;
      flash(DamageAnimationType.DAMAGE, this.profile, null);

      if (type === AttackType.HP) {
        flash(DamageAnimationType.DAMAGE, null, damageText);
        let newHealth = this.actor.getHealth();
        if (newHealth < 0) newHealth = 0;
        this.healthBar.setHealth(newHealth);
      } else if (type === AttackType.ARMOR) {
        flash(DamageAnimationType.DAMAGE, this.modifiers.armor, damageText);
      } else if (type === AttackType.ATTACK) {
        flash(DamageAnimationType.DAMAGE, this.modifiers.attack, damageText);
      } else if (type === AttackType.DAMAGE) {
        flash(DamageAnimationType.DAMAGE, this.modifiers.damage, damageText);
      } else if (type === AttackType.DEFENSE) {
        flash(DamageAnimationType.DAMAGE, this.modifiers.defense, damageText);
      }
    };
  }
}

export default CharacterInfo;
