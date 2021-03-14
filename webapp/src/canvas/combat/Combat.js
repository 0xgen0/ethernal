import CombatCharacter from './actor/CombatCharacter';
import CombatMonster from './actor/CombatMonster';

class Combat {
  /**
   *
   * @param characterId {string}
   * @param currentCombat
   *
   * @constructor
   */
  constructor(characterId, currentCombat) {
    this.currentCombat = currentCombat;
    this.characterId = characterId;
    this.cache = global.dungeon.cache;
  }

  /**
   * @param renderer {CombatRenderer}
   */
  init(renderer) {
    this.renderer = renderer;

    const { duels } = this.currentCombat;
    this.stats = duels[this.characterId];
    this.character = new CombatCharacter(this.characterId);
    this.others = [];

    Object.keys(global.dungeon.cache.currentCombat.duels).forEach(key => {
      if (this.characterId !== key
        && global.dungeon.cache.currentRoom.onlineCharacters.includes(key)
        && global.dungeon.cache.onlineCharacters[key]
        && global.dungeon.cache.onlineCharacters[key].status.status === 'attacking monster'
      ) {
        this.others[key] = new CombatCharacter(key);
      }
    });

    this.monster = new CombatMonster(this.currentCombat.monster);

    this.listeners = [
      this.cache.onUpdate('myDuelTurn', this.myDuelTurn.bind(this)),
      this.cache.onUpdate('otherDuelTurn', this.otherDuelTurn.bind(this)),
      this.cache.onUpdate('monsterDefeated', this.monsterDefeated.bind(this)),
      this.cache.onUpdate('characterDefeated', this.characterDefeated.bind(this)),
      this.cache.onUpdate('otherCharacterDefeated', this.otherCharacterDefeated.bind(this)),
      this.cache.onUpdate('otherCharacterEscaped', characterId => {
        this.update();
        this.renderer.removeOtherCharacter(characterId);
        delete this.others[characterId];
      }),
    ];
  }

  destroy() {
    if(this.listeners) {
      this.listeners.map(destroy => destroy());
    }
  }

  update() {
    this.monster.update();
    this.character.update();
    Object.keys(this.others).forEach(key => {
      const other = this.others[key];
      if (other) other.update();
    });
  }

  async myDuelTurn({ characterStatus, combat, turnAction }) {
    this.update();

    const monsterDead = characterStatus === 'claiming rewards';
    const characterDead = ['just died', 'dead'].includes(characterStatus);

    this.monsterDead = monsterDead;
    this.characterDead = characterDead;
    if (turnAction) {
      this.lastTurn = turnAction;
      const { duels } = this.currentCombat;
      this.stats = duels[this.characterId];

      await this.renderer.revealTurn();
    } else if (monsterDead || characterDead) {
      this.renderer.finished(characterDead, monsterDead);
    }
  }

  async otherDuelTurn({ character, characterData, turnAction }) {
    this.update();

    if (!this.others[character]) {
      this.others[character] = new CombatCharacter(character, characterData);
    }

    await this.renderer.revealOthersTurn(character, characterData, turnAction);
  }

  async monsterDefeated() {
    this.update();

    // @TODO: queue until last action displayed
    await this.renderer.monsterDefeated();
  }

  async characterDefeated() {
    this.update();

    // @TODO: queue until last action displayed
    await this.renderer.characterDefeated();
  }

  async otherCharacterDefeated(characterId) {
    this.update();

    // @TODO: queue until last action displayed
    await this.renderer.otherCharacterDefeated(characterId);

    delete this.others[characterId];
  }

  async escape() {
    this.update();

    await this.cache.action('escape');
  }

  async submitSelection(selection) {
    await this.cache.action('turn', selection);
  }
}

export default Combat;
