import 'pixi.js';
import { ease } from 'pixi-ease';

import { mapOverlay, menuOverlay } from 'stores/screen';
import { actionsText, combatText } from 'data/text';
import { SETTINGS } from './ui/utils/CombatUtils';
import DeckType from '../deck/DeckType';
import ActorInfo from './ui/actor/ActorInfo';
import IconTextButton from './ui/utils/IconTextButton';
import TextButton from './ui/utils/TextButton';
import UIDeck from './ui/deck/UIDeck';
import Monster from './Monster';
import DefenseCard from './ui/deck/DefenseCard';
import AttackCard from './ui/deck/AttackCard';
import CharacterInfo from './ui/actor/CharacterInfo';
import OtherPanel from './ui/actor/OtherPanel';
import AttackType from '../AttackType';

window.PIXI = PIXI;
require('pixi-layers');

/**
 * TODO: (Passive Task) Write checker method for app width and resizing of elements as well as text options.
 */
class CombatRenderer {
  /**
   * @param app (PIXI.Application) The PIXI Application context.
   * @param width {number} The width of the container. (In pixels)
   * @param height {number} The height of the container. (In pixels)
   * @param combat {Combat}
   *
   * @constructor
   */
  constructor(app, width, height, combat) {
    this.app = app;
    this.width = width;
    this.height = height;
    this.combat = combat;

    SETTINGS.mobile = app.screen.width > 975;
  }

