import Card from './Card';

/**
 * TODO: Document.
 */
class AttackCard extends Card {
  /**
   * Creates a {@link Card card} object for {@link CardType.ATTACK attack} cards with a given {@link CardTarget target}.
   *
   * @param deck {Deck}
   * @param index {number} The offset in the deck.
   * @param side {CombatSide} The side that the card represents. ('monster', 'char')
   * @param target {CardTarget} The target for the card to attack. ('HP', etc)
   * @param data {any} The server-data for the card.
   *
   * @constructor
   */
  constructor(deck, index, side, target, data) {
    super(deck, index, side, 'attack', data);
    this.target = target;
  }
}

export default AttackCard;
