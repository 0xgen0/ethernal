import CombatSide from '../deck/CombatSide';
import DeckType from '../deck/DeckType';
import CombatActor from './CombatActor';
import Deck from '../deck/Deck';
import { characterStatus } from 'lib/cache';
import { get } from 'svelte/store';

/**
 * Creates a monster object for a given combat.
 *
 * @param stats {any} The stats is the monster object in the cache.currentCombat[id] object.
 *
 * @constructor
 */
class CombatMonster extends CombatActor {
  constructor(stats) {
    const attackDeck = new Deck(CombatSide.MONSTER, DeckType.ATTACK);
    const defenseDeck = new Deck(CombatSide.MONSTER, DeckType.DEFENSE);
    super(stats, stats.stats.health, stats.full.health, attackDeck, defenseDeck);

    this.name = stats.name;
    this.image = stats.image;
  }

  // @Override
  update() {
    try {
      const { monster } = global.dungeon.cache.currentCombat;
      this.data = monster;
      this.health = this.data.stats.health;
      this.healthFull = this.data.full.health;
      super.update();
    } catch (e) {
      // We may encounter a situation where the currentCombat is destroyed during a update when the
      //   combat ends. This is not an error and should be ignored.
    }
  }

  // @Override
  getArmorModifier() {
    return this.data.stats.protection ? this.data.stats.protection : 0;
  }

  isDead() {
    return super.isDead() || get(characterStatus) === 'claiming rewards';
  }

  // @Override
  getAttackModifier() {
    return this.data.stats.attack ? this.data.stats.attack : 0;
  }

  // @Override
  getDamageModifier() {
    return this.data.stats.damage ? this.data.stats.damage : 0;
  }

  // @Override
  getDefenseModifier() {
    return this.data.stats.defense ? this.data.stats.defense : 0;
  }

  getTextureFile() {
    return this.image;
  }

  getName() {
    return this.name;
  }
}

export default CombatMonster;