  init() {
    this.container = new PIXI.Container();

    this.centerX = this.width / 2;
    this.centerY = this.height / 2 + 40;
    const screenWidth = this.app.screen.width;
    const screenWidth2 = Math.floor(screenWidth / 2);

    // Create the groups to assign and sort graphics for the combat.
    this.charDeckGroup = new PIXI.display.Group(6, true);
    this.monsterDeckGroup = new PIXI.display.Group(5, true);
    this.monsterGroup = new PIXI.display.Group(-1, false);

    this.container.addChild(
      new PIXI.display.Layer(this.monsterGroup),
      new PIXI.display.Layer(this.monsterDeckGroup),
      new PIXI.display.Layer(this.charDeckGroup),
    );

    const highlightModifier = target => {
      if (target === AttackType.HP || target === 'health') {
        this.monsterInfo.modifiers.hp.setHighlighted(true);
        this.monsterInfo.healthBar.setHighlighted(true);
      } else if (target === AttackType.ARMOR || target === 'protection') {
        this.monsterInfo.modifiers.armor.setHighlighted(true);
      } else if (target === AttackType.ATTACK) {
        this.monsterInfo.modifiers.attack.setHighlighted(true);
      } else if (target === AttackType.DAMAGE) {
        this.monsterInfo.modifiers.damage.setHighlighted(true);
      } else if (target === AttackType.DEFENSE) {
        this.monsterInfo.modifiers.defense.setHighlighted(true);
      }
    };

    const unhighlightModifiers = () => {
      this.monsterInfo.modifiers.hp.setHighlighted(false);
      this.monsterInfo.modifiers.armor.setHighlighted(false);
      this.monsterInfo.modifiers.attack.setHighlighted(false);
      this.monsterInfo.modifiers.damage.setHighlighted(false);
      this.monsterInfo.modifiers.defense.setHighlighted(false);
      this.monsterInfo.healthBar.setHighlighted(false);
    };

    this.charAttackDeck = new UIDeck(this, this.combat.character.decks.attack);
    this.charAttackDeck.position.set(screenWidth2 - this.charAttackDeck._width / 2, this.centerY + 8);
    this.charAttackDeck.parentGroup = this.charDeckGroup;
    this.charAttackDeck.on('selectCard', card => {
      this.confirmAttackButton.setText('Confirm attack');
      this.confirmAttackButton.show();
      const target = card.card.getTarget();
      unhighlightModifiers();
      highlightModifier(target);
      this.charAttackDeck.setChargeModifier(0);
    });
    this.charAttackDeck.on('chargingCard', uiCard => {
      const charging = uiCard.isCharging();
      if (charging) {
        this.charAttackDeck.setChargeModifier(1);
        unhighlightModifiers();
      } else {
        const target = uiCard.card.getTarget();
        unhighlightModifiers();
        highlightModifier(target);
        this.charAttackDeck.setChargeModifier(0);
      }
      this.confirmAttackButton.setText(charging ? 'Confirm charge' : 'Confirm attack');
    });

    this.charDefenseDeck = new UIDeck(this, this.combat.character.decks.defense);
    this.charDefenseDeck.position.set(screenWidth2 - this.charDefenseDeck._width / 2, this.centerY + 8);
    this.charDefenseDeck.parentGroup = this.charDeckGroup;
    this.charDefenseDeck.on('selectCard', () => {
      this.confirmDefenseButton.show();
    });

    this.container.addChild(this.charAttackDeck, this.charDefenseDeck);

    this.monsterAttackDeck = new UIDeck(this, this.combat.monster.decks.attack);
    const monsterAttackDeckX = screenWidth2 - this.monsterAttackDeck._width / 2;
    const monsterAttackDeckY = this.centerY - this.monsterAttackDeck.height * 2 - 14;
    this.monsterAttackDeck.position.set(monsterAttackDeckX, monsterAttackDeckY);
    this.monsterAttackDeck.parentGroup = this.monsterDeckGroup;

    this.monsterDefenseDeck = new UIDeck(this, this.combat.monster.decks.defense);
    const monsterDefenseDeckX = screenWidth2 - this.monsterDefenseDeck._width / 2;
    const monsterDefenseDeckY = this.centerY - this.monsterDefenseDeck.height * 2 - 14;
    this.monsterDefenseDeck.position.set(monsterDefenseDeckX, monsterDefenseDeckY);
    this.monsterDefenseDeck.parentGroup = this.monsterDeckGroup;

    const placeholderSlot1X = Math.floor(this.centerX - 66);
    const placeholderSlot2X = Math.floor(this.centerX + 6);
    const placeholderY = Math.floor(this.height / 4) - 15;

    this.monsterAttackPlaceholder = new PIXI.Graphics();
    this.monsterAttackPlaceholder.beginFill(0xffffff);
    this.monsterAttackPlaceholder.drawRect(0, 0, 60, 64);
    this.monsterAttackPlaceholder.endFill();
    this.monsterAttackPlaceholder.visible = false;
    this.monsterAttackPlaceholder.alpha = 0;
    this.monsterAttackPlaceholder.tint = 0x1d1d1d;
    this.monsterAttackPlaceholder.position.set(placeholderSlot2X, placeholderY);

    this.monsterDefensePlaceholder = new PIXI.Graphics();
    this.monsterDefensePlaceholder.beginFill(0xffffff);
    this.monsterDefensePlaceholder.drawRect(0, 0, 60, 64);
    this.monsterDefensePlaceholder.endFill();
    this.monsterDefensePlaceholder.visible = false;
    this.monsterDefensePlaceholder.alpha = 0;
    this.monsterDefensePlaceholder.tint = 0x1d1d1d;
    this.monsterDefensePlaceholder.position.set(placeholderSlot1X, placeholderY);

    this.container.addChild(
      this.monsterAttackDeck,
      this.monsterDefenseDeck,
      this.monsterAttackPlaceholder,
      this.monsterDefensePlaceholder,
    );

    this.otherPanel = new OtherPanel(this);
    this.otherPanel.position.x = Math.floor(this.centerX - this.otherPanel.width / 2);
    this.otherPanel.position.y = this.centerY + 135;
    this.container.addChild(this.otherPanel);

    Object.keys(this.combat.others).forEach(otherCharacterId => {
      this.otherPanel.join(this.combat.others[otherCharacterId], true);
    });

    this.actionBtn = new TextButton(
      new PIXI.Rectangle(Math.floor(this.width / 2 - 96), Math.floor(this.centerY + 30), 192, 42),
      'Continue',
    );
    this.actionBtn.parentGroup = this.charDeckGroup;
    this.actionBtn.onPointerDown = this.reset.bind(this);
    this.actionBtn.disable();
    this.actionBtn.hideImmediately();
    this.container.addChild(this.actionBtn);

    // draw monster and character
    this.monster = new Monster(this, this.combat.monster);
    this.monster.position.set(this.width / 2, 10);
    this.monster.parentGroup = this.monsterGroup;
    this.monster.monsterSprite.scale.set((0.4 * this.height - 20) / 100);
    this.monster.monsterSprite.y = this.height * 0.25;
    const { resetProfile } = this.monster.animationGroup;
    resetProfile.position.x = this.monster.monsterSprite.position.x;
    resetProfile.position.y = this.monster.monsterSprite.position.y;
    resetProfile.scale.x = this.monster.monsterSprite.scale.x;
    resetProfile.scale.y = this.monster.monsterSprite.scale.y;
    this.container.addChild(this.monster);

    this.charInfo = new CharacterInfo(this.combat.character);
    this.charInfo.position.y = this.centerY + 85;
    this.charInfo.position.x = Math.floor(this.width / 2 - this.charInfo.width / 2);
    if (this.combat.monster.isDead()) {
      this.charInfo.runButton.disable();
    }
    this.charInfo.runButton.onPointerDown = async () => {
      this.uiAttackButton.disable();
      this.uiAttackSelectButton.disable();
      this.uiDefenseSelectButton.disable();
      this.actionBtn.disable();
      this.charInfo.runButton.disable();
      await this.combat.escape();
    };
    this.container.addChild(this.charInfo);

    this.monsterInfo = new ActorInfo(this.combat.monster);
    this.monsterInfo.position.x = Math.floor(this.width / 2 - 82);
    this.monsterInfo.position.y = 35;
    this.container.addChild(this.monsterInfo);

    // The variables to calculate the position of the selection buttons.
    const y = Math.floor(this.centerY) + 5;

    const attackSelectTexture = PIXI.utils.TextureCache.icon_select_atk;
    this.uiAttackSelectButton = new IconTextButton(
      Math.floor(screenWidth2 - 138),
      y,
      attackSelectTexture,
      'Select\r\nAttack',
    );
    this.uiAttackSelectButton.onPointerDown = async () => {
      this.selectFromDeck(DeckType.ATTACK);
    };

    const defenseSelectTexture = PIXI.utils.TextureCache.icon_select_def;
    this.uiDefenseSelectButton = new IconTextButton(
      Math.floor(screenWidth2 + 12),
      y,
      defenseSelectTexture,
      'Select\r\nDefense',
    );
    this.uiDefenseSelectButton.onPointerDown = async () => {
      this.selectFromDeck(DeckType.DEFENSE);
    };

    this.uiAttackButton = new TextButton(new PIXI.Rectangle(screenWidth2 - 63, this.centerY - 67, 126, 35), 'Attack!');
    this.uiAttackButton.onPointerDown = async () => {
      await this.startAttack();
      await this.combat.submitSelection(this.selection);
    };
    this.uiAttackButton.disable();
    this.uiAttackButton.visible = false;

    this.container.addChild(this.uiAttackSelectButton, this.uiDefenseSelectButton, this.uiAttackButton);

    // Confirm Attack button
    const confirmAttackButtonX = screenWidth2 - 63;
    const confirmAttackButtonY = this.centerY - 67;
    this.confirmAttackButton = new TextButton(
      new PIXI.Rectangle(confirmAttackButtonX, confirmAttackButtonY, 126, 35),
      'Confirm attack',
    );
    this.confirmAttackButton.hideImmediately();
    this.confirmAttackButton.onPointerDown = () => {
      this.selectCard(this.charAttackDeck.cards[this.charAttackDeck.selected]);
      this.confirmAttackButton.hideImmediately();
    };
    this.container.addChild(this.confirmAttackButton);

    // Confirm Defense button
    const confirmDefenseButtonX = screenWidth2 - 63;
    const confirmDefenseButtonY = this.centerY - 67;
    this.confirmDefenseButton = new TextButton(
      new PIXI.Rectangle(confirmDefenseButtonX, confirmDefenseButtonY, 126, 35),
      'Confirm defense',
    );
    this.confirmDefenseButton.hideImmediately();
    this.confirmDefenseButton.onPointerDown = () => {
      this.selectCard(this.charDefenseDeck.cards[this.charDefenseDeck.selected]);
      this.confirmDefenseButton.hideImmediately();
    };
    this.container.addChild(this.confirmDefenseButton);
    this.app.stage.addChild(this.container);

    // Handle finished on load. (reload)
    this.finished();
  }

