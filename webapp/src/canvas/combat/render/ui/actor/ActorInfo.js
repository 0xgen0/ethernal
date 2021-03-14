import 'pixi.js';
import ActorModifierType from './ActorModifierType';
import ActorModifier from './ActorModifier';
import HealthBar from '../utils/HealthBar';

/**
 * TODO: Document.
 *
 * @param actor {CombatActor} The actor to display information.
 *
 * @constructor
 */
class ActorInfo extends PIXI.Container {
  constructor(actor) {
    super();

    this.actor = actor;

    // TODO: Hook up modifier values from the API.
    //   Hook it up on the CombatActor level and call it here. -Josh.
    this.modifiers = {
      hp: new ActorModifier(ActorModifierType.HP, 0, false),
      armor: new ActorModifier(ActorModifierType.ARMOR, actor.getArmorModifier(), false),
      attack: new ActorModifier(ActorModifierType.ATTACK, actor.getAttackModifier(), false),
      damage: new ActorModifier(ActorModifierType.DAMAGE, actor.getDamageModifier(), false),
      defense: new ActorModifier(ActorModifierType.DEFENSE, actor.getDefenseModifier(), false),
    };

    this.modifiers.hp.position.x = 0;
    this.modifiers.armor.position.x = 98 + 1;
    this.modifiers.defense.position.x = 114 + 2;
    this.modifiers.attack.position.x = 130 + 3;
    this.modifiers.damage.position.x = 146 + 4;

    this.addChild(
      this.modifiers.hp,
      this.modifiers.armor,
      this.modifiers.attack,
      this.modifiers.damage,
      this.modifiers.defense,
    );

    this.healthBar = new HealthBar(78, 14, actor.getHealth(), actor.getFullHealth());
    this.healthBar.position.x = 17;
    this.addChild(this.healthBar);
  }

  update() {
    const health = this.actor.getHealth();
    this.healthBar.setHealth(health);

    if (this.modifiers) {
      if (this.modifiers.armor) {
        this.modifiers.armor.setModifier(this.actor.getArmorModifier());
      }
      if (this.modifiers.attack) {
        this.modifiers.attack.setModifier(this.actor.getAttackModifier());
      }
      if (this.modifiers.damage) {
        this.modifiers.damage.setModifier(this.actor.getDamageModifier());
      }
      if (this.modifiers.defense) {
        this.modifiers.defense.setModifier(this.actor.getDefenseModifier());
      }
    }
  }
}

export default ActorInfo;
