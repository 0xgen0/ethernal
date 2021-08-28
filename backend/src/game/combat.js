const Sentry = require('@sentry/node');
const Duel = require('./duel');
const config = require('../data/config');
const monsters = require('../data/monsters.js');
const bareHands = require('../data/bareHands');
const {
  copy,
  blockchainSimulator,
  gearBytes,
  mapValues,
  cleanRoom,
  pickGear,
  randomItem,
  pickMonsterType,
  monsterLevel,
  normalizeMonster,
} = require('../data/utils');
const { generateXp, generateCoins, generateKeys, share } = require('./utils');
const DungeonComponent = require('./dungeonComponent.js');

const opts = { gasLimit: 700000 };

class Combat extends DungeonComponent {
  constructor(dungeon) {
    super(dungeon);
    this.sockets
      .onCharacter('attack', this.attack.bind(this))
      .onCharacter('turn', this.turn.bind(this))
      .onCharacter('finish', this.finish.bind(this))
      .onCharacter('escape', this.escape.bind(this))
      .onCharacter('need-help', this.requestHelp.bind(this));
  }

  getState(coordinates) {
    return this.dungeon.rooms[coordinates].combat;
  }

  async createDuel(character, previous) {
    const totalInflicted = (previous && previous.attacker.stats.totalInflicted) || 0;
    const coordinates = this.dungeon.character.coordinates(character);
    const monster = this.getState(coordinates).monster;
    const { stats, attackGear, defenseGear, characterName } = this.dungeon.characters[character];
    const player = copy(config.player);
    const attack = copy(attackGear.maxDurability !== 0 && attackGear.durability <= 0 ? bareHands.attack : attackGear);
    const defense = copy(
      defenseGear.maxDurability !== 0 && defenseGear.durability <= 0 ? bareHands.defense : defenseGear,
    );
    player.characterName = characterName;
    player.attacks = attack.actions.map((action, id) => ({ ...action, id }));
    player.defenses = defense.actions.map((action, id) => ({ ...action, id }));
    player.stats = { ...player.stats, ...stats, totalInflicted };
    player.stats.previousHealth = player.stats.health;
    return new Duel(player, monster);
  }

  generateMonster(coordinates, monsterId, bigBossAvailable = true) {
    let monster;
    try {
      if (monsterId) {
        monster = copy(monsters.flat().find(({ id }) => id === monsterId));
      } else {
        const level = monsterLevel(coordinates);
        const randomType = pickMonsterType(bigBossAvailable, level);
        const ofLevel = monsters.flat().filter(({ stats }) => stats.level === level);
        const ofType = ofLevel.filter(({ type }) => randomType === type);
        monster = copy(randomItem(ofType.length === 0 ? ofLevel : ofType));
      }
      monster = normalizeMonster(monster);
    } catch (e) {
      console.log('monster generation failed', e);
      Sentry.withScope(scope => {
        scope.setExtras({ monster, monsterId, coordinates });
        Sentry.captureException(e);
      });
      return null;
    }
    return monster;
  }

  createCombat(room, monsterId, bigBossAvailable = true) {
    if (room && room.hasMonster && !room.combat) {
      const monster =
        this.generateMonster(room.coordinates, monsterId, bigBossAvailable) ||
        this.generateMonster(room.coordinates, 1);
      room.combat = {
        monster,
        duels: {},
      };
      const { coordinates } = room;
      this.sockets.emit('monster-spawned', { coordinates, monster });
      if (monster.type === 'big boss') {
        this.sockets.emit('boss-spawned', { coordinates, monster });
      }
    }
    return room;
  }

  requestHelp(character) {
    const coordinates = this.dungeon.character.coordinates(character);
    const room = this.dungeon.rooms[coordinates];
    if (!this.dungeon.rooms[coordinates].combat) {
      throw new Error('no combat exists');
    }
    if (!this.dungeon.rooms[coordinates].combat.needsHelp) {
      this.dungeon.rooms[coordinates].combat.needsHelp = [];
    }
    if (this.dungeon.rooms[coordinates].combat.needsHelp.includes(character)) {
      throw new Error('character already requested help');
    }
    this.dungeon.rooms[coordinates].combat.needsHelp.push(character);
    this.sockets.emit('combat-help', {
      coordinates,
      character,
      roomUpdates: [cleanRoom(this.dungeon.rooms[coordinates])],
    });
  }

  async attack(character) {
    const coordinates = this.character.coordinates(character);
    const characterStatus = this.character.status(character);
    let { duels } = this.getState(coordinates);
    let duel = duels[character];
    if ('blocked by monster' === characterStatus.status) {
      duel = await this.createDuel(character, duel);
      console.log('monster attacked by', character);
      duels[character] = duel;
      const room = this.dungeon.rooms[coordinates];
      this.sockets.emit('monster-attacked', {
        coordinates,
        character,
        roomUpdates: [cleanRoom(room)],
        statusUpdates: {
          [character]: this.character.changeStatus(character, {
            status: 'attacking monster',
            combat: room.combat,
          }),
        },
      });
    }
    return duel;
  }

