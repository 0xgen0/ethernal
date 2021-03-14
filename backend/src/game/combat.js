const Sentry = require('@sentry/node');
const Duel = require('./duel');
const config = require('../data/config');
const monsters = require('../data/monsters.js');
const bareHands = require('../data/bareHands');
const {
  copy,
  blockchainSimulator,
  gearBytes,
  toMap,
  mapValues,
  cleanRoom,
  pickGear,
  randomItem,
  pickMonsterType,
  monsterLevel,
  createBalance,
  distributeBalance,
  balanceToAmounts,
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
      .onCharacter('escape', this.escape.bind(this));
  }

  createDuel(characterInfo, previous, monster) {
    const totalInflicted = (previous && previous.attacker.stats.totalInflicted) || 0;
    const { stats, attackGear, defenseGear, characterName } = characterInfo;
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

  async attack(character) {
    return this.runExclusive(await this.dungeon.character.coordinates(character), async () => {
      const characterInfo = await this.dungeon.character.info(character);
      const { coordinates, status } = characterInfo;
      const room = await this.dungeon.room(coordinates);
      const { combat } = room;
      let duel = Duel.revive(combat.duels[character], combat.monster);
      if (status.status === 'blocked by monster') {
        duel = this.createDuel(characterInfo, duel, combat.monster);
        console.log('monster attacked by', character);
        combat.duels[character] = duel;
        const [status] = await Promise.all([
          this.dungeon.character.changeStatus(character, {
            status: 'attacking monster',
            combat,
          }),
          this.dungeon.map.storeRooms([room]),
        ]);
        this.sockets.emit('monster-attacked', {
          coordinates,
          character,
          roomUpdates: [cleanRoom(room)],
          statusUpdates: {
            [character]: status,
          },
        });
      }
      return duel;
    });
  }

  async turn(character, selected) {
    await blockchainSimulator();
    return this.runExclusive(await this.dungeon.character.coordinates(character), async () => {
      const room = await this.dungeon.character.room(character);
      const {coordinates, combat} = room;
      const {duels, monster} = combat;
      const duel = Duel.revive(duels[character], monster);
      if (!duel) {
        throw new Error("duel doesn't exist, monster has to be attacked 1st");
      }
      const turn = duel
        .select('attacker', selected)
        .select('defender')
        .attack();
      monster.stats = turn.resolution.defender;
      duel.attacker.stats = turn.resolution.attacker;
      // @TODO: other types of infliction should be taken into account as well
      duel.attacker.stats.totalInflicted =
        (duel.attacker.stats.totalInflicted || 0) +
        (turn.inflictions.attacker.missed ? 0 : turn.inflictions.attacker.inflicted.health || 0);
      duels[character] = duel;
      const [status] = await Promise.all([
        this.dungeon.character.changeStatus(character, {
          status: 'attacking monster',
          combat,
        }),
        this.dungeon.map.storeRooms([room]),
      ]);
      this.sockets.emit('monster-attacked', {
        coordinates,
        character,
        roomUpdates: [cleanRoom(room)],
        statusUpdates: {
          [character]: status,
        },
      });
      const resolutions = [];
      if (duel.attacker.stats.health <= 0) {
        resolutions.push(this.characterDefeated(character));
      }
      if (monster.stats.health <= 0) {
        resolutions.push(this._monsterDefeated(coordinates));
      }
      await Promise.all(resolutions);
      return duel;
    });
  }

  pickRandomGear(ratio, monsterLevel, gearDrop, monsterType) {
    if (!ratio) {
      return '0x00';
    }
    const gear = this.dungeon.gear.unique.giveRandomly() || pickGear(ratio, monsterLevel, gearDrop, monsterType);
    return gear ? gearBytes.toBytes(gear) : '0x00';
  }

  async monsterDefeated(coordinates) {
    return this.runExclusive(coordinates, () => this._monsterDefeated(coordinates));
  }

  async _monsterDefeated(coordinates) {
    let room = await this.dungeon.room(coordinates);
    const { location, combat, characters, bounty } = room;
    if (!combat) return;
    const monsterId = combat.monster.id;
    const { level } = combat.monster.stats;
    const { type } = combat.monster;
    const ratios = mapValues(combat.duels, ({ attacker, defender }, characterId) => {
      const escaped = !characters.includes(characterId);
      return escaped ? 0 : Math.min(1, attacker.stats.totalInflicted / defender.full.health);
    });
    const bountyRatios = mapValues({...ratios}, (ratio, characterId) => bounty.sponsors && bounty.sponsors.includes(characterId) ? 0 : ratio);
    const bountyPortion = distributeBalance(bountyRatios, bounty);
    let rewards =
      combat.rewards ||
      mapValues(combat.duels, ({ attacker, defender }, characterId) => {
        const { stats } = attacker;
        const escaped = !characters.includes(characterId);
        const ratio = ratios[characterId];
        return {
          characterId,
          hpChange: escaped ? 0 : stats.health - stats.previousHealth,
          xpGained: share(ratio, generateXp(level, type)),
          gear: this.pickRandomGear(ratio, defender.stats.level, defender.stats.gearDrop, type),
          durabilityChange: escaped ? 0 : -1,
          balanceChange: balanceToAmounts(createBalance({
            coins: share(ratio, generateCoins(level, type)),
            keys: share(ratio, generateKeys(level)),
          })),
          bounty: balanceToAmounts(bountyPortion[characterId]),
        };
      });
    combat.rewards = rewards;
    // TODO add some contingency in case that this tx fails
    let tx;
    try {
      const { DungeonAdmin } = this.contracts;
      tx = await DungeonAdmin.monsterDefeated(
        location,
        monsterId,
        Object.values(rewards).map(reward => ({ ...reward, gear: '0x00' })),
        opts,
      );
      console.log('monster defeated tx ' + tx.hash);
      await tx.wait();
      room.combat = null; // TODO persistently store past combats in dynamo
      rewards = mapValues(rewards, reward => ({
        ...reward,
        character: reward.characterId,
        gear: gearBytes.toJSON(reward.gear),
      }));
      room = this.dungeon.map.clearOverride(room, { hasMonster: null });
      await this.dungeon.map.storeRooms([room]);
      const roomUpdates = [await this.dungeon.map.reloadRoomEnsured(coordinates, room).then(cleanRoom)];
      await Promise.all(Object.values(rewards).map(({ character }) => this.dungeon.quests.advanceHandler(character, { coordinates, combat })));
      const statusUpdates = await Promise.all(characters.map(async character => {
        const current = await this.dungeon.character.status(character);
        if (current.status !== 'exploring') {
          let status = {
            status: 'exploring',
            combat,
          }
          if (current.status === 'attacking monster') {
            status = {
              status: 'claiming rewards',
              combat,
              rewards,
            };
          }
          return [character, await this.dungeon.character.changeStatus(character, status)];
        }
      })).then(toMap);
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
    }
  }

  async characterDefeated(character) {
    const room = await this.dungeon.character.room(character);
    const { combat } = room;
    if (!combat) return;
    const monsterId = combat.monster.id;
    const { DungeonAdmin } = this.contracts;
    const gasEstimate = await DungeonAdmin.estimateGas.characterDefeated(character, monsterId);
    const tx = await DungeonAdmin.characterDefeated(character, monsterId, {
      gasLimit: gasEstimate.add(10000),
    });
    console.log('character defeated tx ' + tx.hash);
    await tx.wait();
  }

  async finish(character, { gear }) {
    return this.runExclusive(character, async () => {
      console.log('character ' + character + ' finishes ' + gear);
      const characterStatus = await this.dungeon.character.status(character);
      if (characterStatus.status === 'just died') {
        this.sockets.emit('acknowledged-death', {
          character,
          statusUpdates: {
            [character]: await this.dungeon.character.changeStatus(character, {status: 'dead'}),
          },
        });
      }
      if (characterStatus.status === 'claiming rewards') {
        const awardedGear = characterStatus.rewards[character] && characterStatus.rewards[character].gear;
        if (awardedGear) {
          let tx;
          if (gear) {
            try {
              const {DungeonAdmin} = this.contracts;
              tx = await DungeonAdmin.updateCharacter(
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
              console.log('character claim gear tx failed', err);
              Sentry.withScope(scope => {
                scope.setExtras({character, gear, awardedGear});
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
        const {hasMonster} = await this.dungeon.character.room(character);
        const status = hasMonster ? 'blocked by monster' : 'exploring';
        this.sockets.emit('rewards-claimed', {
          character,
          gear,
          awardedGear,
          statusUpdates: {
            [character]: await this.dungeon.character.changeStatus(character, {status}),
          },
        });
      }
    });
  }

  async escape(character) {
    return this.runExclusive(await this.dungeon.character.coordinates(character), async () => {
      const characterInfo = await this.dungeon.character.info(character);
      const {coordinates} = characterInfo;
      const room = await this.dungeon.room(coordinates);
      if (!room.combat) {
        this.sockets.emit('update', {
          statusUpdates: {
            [character]: await this.dungeon.character.changeStatus(character, {status: 'exploring'})
          },
        });
        return {success: true};
      } else {
        const {duels, monster} = room.combat;
        let duel = Duel.revive(duels[character], monster);
        if (!duel) {
          duel = this.createDuel(characterInfo, null, monster);
        }
        const turn = duel.select('attacker').select('defender').attack();
        const {health, previousHealth} = turn.resolution.attacker;
        if (health <= 0) {
          await this.characterDefeated(character);
          console.log('character died when escaping', character);
          return {success: false, turn};
        } else {
          const {DungeonAdmin} = this.contracts;
          const hpChange = health - previousHealth;
          const tx = await DungeonAdmin.characterEscaped(character, monster.id, hpChange, 0, opts);
          console.log('character escape tx ' + tx.hash);
          await tx.wait();
          console.log('character escaped', character);
          this.sockets.emit('character-escaped', {
            coordinates,
            character,
            duel,
            statusUpdates: {
              [character]: await this.dungeon.character.changeStatus(character, {status: 'exploring', escaped: true}),
            },
          });
          return {success: true, turn};
        }
      }
    });
  }

  async updateCombat(coordinates, { monster, duels }) {
    const room = await this.dungeon.room(coordinates);
    if (!room || !room.hasMonster) {
      throw new Error('cannot update combat in room without monster');
    }
    room.combat = {
      monster,
      duels: mapValues(duels, ({ attacker }) => new Duel(attacker, monster)),
    };
    await this.dungeon.map.storeRooms([room]);
    await Promise.all(
      Object.keys(duels).map(async character => {
        this.sockets.emit('monster-attacked', {
          coordinates,
          character,
          roomUpdates: [cleanRoom(room)],
          statusUpdates: {
            [character]: await this.dungeon.character.changeStatus(character, {
              status: 'attacking monster',
              combat: room.combat,
            }),
          },
        });
      }),
    );
    return { success: true, combat: room.combat };
  }

  toRow(room) {
    const { coordinates, combat } = room;
    return [coordinates, combat];
  }
}

module.exports = Combat;