  destroy() {
    if (this.charAttackDeck) {
      this.charAttackDeck.destroy();
      this.charAttackDeck = null;
    }
    if (this.charDefenseDeck) {
      this.charDefenseDeck.destroy();
      this.charDefenseDeck = null;
    }
    if (this.monsterAttackDeck) {
      this.monsterAttackDeck.destroy();
      this.monsterAttackDeck = null;
    }
    if (this.monsterDefenseDeck) {
      this.monsterDefenseDeck.destroy();
      this.monsterDefenseDeck = null;
    }
    if (this.monsterAttackPlaceholder) {
      this.monsterAttackPlaceholder.destroy({ children: true, texture: true, baseTexture: true });
      this.monsterAttackPlaceholder = null;
    }
    if (this.monsterDefensePlaceholder) {
      this.monsterDefensePlaceholder.destroy({ children: true, texture: true, baseTexture: true });
      this.monsterDefensePlaceholder = null;
    }
    if (this.actionBtn) {
      this.actionBtn.destroy();
      this.actionBtn = null;
    }
    if (this.charInfo) {
      this.charInfo.destroy();
      this.charInfo = null;
    }
    if (this.monsterInfo) {
      this.monsterInfo.destroy();
      this.monsterInfo = null;
    }

    if (this.uiAttackSelectButton) {
      this.uiAttackSelectButton.destroy();
      this.uiAttackSelectButton = null;
    }
    if (this.uiDefenseSelectButton) {
      this.uiDefenseSelectButton.destroy();
      this.uiDefenseSelectButton = null;
    }
    if (this.uiAttackButton) {
      this.uiAttackButton.destroy();
      this.uiAttackButton = null;
    }
    if (this.confirmAttackButton) {
      this.confirmAttackButton.destroy();
      this.confirmAttackButton = null;
    }
    if (this.confirmDefenseButton) {
      this.confirmDefenseButton.destroy();
      this.confirmDefenseButton = null;
    }
    if (this.otherPanel) {
      this.otherPanel.destroy({ children: true, texture: false, baseTexture: false });
      this.otherPanel = null;
    }
    if (this.monster) {
      this.monster.destroy({ children: true, texture: false, baseTexture: false });
      this.monster = null;
    }
    if (this.monsterInfo) {
      this.monsterInfo.destroy({ children: true, texture: false, baseTexture: false });
      this.monsterInfo = null;
    }
  }

