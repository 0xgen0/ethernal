import DeckType from './DeckType';
import CardTarget from './card/CardTarget';
import DeckSideKey from './DeckSideKey';
import Card from './card/Card';
import AttackCard from './card/AttackCard';
import Dirtable from '../../utils/Dirtable';

/**
 * TODO: Document.
 *
 * @param characterId {string}
 * @param sideKey {string}
 * @param typeKey {string}
 *
 * @return {any} Returns the deck for the given identifiers.
 *
 * @static
 */
function getDeck(characterId, sideKey, typeKey) {
  const duel = global.dungeon.cache.currentCombat.duels[characterId];
  return duel ? duel.decks[sideKey][typeKey] : [];
}

class Deck extends Dirtable {
  /**
   * Creates a deck object to store data on a deck of cards for a side in a combat.
   *
   * @param side {CombatSide} The side of the combat the deck belongs to.
   * @param type {DeckType}
   *
   * @constructor
   */
  constructor(side, type) {
    super();

    this.actor = null;
    this.side = side;
    this.type = type;
    this.typeKey = `${type}s`;
    this.sideKey = DeckSideKey.get(side);

    const cards = getDeck(global.dungeon.cache.characterId, this.sideKey, this.typeKey);

    this.cards = cards.map((data, index) => {
      let card;

      if (type === DeckType.ATTACK) {
        card = new AttackCard(this, index, side, CardTarget.HP, data);
      } else {
        card = new Card(this, index, side, type, data);
      }

      return card;
    });
  }

  // @Override
  isDirty() {
    return this.dirty || this.cards.some(card => card.isDirty()).length !== 0;
  }

  updateFromCache() {
    const cards = getDeck(global.dungeon.cache.characterId, this.sideKey, this.typeKey);
    cards.forEach((data, index) => {
      if (data && this.cards[index]) {
        this.cards[index].data = data;
      }
    });
  }

  hasCharge() {
    return this.actor && this.actor.hasCharge();
  }

  getCharge() {
    return this.actor && this.actor.getCharge();
  }
}

export default Deck;

/*
Card data entry:
  {
     id: {number},
     value: {number},
     used: {boolean},
     element: {string},
     elemValue: {number},
     bonus: {number},
  }
*/