  async turn(character, selected) {
    const coordinates = this.dungeon.character.coordinates(character);
    let { duels, monster } = this.getState(coordinates);
    let duel = duels[character];
    if (!duel) {
      throw new Error("duel doesn't exist, monster has to be attacked 1st");
    }
    await blockchainSimulator();
    const turn = duel.select('attacker', selected).select('defender').attack();
    monster.stats = turn.resolution.defender;
    duel.attacker.stats = turn.resolution.attacker;
    // @TODO: other types of infliction should be taken into account as well
    duel.attacker.stats.totalInflicted =
      (duel.attacker.stats.totalInflicted || 0) +
      (turn.inflictions.attacker.missed ? 0 : turn.inflictions.attacker.inflicted.health || 0);
    const room = this.dungeon.rooms[coordinates];
    this.sockets.emit('monster-attacked', {
      coordinates,
      character,
      roomUpdates: [cleanRoom(room)],
      statusUpdates: {
        [character]: this.character.changeStatus(character, {
          status: 'attacking monster',
          combat: room.combat,
        }),
      },
    });
    const resolutions = [];
    if (duel.attacker.stats.health <= 0) {
      resolutions.push(this.characterDefeated(character));
    }
    if (monster.stats.health <= 0) {
      resolutions.push(this.monsterDefeated(coordinates));
    }
    await Promise.all(resolutions);
    return duel;
  }

  pickRandomGear(ratio, monsterLevel, gearDrop, monsterType) {
    if (!ratio) {
      return '0x00';
    }
    const gear = this.dungeon.gear.unique.giveRandomly() || pickGear(ratio, monsterLevel, gearDrop, monsterType);
    return gear ? gearBytes.toBytes(gear) : '0x00';
  }

  async monsterDefeated(coordinates) {
    const room = this.dungeon.rooms[coordinates];
    const { location, combat } = room;
    if (!combat || combat.finishing) return;
    const monsterId = combat.monster.id;
    combat.finishing = true;
    const { level } = combat.monster.stats;
    const { type } = combat.monster;
    let rewards =
      combat.rewards ||
      mapValues(combat.duels, ({ attacker, defender }, characterId) => {
        const { stats } = attacker;
        const escaped = coordinates !== this.character.coordinates(characterId);
        const ratio = escaped ? 0 : Math.min(1, stats.totalInflicted / defender.full.health);
        return {
          characterId,
          hpChange: escaped ? 0 : stats.health - stats.previousHealth,
          xpGained: share(ratio, generateXp(level, type)),
          gear: this.pickRandomGear(ratio, defender.stats.level, defender.stats.gearDrop, type),
          durabilityChange: escaped ? 0 : -1,
          balanceChange: [
            ...[0, 0, 0, 0, 0],
            share(ratio, generateCoins(level, type)),
            share(ratio, generateKeys(level)),
            0,
          ],
        };
      });
    combat.rewards = rewards;
    //TODO add some contingency in case that this tx fails

    let tx;
    try {
      tx = await this.contracts.DungeonAdmin.monsterDefeated(
        location,
        monsterId,
        Object.values(rewards).map(reward => ({ ...reward, gear: '0x00' })),
        opts,
      );

      console.log('monster defeated tx ' + tx.hash);
      await tx.wait();
      room.combat = null; // TODO persistently store past combats somewhere
      rewards = mapValues(rewards, reward => ({
        ...reward,
        character: reward.characterId,
        gear: gearBytes.toJSON(reward.gear),
      }));
      this.dungeon.rooms[coordinates] = this.dungeon.map.clearOverride(room, { hasMonster: null });
      const roomUpdates = [await this.dungeon.map.reloadRoomEnsured(coordinates).then(cleanRoom)];
      // TODO move to contract event handler when ready
      Object.values(rewards).forEach(({ character, hpChange, xpGained }) => {
        this.character.data[character].stats.health += hpChange;
        this.character.data[character].stats.xp += xpGained;
        this.dungeon.quests.advanceHandler(character, { coordinates, combat });
      });
      const statusUpdates = Object.keys(this.character.data)
        .filter(
          character =>
            this.character.status(character) &&
            this.character.status(character).status !== 'exploring' &&
            coordinates === this.character.coordinates(character),
        )
        .reduce((updates, character) => {
          if (this.character.status(character).status === 'attacking monster') {
            updates[character] = this.character.changeStatus(character, {
              status: 'claiming rewards',
              combat,
              rewards,
            });
          } else {
            updates[character] = this.character.changeStatus(character, {
              status: 'exploring',
              combat,
            });
          }
          return updates;
        }, {});
      this.sockets.emit('monster-defeated', {
        coordinates,
        combat,
        rewards,
        roomUpdates,
        statusUpdates,
      });
      console.log('monster defeated at ', coordinates);
      if (type === 'big boss') {
        this.sockets.emit('boss-defeated', {
          coordinates,
          combat,
          rewards,
        });
      }
    } catch (err) {
      console.log('monster defeated tx failed', coordinates, err);
      Sentry.withScope(scope => {
        scope.setExtras({ coordinates, room, tx });
        Sentry.captureException(err);
      });
      combat.finishing = false;
    }
  }