  update() {
    this.monster.update();
  }

  async startAttack() {
    this.uiAttackButton.disable();
    this.uiAttackButton.updateTransform();
    this.uiAttackButton.visible = false;

    // Immediately hide monster cards (no easing)
    this.monsterAttackDeck.cards.forEach(c => {
      c.visible = false;
    });
    this.monsterAttackDeck.visible = true;
    this.monsterAttackDeck.alpha = 1;
    this.monsterAttackDeck.position.y = this.centerY - this.monsterAttackDeck.height - 130;
    this.monsterDefenseDeck.cards.forEach(c => {
      c.visible = false;
    });
    this.monsterDefenseDeck.visible = true;
    this.monsterDefenseDeck.alpha = 1;
    this.monsterDefenseDeck.position.y = this.centerY - this.monsterDefenseDeck.height - 130;

    const charAttackCard = this.charAttackDeck.cards.find(c => c.selected);
    const charDefenseCard = this.charDefenseDeck.cards.find(c => c.selected);
    charAttackCard.disable();
    charAttackCard.alpha = 1;
    charDefenseCard.disable();
    charDefenseCard.alpha = 1;

    // Start waiting time animations for the monster sprite.
    this.monster.animationGroup.animating = true;

    await new Promise(resolve => {
      ease.add(charAttackCard, { y: -50 }, { duration: 600 });
      const move = ease.add(charDefenseCard, { y: -50 }, { duration: 600 });
      move.on('complete', resolve);
    });

    this.monsterAttackPlaceholder.visible = true;
    this.monsterDefensePlaceholder.visible = true;

    const yStop = this.centerY - 122;

    await new Promise(resolve => {
      ease.add(this.monsterAttackPlaceholder, { alpha: 1, y: yStop }, { duration: 600 });
      const move = ease.add(this.monsterDefensePlaceholder, { alpha: 1, y: yStop }, { duration: 600 });
      move.on('complete', resolve);
    });
  }

