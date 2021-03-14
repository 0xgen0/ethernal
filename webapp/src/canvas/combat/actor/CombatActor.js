/**
 * TODO: Document.
 */
class CombatActor {
  /**
   * @param data
   * @param health {number}
   * @param healthFull {number}
   * @param attackDeck {Deck} The attack deck for the actor.
   * @param defenseDeck {Deck} The defense deck for the actor.
   *
   * @constructor
   */
  constructor(data, health, healthFull, attackDeck, defenseDeck) {
    this.data = data;
    this.health = health;
    this.healthFull = healthFull;
    this.decks = {
      attack: attackDeck,
      defense: defenseDeck,
    };
  }

  update() {
    this.decks.attack.updateFromCache();
    this.decks.defense.updateFromCache();
  }

  getHealth() {
    return this.health;
  }

  /**
   * @return {number} Returns the maximum health of the actor.
   */
  getFullHealth() {
    return this.healthFull;
  }

  isDead() {
    return this.getHealth() <= 0;
  }

  getCharge() {
    return this.data.charge ? this.data.charge : 0;
  }

  getArmorModifier() {
    return this.data.protection ? this.data.protection : 0;
  }

  getAttackModifier() {
    return this.data.attack ? this.data.attack : 0;
  }

  getDamageModifier() {
    return this.data.damage ? this.data.damage : 0;
  }

  getDefenseModifier() {
    return this.data.defense ? this.data.defense : 0;
  }
}

export default CombatActor;

/*

Character: {
  characterName: string,

  stats: {
    attack: number,
    defense: number,
    fullHealth: number,
    health: number,
    level: number,
    previousHealth: number,
    protection: number,
    totalInflicted: number,
    xp: number,
  },

  attacks: CharacterAttack[],
  defenses: CharacterDefense[],
}

CharacterAttack: {
  id: number,
  value: number,
  element: string,
  elemValue: number,
  target: string,   // ('health', etc)
  bonus: number,
}

CharacterDefense: {
  id: number,
  value: number,
  element: string,
  elemValue: number,
  bonus: number,
}

Monster: {
  id: number,
  name: string,
  image: string, // Image file name.
  full: MonsterStats,
  stats: MonsterStats,
  attacks: MonsterAttack[],
  defenses: MonsterDefense[],
}

MonsterStats: {
  level: number,
  health: number,
  xp: number,
  attack: number,
  defense: number,
  protection: number,
  wealthLevel: number,
  gearDrop: {
    levelPlusOne: number,
    sameLevel: number,
  },
}

MonsterAttack: {
  id: number,
  value: number,
  bonus: number,
}

MonsterDefense: {
  id: number,
  value: number,
  bonus: number,
}
*/