  async characterDefeated(character) {
    const room = this.dungeon.character.room(character);
    const { combat, coordinates } = room;
    if (!combat) return;
    const monsterId = combat.monster.id;
    const gasEstimate = await this.contracts.DungeonAdmin.estimateGas.characterDefeated(character, monsterId);
    const tx = await this.contracts.DungeonAdmin.characterDefeated(character, monsterId, {
      gasLimit: gasEstimate.add(10000),
    });
    console.log('character defeated tx ' + tx.hash);
    await tx.wait();
    await this.character.reloadCharacterStats(character);
    room.deadCharacters = Array.from(new Set([...(room.deadCharacters || []), character]));
    room.scavenge = { ...room.scavenge, corpses: this.dungeon.map.scavengeCorpses(coordinates) };
    console.log('character defeated at ', coordinates);
    this.sockets.emit('character-defeated', {
      character,
      coordinates,
      roomUpdates: [cleanRoom(this.dungeon.rooms[coordinates])],
      statusUpdates: {
        [character]: this.character.changeStatus(character, {
          status: 'just died',
          combat: copy(combat),
        }),
      },
    });
    delete combat.duels[character];
  }

  async finish(character, { gear }) {
    console.log('character ' + character + ' finishes ' + gear);
    const characterStatus = this.character.status(character);
    if ('just died' === characterStatus.status) {
      this.sockets.emit('acknowledged-death', {
        character,
        statusUpdates: {
          [character]: this.character.changeStatus(character, { status: 'dead' }),
        },
      });
    }
    if ('claiming rewards' === characterStatus.status) {
      if (characterStatus.claiming) return;
      characterStatus.claiming = true;
      const awardedGear = characterStatus.rewards[character] && characterStatus.rewards[character].gear;
      if (awardedGear) {
        let tx;
        if (gear) {
          try {
            tx = await this.contracts.DungeonAdmin.updateCharacter(
              character,
              characterStatus.combat.monster.id,
              0,
              0,
              awardedGear.bytes,
              0,
              [0, 0, 0, 0, 0, 0, 0, 0],
              opts,
            );
            console.log('character claim gear tx ' + tx.hash);
            await tx.wait();
          } catch (err) {
            gear = false;
            characterStatus.claiming = false;
            console.log('character claim gear tx failed', err);
            Sentry.withScope(scope => {
              scope.setExtras({ character, gear, awardedGear });
              Sentry.captureException(err);
            });
          }
        }
        if (this.dungeon.gear.unique.isUnique(awardedGear)) {
          if (gear) {
            console.log('unique gear minted!');
            this.sockets.emit('unique-gear-minted', {
              character,
              tx: tx.hash,
              gear: awardedGear,
            });
          } else {
            console.log('unique gear rejected by character', character, awardedGear);
            this.dungeon.gear.unique.reject(awardedGear);
          }
        }
      }
      this.sockets.emit('rewards-claimed', {
        character,
        gear,
        awardedGear,
        statusUpdates: {
          [character]: this.character.room(character).hasMonster
            ? this.character.changeStatus(character, { status: 'blocked by monster' })
            : this.character.changeStatus(character, { status: 'exploring' }),
        },
      });
    }
  }

  async escape(character) {
    const coordinates = this.character.coordinates(character);
    let { duels, monster } = this.getState(coordinates);
    let duel = duels[character];
    if (!duel) {
      duel = await this.createDuel(character);
    }
    const turn = duel.select('attacker').select('defender').attack();
    const { health, previousHealth } = turn.resolution.attacker;
    if (health <= 0) {
      await this.characterDefeated(character);
      console.log('character died when escaping', character);
      return { success: false, turn };
    } else {
      const hpChange = health - previousHealth;
      const tx = await this.contracts.DungeonAdmin.characterEscaped(character, monster.id, hpChange, 0, opts);
      console.log('character escape tx ' + tx.hash);
      await tx.wait();
      this.character.data[character].stats.health += hpChange;
      console.log('character escaped', character);
      this.sockets.emit('character-escaped', {
        coordinates,
        character,
        duel,
        statusUpdates: {
          [character]: this.character.changeStatus(character, { status: 'exploring', escaped: true }),
        },
      });
      return { success: true, turn };
    }
  }

  async updateCombat(coordinates, { monster, duels }) {
    const room = this.dungeon.rooms[coordinates];
    if (!room || !room.hasMonster) {
      throw new Error('cannot update combat in room without monster');
    }
    room.combat = {
      monster,
      duels: mapValues(duels, ({ attacker }) => new Duel(attacker, monster)),
    };
    Object.keys(duels).map(character => {
      this.sockets.emit('monster-attacked', {
        coordinates,
        character,
        roomUpdates: [cleanRoom(room)],
        statusUpdates: {
          [character]: this.character.changeStatus(character, {
            status: 'attacking monster',
            combat: room.combat,
          }),
        },
      });
    });
    return { success: true, combat: room.combat };
  }

  get character() {
    return this.dungeon.character;
  }
}

module.exports = Combat;
