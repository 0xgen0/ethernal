import 'pixi.js';
import { ease } from 'pixi-ease';
import DeckType from '../../../deck/DeckType';
import AttackCard from './AttackCard';
import DefenseCard from './DefenseCard';

/**
 * TODO: Position card when selected.
 * TODO: Switch pointer event to selecting attack card if applied after selection.
 */
class UIDeck extends PIXI.Container {
  /**
   * @param uiCombat {CombatRenderer}
   * @param deck
   */
  constructor(uiCombat, deck) {
    super();

    this.uiCombat = uiCombat;

    this._width = deck.cards.length * 72 - 12;
    this.selected = -1;
    this.cards = [];
    this.deck = deck;

    this.chargeModifier = 0;

    this.alpha = 0;
    this.visible = false;
    this.applied = false;

    this.createCards();
  }

  update() {
    this.cards.forEach(card => {
      card.update();
    });
  }

  createCards() {
    const deckType = this.deck.type;

    this.deck.cards.forEach((card, index) => {
      const uiCard = deckType === DeckType.ATTACK ? new AttackCard(this, card) : new DefenseCard(this, card);
      this.cards.push(uiCard);

      // Handle click events here.
      this.cards[index].on('pointerdown', () => {
        if (index === this.selected && this.getActiveAttackCardCount() > 1) {
          if (this.applied) {
            if (deckType === DeckType.ATTACK) {
              this.cards[index].setCharging(false);
              this.setChargeModifier(0);
              this.update();
            }
            const { monsterInfo } = this.uiCombat;
            monsterInfo.modifiers.hp.setHighlighted(false);
            monsterInfo.modifiers.armor.setHighlighted(false);
            monsterInfo.modifiers.attack.setHighlighted(false);
            monsterInfo.modifiers.damage.setHighlighted(false);
            monsterInfo.modifiers.defense.setHighlighted(false);
            monsterInfo.healthBar.setHighlighted(false);
            this.uiCombat.selectFromDeck(this.deck.type);
          } else if (deckType === DeckType.ATTACK) {
            // Handle charging of the card.
            uiCard.setCharging(!uiCard.isCharging());
            this.emit('chargingCard', uiCard);
          }
          return;
        }

        // Make sure that the card can be selected.
        if (!uiCard.enabled || uiCard.selected || uiCard.card.isUsed()) {
          return;
        }

        if (this.selected > -1) {
          const lastSelected = this.cards[this.selected];
          lastSelected.deselect();
          lastSelected.setCharging(false);
        }

        uiCard.select();
        this.selected = index;
        this.emit('selectCard', uiCard);
      });
      this.cards[index].position.x = card.index * 72;
      this.addChild(this.cards[index]);
    });
  }

  apply() {
    this.applied = true;
    this.showSelectedCard();
    this.emit('apply');
  }

  reset() {
    this.visible = false;
    this.alpha = 0;
    this.selected = -1;

    this.cards.forEach((card, index) => {
      card.visible = 0;
      card.alpha = 0;
      card.position.x = 72 * index;
      card.position.y = 0;
    });
  }

  showSelectedCard() {
    if (this.selected === -1) {
      return;
    }

    this.visible = true;
    this.alpha = 1;
    this.cards.forEach((card, index) => {
      card.position.y = 0;
      if (index !== this.selected) {
        card.visible = false;
        return;
      }

      const centerX = this.uiCombat.width / 2;
      if (this.deck.type === DeckType.ATTACK) {
        card.position.x = -this.position.x + Math.floor(centerX - 66);
      } else if (this.deck.type === DeckType.DEFENSE) {
        card.position.x = -this.position.x + Math.floor(centerX + 6);
      }
      card.position.y = -7;
    });
    this.cards[this.selected].visible = true;
  }

  show(callback) {
    this.deck.updateFromCache();
    this.visible = true;
    this.applied = false;
    this.selected = -1;

    this.cards.forEach((card, index) => {
      card.visible = true;
      card.alpha = 1;
      card.position.x = 72 * index;
      card.position.y = 0;
    });

    this.cards.forEach(c => {
      c.deselect();
      c.alpha = 1;

      if (c.card.isUsed()) {
        c.disable();
      } else {
        c.enable();
      }
    });

    const showDeck = ease.add(this, { alpha: 1 }, { duration: 600 });
    showDeck.on('complete', () => {
      if (callback) {
        callback.call();
      }
    });
    this.emit('show');
  }

  hide(callback) {
    const hideDeck = ease.add(this, { alpha: 0 }, { duration: 200 });
    hideDeck.on('complete', () => {
      this.visible = false;
      if (callback) {
        callback.call();
      }
    });
    this.emit('hide');
  }

  getChargeModifier() {
    return this.chargeModifier;
  }

  setChargeModifier(value) {
    if (this.chargeModifier === value) {
      return;
    }

    this.chargeModifier = value;
    this.cards.forEach(card => {
      card.update();
    });
  }

  resetModifiers() {
    this.chargeModifier = 0;
    // this.curseModifier = 0;
    this.cards.forEach(card => {
      card.update();
    });
  }

  getActiveAttackCardCount() {
    let count = 0;
    this.cards.forEach(card => {
      if (!card.card.isUsed()) count += 1;
    });
    return count;
  }
}

export default UIDeck;
