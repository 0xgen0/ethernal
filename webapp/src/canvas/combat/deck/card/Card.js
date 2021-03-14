import Dirtable from '../../../utils/Dirtable';

/**
 * TODO: Document.
 */
class Card extends Dirtable {
  /**
   * Creates a standard card object for interpretation for combat.
   *
   * @param deck {Deck} The deck that the card is in.
   * @param index {number} The offset in the deck.
   * @param side {string} The side that the card represents. ('monster', 'char')
   * @param type {string}
   * @param data {any} The server-data for the card.
   *
   * @constructor
   */
  constructor(deck, index, side, type, data) {
    super();

    // Field(s)
    this.deck = deck;
    this.index = index;
    this.side = side;
    this.type = type;
    this.data = data;
    this.target = null;
    this.selected = false;
  }

  /** @return {boolean|void} Returns 'true' if the card is used. */
  isUsed() {
    return this.data.used;
  }

  /** @return {boolean} Returns 'true' if the Card is selected for use. */
  isSelected() {
    return this.selected;
  }

  /**
   * @return {number}
   */
  getValue() {
    return this.data.value ? this.data.value : 0;
  }

  /**
   * @return {number}
   */
  getBonus() {
    return this.data.bonus ? this.data.bonus : 0;
  }

  getTarget() {
    return this.data.target;
  }

  isCharging() {
    return this.data.charge;
  }

  setCharging(flag) {
    if (flag === this.data.charge) {
      return;
    }

    this.data.charge = flag;
  }

  isCursed() {
    return this.data.cursed;
  }
}

export default Card;
