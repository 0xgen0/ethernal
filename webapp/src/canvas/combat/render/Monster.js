import 'pixi.js';
import { flash, DamageAnimationType } from './ActorAnimations';
import AnimationGroup from './animation/AnimationGroup';
import AttackType from '../AttackType';

class Monster extends PIXI.Container {
  /**
   * @param combatRenderer {CombatRenderer}
   * @param monster {CombatMonster} The monster to render.
   *
   * @constructor
   */
  constructor(combatRenderer, monster) {
    super();

    this.combatRenderer = combatRenderer;
    this.actor = monster;

    const nameLabel = new PIXI.Text(monster.getName(), {
      fontFamily: 'Space Mono',
      fontSize: 16,
      lineHeight: 24,
      fill: 0xffffff,
      align: 'center',
    });
    nameLabel.anchor.set(0.5, 0);
    this.addChild(nameLabel);

    this.monsterSprite = new PIXI.Sprite(PIXI.utils.TextureCache[monster.getTextureFile()]);
    this.monsterSprite.anchor.set(0.5);
    this.monsterSprite.scale.set(2.5);
    this.monsterSprite.y = 120;
    this.addChild(this.monsterSprite);

    this.animations = PIXI.Loader.shared.resources.sheet.spritesheet.animations;
    this.curseAnimations = PIXI.Loader.shared.resources.fx_curses.spritesheet.animations;

    this.animationGroup = new AnimationGroup(this.monsterSprite);
    const resetProfile = {
      type: 'reset',
      ticks: 20,
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
    };
    this.animationGroup.setReset(resetProfile);
    this.animationGroup.add(1, resetProfile);
    this.animationGroup.add(4, { type: 'hop', duplicate: true, ticks: 30, limit: 50 });
    this.animationGroup.add(5, { type: 'none', ticks: 20 });
  }

  update() {
    this.animationGroup.update();
  }

  /**
   * @param type {string}
   * @param damage {number} The damage value to render.
   */
  renderDamage(type, damage) {
    const info = this.combatRenderer.monsterInfo;

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
    damageText.alpha = 0;
    damageText.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;

    if (type === AttackType.HP) {
      damageText.y = 0;
      this.addChild(damageText);
    } else if (type === AttackType.ARMOR) {
      damageText.position.set(6, 0);
      damageText.anchor.set(0.5, 1);
      info.modifiers.armor.addChild(damageText);
      info.modifiers.armor.alpha = 0.4;
    } else if (type === AttackType.ATTACK) {
      damageText.position.set(6, 0);
      damageText.anchor.set(0.5, 1);
      info.modifiers.attack.addChild(damageText);
      info.modifiers.attack.alpha = 0.4;
    } else if (type === AttackType.DAMAGE) {
      damageText.position.set(6, 0);
      damageText.anchor.set(0.5, 1);
      info.modifiers.damage.addChild(damageText);
      info.modifiers.damage.alpha = 0.4;
    } else if (type === AttackType.DEFENSE) {
      damageText.position.set(6, 0);
      damageText.anchor.set(0.5, 1);
      info.modifiers.defense.addChild(damageText);
      info.modifiers.defense.alpha = 0.4;
    }

    this.monsterSprite.alpha = 0.4;

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
    dmgAnimation.anchor.set(0.5, 0.5);
    dmgAnimation.scale.set(1.5);
    dmgAnimation.position.set(0, Math.floor(70 + this.monsterSprite.height / 2));

    this.addChild(dmgAnimation);
    dmgAnimation.animationSpeed = 0.25;
    dmgAnimation.gotoAndPlay(0);
    dmgAnimation.loop = false;
    dmgAnimation.onComplete = () => {
      dmgAnimation.alpha = 0;
      flash(DamageAnimationType.DAMAGE, this.monsterSprite, null);

      if (type === AttackType.HP) {
        flash(DamageAnimationType.DAMAGE, null, damageText);
        const { healthBar } = this.combatRenderer.monsterInfo;
        let newHealth = this.actor.getHealth();
        if (newHealth < 0) {
          newHealth = 0;
        }
        healthBar.setHealth(newHealth);
      } else if (type === AttackType.ARMOR) {
        flash(DamageAnimationType.DAMAGE, info.modifiers.armor, damageText);
      } else if (type === AttackType.ATTACK) {
        flash(DamageAnimationType.DAMAGE, info.modifiers.attack, damageText);
      } else if (type === AttackType.DAMAGE) {
        flash(DamageAnimationType.DAMAGE, info.modifiers.damage, damageText);
      } else if (type === AttackType.DEFENSE) {
        flash(DamageAnimationType.DAMAGE, info.modifiers.defense, damageText);
      }
    };
  }
}

export default Monster;
