import CombatSide from './CombatSide';

/**
 * An Enumeration for all {@link Deck deck} SideKeys.
 *
 * @type {{DEFENDER: string, ATTACKER: string}}
 */
const DeckSideKey = Object.freeze({
  ATTACKER: 'attacker',
  DEFENDER: 'defender',
  /**
   * @param side {CombatSide} The side of the combat.
   *
   * @return {string} Returns the key for the side of the combat given.
   */
  get(side) {
    if (side === CombatSide.CHAR) {
      return this.ATTACKER;
    }
    return this.DEFENDER;
  },
});

export default DeckSideKey;
