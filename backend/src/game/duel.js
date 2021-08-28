const { copy } = require('../data/utils');

class Duel {
  constructor(attacker, defender) {
    this.attacker = attacker;
    this.defender = defender;
    this.turn = {};
    this.log = [];
    this.decks = {
      attacker: copy(attacker),
      defender: copy(defender),
    };
  }

  select(party, actions = this.randomChoice(party)) {
    const { attack, defense } = actions;
    const decks = this.decks[party];
    this.turn[party] = {
      attack: pickFrom(decks.attacks, attack),
      defense: pickFrom(decks.defenses, defense),
    };
    return this;
  }

  randomChoice(party) {
    return {
      attack: randomAction(this.decks[party].attacks),
      defense: randomAction(this.decks[party].defenses),
    };
  }

  attack() {
    const { attacker, defender } = this.turn;
    if (!attacker || !defender) {
      throw new Error('cant attack yet');
    }
    const usedDecks = this.useDecks();
    let turn = {
      attacker: { ...attacker, stats: copy(this.attacker.stats) },
      defender: { ...defender, stats: copy(this.defender.stats) },
    };
    const inflictions = {
      attacker: resolveAttack(turn.attacker, turn.defender),
      defender: resolveAttack(turn.defender, turn.attacker),
    };
    const resolution = {
      attacker: { ...turn.attacker.stats },
      defender: { ...turn.defender.stats },
    };
    const attackerTarget = inflictions.attacker.self ? 'attacker' : 'defender';
    const defenderTarget = inflictions.defender.self ? 'defender' : 'attacker';
    resolution[attackerTarget] = inflict(inflictions.attacker, resolution[attackerTarget]);
    resolution[defenderTarget] = inflict(inflictions.defender, resolution[defenderTarget]);
    if (freshDeck(usedDecks.attacker.attacks)) {
      resolution.attacker.charge = 0;
    }
    if (freshDeck(usedDecks.defender.attacks)) {
      resolution.defender.charge = 0;
    }
    turn = { ...turn, inflictions, resolution };
    this.decks = usedDecks;
    this.log.push(turn);
    this.turn = {};
    return turn;
  }

  useDecks() {
    const { attacker, defender } = this.decks;
    return {
      attacker: {
        attacks: use(attacker.attacks, this.turn.attacker.attack),
        defenses: use(attacker.defenses, this.turn.attacker.defense),
      },
      defender: {
        attacks: use(defender.attacks, this.turn.defender.attack),
        defenses: use(defender.defenses, this.turn.defender.defense),
      },
    };
  }
}

function randomAction(deck) {
  const available = deck.filter(card => !card.used);
  return available[Math.floor(Math.random() * available.length)];
}

function pickFrom(deck, action) {
  const card = deck.filter(({ id }) => id === action.id)[0];
  if (!card) {
    throw new Error('invalid action');
  }
  return { ...action, ...card };
}

function freshDeck(deck) {
  return deck.filter(action => action.used).length === 0;
}

function use(actions, selected) {
  if (actions.filter(action => selected.id === action.id && !action.used).length === 0) {
    throw new Error('invalid turn');
  }
  const newDeck = actions.map(a => (selected.id === a.id ? { ...a, used: true } : { ...a }));
  const notUsed = newDeck.filter(action => !action.used).length;
  return notUsed === 0 ? actions.map(a => ({ ...a, used: false })) : newDeck;
}

function resolveAttack(attacker, defender) {
  if (attacker.attack.charge) {
    return { self: true, missed: false, inflicted: { charge: -1 } };
  }
  const totalAttack = attacker.stats.attack + attacker.stats.charge + attacker.attack.bonus;
  const totalDefense = defender.stats.defense + defender.defense.bonus;
  const { target } = attacker.attack;
  if (totalAttack > totalDefense) {
    let totalProtection = 0;
    let dmg = attacker.attack.value;
    if (target === 'health') {
      totalProtection = defender.stats.protection + defender.defense.value;
      dmg = Math.max(attacker.attack.value + attacker.stats.damage - totalProtection, 0);
    }
    return { missed: false, inflicted: { [target]: dmg }, reduced: totalProtection };
  } else {
    return { missed: true };
  }
}

function inflict({ missed, inflicted }, stats) {
  let result = { ...stats };
  if (!missed) {
    Object.keys(inflicted).forEach(target => {
      result = { ...result, [target]: stats[target] - inflicted[target] };
    });
  }
  return result;
}

module.exports = Duel;
