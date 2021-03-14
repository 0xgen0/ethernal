import CombatSide from '../deck/CombatSide';
import DeckType from '../deck/DeckType';
import CombatActor from './CombatActor';
import Deck from '../deck/Deck';
import { characterStatus } from 'lib/cache';
import { get } from 'svelte/store';


class CombatCharacter extends CombatActor {
  /**
   * Creates an object of a character in combat.
   *
   * @param id The ID of the character in combat.
   * @param characterData {=any} (Optional) The data for the character to set.
   * NOTE: If not provided, the data will be fetched from the cache.
   *
   * @constructor
   */
  constructor(id, characterData) {
    if (characterData == null) {
      const { cache } = global.dungeon;
      const { duels } = cache.currentCombat;
      const { attacker } = duels[id];
      characterData = attacker;
    }

    const { stats } = characterData;
    const { fullHealth } = stats;
    const attackDeck = new Deck(CombatSide.CHAR, DeckType.ATTACK);
    const defenseDeck = new Deck(CombatSide.CHAR, DeckType.DEFENSE);

    super(stats, stats.health, fullHealth, attackDeck, defenseDeck);

    this.id = id;
    this.name = characterData.characterName;
    this.characterData = characterData;
    this.characterClass = stats.characterClass;
  }

  isDead() {
    return super.isDead() || get(characterStatus) === 'just died';
  }

  // @Override
  update() {
    try {
      if (!global.dungeon.cache.currentCombat || !global.dungeon.cache.currentCombat.duels[this.id]) return;
      this.characterData = global.dungeon.cache.currentCombat.duels[this.id].attacker;
      this.data = this.characterData.stats;
      this.health = this.data.health;
      this.healthFull = this.data.fullHealth;
      super.update();
    } catch (e) {
      //
    }
  }

  getTotalDamageInflicted() {
    return this.data.totalInflicted ? this.data.totalInflicted : 0;
  }
}

export default CombatCharacter;