  async finishAttack(lastTurn) {
    // Resume showing selected card with animation and desired win/loss alpha
    const monsterAttackCard = this.monsterAttackDeck.cards.find(c => c.card.data.id === lastTurn.defender.attack.id);
    const monsterDefenseCard = this.monsterDefenseDeck.cards.find(c => c.card.data.id === lastTurn.defender.defense.id);
    this._charAttackCard = this.charAttackDeck.cards.find(c => c.card.data.id === lastTurn.attacker.attack.id);
    this._charDefenseCard = this.charDefenseDeck.cards.find(c => c.card.data.id === lastTurn.attacker.defense.id);

    const placeholderSlot1X = Math.floor(this.centerX - 66);
    const placeholderSlot2X = Math.floor(this.centerX + 6);
    const placeholderY = Math.floor(this.height / 4);
    const yStop = this.centerY - 122;

    this._monsterAttackCard = new AttackCard(
      this.monsterAttackDeck,
      monsterAttackCard ? monsterAttackCard.card : null,
      false,
    );
    this._monsterAttackCard.position.set(placeholderSlot2X, yStop);

    this._monsterDefenseCard = new DefenseCard(
      this.monsterDefenseDeck,
      monsterDefenseCard ? monsterDefenseCard.card : null,
      false,
    );
    this._monsterDefenseCard.position.set(placeholderSlot1X, yStop);

    this._monsterAttackCard.update(false);
    this._monsterDefenseCard.update(false);

    this.container.addChild(this._monsterAttackCard, this._monsterDefenseCard);

    if (this._monsterAttackCard) {
      this._monsterAttackCard.alpha = 0;
      this._monsterAttackCard.visible = true;
      this._monsterAttackCard.position.x = placeholderSlot2X;
    }

    if (this._monsterDefenseCard) {
      this._monsterDefenseCard.alpha = 0;
      this._monsterDefenseCard.visible = true;
      this._monsterDefenseCard.position.x = placeholderSlot1X;
    }

    await new Promise(resolve => {
      if (this._monsterAttackCard) {
        ease.add(this._monsterAttackCard, { alpha: 1 }, { duration: 600 });
      }
      if (this._monsterDefenseCard) {
        const move = ease.add(this._monsterDefenseCard, { alpha: 1 }, { duration: 600 });
        move.on('complete', resolve);
      } else {
        resolve();
      }
    });

    this.monsterAttackPlaceholder.alpha = 0;
    this.monsterAttackPlaceholder.tint = 0x000000;
    this.monsterAttackPlaceholder.position.set(placeholderSlot1X, placeholderY);

    this.monsterDefensePlaceholder.alpha = 0;
    this.monsterDefensePlaceholder.tint = 0x000000;
    this.monsterDefensePlaceholder.position.set(placeholderSlot2X, placeholderY);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Stop idle animation for the monster sprite.
    this.monster.animationGroup.reset();

    return new Promise(resolve => {
      if (this._charAttackCard && lastTurn.inflictions.attacker.missed) {
        this._charAttackCard.animateUse();
      }
      if (this._charDefenseCard && !lastTurn.inflictions.defender.missed) {
        this._charDefenseCard.animateUse();
      }
      if (this._monsterAttackCard && lastTurn.inflictions.defender.missed) {
        this._monsterAttackCard.animateUse();
      }
      if (this._monsterDefenseCard && !lastTurn.inflictions.attacker.missed) {
        const move = this._monsterDefenseCard.animateUse();
        move.on('complete', resolve);
      } else {
        resolve();
      }
    });
  }

  async revealTurn() {
    const { lastTurn, monsterDead, characterDead } = this.combat;

    // No turn if not last turn
    if (!lastTurn) {
      return;
    }

    if (!monsterDead && !characterDead) {
      // Finish attach, show blows
      await this.finishAttack(lastTurn);

      this.combat.update();

      let charHitMon;
      let monHitChar;
      if (lastTurn && lastTurn.inflictions) {
        charHitMon = !lastTurn.inflictions.attacker.missed && !lastTurn.inflictions.attacker.self;
        monHitChar = !lastTurn.inflictions.defender.missed && !lastTurn.inflictions.defender.self;
      }

      const getDamage = inflicted => {
        if (inflicted.hp) return inflicted.hp;
        if (inflicted.health) return inflicted.health;
        if (inflicted.armor) return inflicted.armor;
        if (inflicted.protection) return inflicted.protection;
        if (inflicted.attack) return inflicted.attack;
        if (inflicted.damage) return inflicted.damage;
        if (inflicted.defense) return inflicted.defense;
        return 0;
      };

      const getAction = inflicted => {
        if (inflicted.hp || inflicted.health) return AttackType.HP;
        if (inflicted.armor || inflicted.protection) return AttackType.ARMOR;
        if (inflicted.attack) return AttackType.ATTACK;
        if (inflicted.damage) return AttackType.DAMAGE;
        if (inflicted.defense) return AttackType.DEFENSE;
        return AttackType.HP;
      };

      if (charHitMon) {
        const monDmg = getDamage(lastTurn.inflictions.attacker.inflicted);
        this.monster.renderDamage(getAction(lastTurn.inflictions.attacker.inflicted), monDmg);
      }

      if (monHitChar) {
        const charDmg = getDamage(lastTurn.inflictions.defender.inflicted);
        this.charInfo.renderDamage(getAction(lastTurn.inflictions.defender.inflicted), charDmg);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Check state again to determine action (possible race here)
    if (monsterDead || characterDead) {
      this.finished(characterDead, monsterDead);

      // Next turn button -- check if monster HP is 0
    } else if (lastTurn.resolution.defender.health > 0) {
      this.actionBtn.setText(actionsText.nextTurn);
      this.actionBtn.onPointerDown = this.reset.bind(this);
      this.actionBtn.enable();
      this.actionBtn.show();
    } else {
      this.charInfo.runButton.disable();
    }
    this.charInfo.update();
    this.monsterInfo.update();
  }

  async revealOthersTurn(character, characterData, lastTurn) {
    let charHitMon;
    let monHitChar;
    if (lastTurn && lastTurn.inflictions) {
      charHitMon = !lastTurn.inflictions.attacker.missed && !lastTurn.inflictions.attacker.self;
      monHitChar = !lastTurn.inflictions.defender.missed && !lastTurn.inflictions.defender.self;
    }

    const getDamage = inflicted => {
      if (inflicted.hp) return inflicted.hp;
      if (inflicted.health) return inflicted.health;
      if (inflicted.armor) return inflicted.armor;
      if (inflicted.protection) return inflicted.protection;
      if (inflicted.attack) return inflicted.attack;
      if (inflicted.damage) return inflicted.damage;
      if (inflicted.defense) return inflicted.defense;
      return 0;
    };

    const getAction = inflicted => {
      if (inflicted.hp || inflicted.health) return AttackType.HP;
      if (inflicted.armor || inflicted.protection) return AttackType.ARMOR;
      if (inflicted.attack) return AttackType.ATTACK;
      if (inflicted.damage) return AttackType.DAMAGE;
      if (inflicted.defense) return AttackType.DEFENSE;
      return AttackType.HP;
    };

    let charInfo = this.otherPanel.others[character];
    if (!charInfo) {
      this.otherPanel.join(this.combat.others[character]);
      charInfo = this.otherPanel.others[character];
    }

    if (charHitMon) {
      const monDmg = getDamage(lastTurn.inflictions.attacker.inflicted);
      this.monster.renderDamage(getAction(lastTurn.inflictions.attacker.inflicted), monDmg);
    }
    if (!this.otherPanel.contains(character)) {
      this.otherPanel.join(this.combat.others[character]);
    }
    if (charInfo) {
      // Make sure not to initially show an attack stance when entering the combat panel.
      if (lastTurn) {
        charInfo.setAttackMode(() => {
          setTimeout(() => {
            if (monHitChar) {
              const charDmg = getDamage(lastTurn.inflictions.defender.inflicted);
              charInfo.renderDamage(getAction(lastTurn.inflictions.defender.inflicted), charDmg, () => {
                charInfo.update();
                charInfo.setIdleMode();
              });
            } else {
              charInfo.update();
              charInfo.setIdleMode();
            }
          }, 2000);
        });
      }
    }

    this.monsterInfo.update();
  }

  reset() {
    if (this._charAttackCard) {
      this._charAttackCard.animateUnused(0);
      this._charAttackCard.update();
    }

    if (this._charDefenseCard) {
      this._charDefenseCard.animateUnused(0);
      this._charDefenseCard.update();
    }

    if (this._monsterAttackCard) {
      this.container.removeChild(this._monsterAttackCard);
      this._monsterAttackCard.destroyPixi();
      this._monsterAttackCard = null;
    }

    if (this._monsterDefenseCard) {
      this.container.removeChild(this._monsterDefenseCard);
      this._monsterDefenseCard.destroyPixi();
      this._monsterDefenseCard = null;
    }

    this.monsterAttackPlaceholder.alpha = 0;
    this.monsterAttackPlaceholder.tint = 0x1d1d1d;
    this.monsterDefensePlaceholder.alpha = 0;
    this.monsterDefensePlaceholder.tint = 0x1d1d1d;

    this.charAttackDeck.resetModifiers();
    this.charDefenseDeck.resetModifiers();

    this.updateDecks();

    this.monsterAttackDeck.hide();
    this.monsterDefenseDeck.hide();
    this.charAttackDeck.hide();
    this.charDefenseDeck.hide();

    this.charAttackDeck.reset();
    this.charDefenseDeck.reset();

    this.actionBtn.disable();
    this.actionBtn.visible = false;

    this.charAttackDeck.cards.forEach(card => {
      card.alpha = 0;
      card.selected = false;
    });
    this.charDefenseDeck.cards.forEach(card => {
      card.alpha = 0;
      card.selected = false;
    });

    this.monsterAttackDeck.cards.forEach(card => {
      card.alpha = 0;
      card.visible = true;
    });

    this.monsterDefenseDeck.cards.forEach(card => {
      card.alpha = 0;
      card.visible = true;
    });

    [this.uiAttackSelectButton, this.uiDefenseSelectButton].forEach(button => {
      button.visible = true;
      button.enable();
      button.updateTransform();
    });

    Object.values(this.charInfo.modifiers).forEach(modifier => {
      modifier.setHighlighted(false);
    });

    Object.values(this.monsterInfo.modifiers).forEach(modifier => {
      modifier.setHighlighted(false);
    });
  }

  updateDecks() {
    this.combat.character.update();
    this.combat.monster.update();
    this.charAttackDeck.update();
    this.charDefenseDeck.update();
    this.monsterAttackDeck.update();
    this.monsterDefenseDeck.update();
  }

  /**
   * @param type {string}
   */
  selectFromDeck(type) {
    // Disable deck and attack buttons.
    [this.uiAttackSelectButton, this.uiDefenseSelectButton, this.uiAttackButton].forEach(button => {
      button.disable();
      button.updateTransform();
      button.visible = false;
    });

    let hiddenDeck = this.charAttackDeck;
    let selectedDeck = this.charDefenseDeck;
    let selectedMonsterDeck = this.monsterAttackDeck;
    if (type === DeckType.ATTACK) {
      hiddenDeck = this.charDefenseDeck;
      selectedDeck = this.charAttackDeck;
      selectedMonsterDeck = this.monsterDefenseDeck;
    }

    hiddenDeck.hide();
    selectedDeck.show();

    selectedMonsterDeck.cards.forEach(c => {
      c.alpha = 1;
    });
    selectedMonsterDeck.y = this.centerY - selectedMonsterDeck.height * 2 - 20;
    selectedMonsterDeck.show();
  }

  finished(character, monster) {
    const characterDead = character || this.combat.character.isDead();
    const monsterDead = monster || this.combat.monster.isDead();

    if (!characterDead && !monsterDead) {
      return;
    }

    // Hide decks
    [
      this._monsterAttackCard,
      this._monsterDefenseCard,
      this._charAttackCard,
      this._charDefenseCard,
      this.monsterAttackDeck,
      this.monsterDefenseDeck,
      this.charAttackDeck,
      this.charDefenseDeck,
    ].forEach(deck => deck && deck.hide());

    [
      this.uiAttackSelectButton,
      this.uiDefenseSelectButton,
      this.confirmAttackButton,
      this.confirmDefenseButton
    ].forEach(btn => {
      if (btn) {
        btn.disable();
        btn.updateTransform();
        btn.visible = false;
      }
    });

    if (this.actionBtn) {
      // NOTE: This probably should be an 'else if block', but I'm not sure if this is supposed to be
      //   this way. -Josh
      if (monsterDead) {
        this.actionBtn.setText(combatText.searchLoot);
        this.actionBtn.onPointerDown = () => mapOverlay.open('loot');
      }

      if (characterDead) {
        this.actionBtn.setText(combatText.died);
        this.actionBtn.onPointerDown = () => menuOverlay.open('gameOver');
      }

      this.actionBtn.enable();
      this.actionBtn.show();
    }
  }

  selectCard(card) {
    // Determine decks by type
    let offset = 1;
    let hiddenDeck = this.charAttackDeck;
    let selectedDeck = this.charDefenseDeck;
    let selectedMonsterDeck = this.monsterAttackDeck;
    if (card.card.type === 'attack') {
      hiddenDeck = this.charDefenseDeck;
      selectedDeck = this.charAttackDeck;
      selectedMonsterDeck = this.monsterDefenseDeck;
      offset = -1;
      if (card.isCharging()) {
        card.card.setCharging(true);
      }
    }

    // Indicate selected card from deck
    selectedDeck.cards.forEach(deckCard => {
      deckCard.selected = deckCard === card;
    });

    // Show deck selection buttons if deck card not selected
    // or attack button if both are selected
    const hasSelectedAtk = this.charAttackDeck.cards.find(c => c.selected);
    const hasSelectedDef = this.charDefenseDeck.cards.find(c => c.selected);

    [
      !hasSelectedAtk && this.uiAttackSelectButton,
      !hasSelectedDef && this.uiDefenseSelectButton,
      hasSelectedAtk && hasSelectedDef && this.uiAttackButton,
    ]
      .filter(Boolean)
      .forEach(btn => {
        btn.visible = true;
        btn.enable();
        btn.updateTransform();
      });

    // Resume display of decks, hide monster deck
    selectedMonsterDeck.hide();
    hiddenDeck.apply();
    selectedDeck.apply(() => {
      card.position.x = this.width / 2 + offset * 20 - (offset < 0 ? card.width : 0);
    });

    if (hiddenDeck.selected !== -1) {
      hiddenDeck.showSelectedCard();
    }

    this.selection = { ...this.selection, [card.card.type]: card.card.data };
  }

  monsterDefeated() {
    this.finished(false, true);
  }

  characterDefeated() {
    this.finished(true, false);
  }

  otherCharacterDefeated(characterId) {
    if (this.otherPanel.contains(characterId)) {
      this.otherPanel.leave(characterId);
    }
  }

  removeOtherCharacter(characterId) {
    if (this.otherPanel.contains(characterId)) {
      this.otherPanel.leave(characterId);
    }
  }
}

export default CombatRenderer;
