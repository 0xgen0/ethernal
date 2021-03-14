const { coordinatesToLocation } = require('./utils');
const { gearById } = require('../data/utils');
const DungeonComponent = require('./dungeonComponent.js');

const opts = { gasLimit: 700000 };

class Cheats extends DungeonComponent {
  constructor(dungeon) {
    super(dungeon);
    this.sockets
      .onPrivilegedCharacter('teleport', this.teleport.bind(this))
      .onPrivilegedCharacter('update-character', this.updateCharacter.bind(this))
      .onPrivilegedCharacter('generate-income', this.generateIncome.bind(this))
      .onPrivilegedCharacter('kill-character', this.killCharacter.bind(this))
      .onPrivilegedCharacter('kill-monster', this.killMonster.bind(this))
      .onPrivilegedCharacter('update-combat', this.updateCombat.bind(this))
      .onPrivilegedCharacter('spawn-monster', this.spawnMonster.bind(this))
      .onPrivilegedCharacter('spawn-npc', this.spawnNPC.bind(this))
      .onPrivilegedCharacter('spawn-chest', this.spawnChest.bind(this))
      .onPrivilegedCharacter('kill-npc', this.killNPC.bind(this))
      .onPrivilegedCharacter('reload-room', this.reloadRoom.bind(this))
      .onPrivilegedCharacter('reorg-room', this.reorgRoom.bind(this))
      .onPrivilegedCharacter('reorg-character', this.reorgCharacter.bind(this))
      .onPrivilegedCharacter('update-quest', this.updateQuest.bind(this))
      .onPrivilegedCharacter('sell-gear', this.sellGear.bind(this));
  }

  async teleport(_, { character, coordinates }) {
    const { DungeonAdmin } = this.contracts;
    const tx = await DungeonAdmin.teleportCharacter(character, coordinatesToLocation(coordinates), opts);
    await tx.wait();
    console.log(`cheat: character ${character} teleported to ${coordinates}`);
    return coordinates;
  }

  async updateCharacter(sender, update) {
    const { DungeonAdmin } = this.contracts;
    const character = update.character || sender;
    console.log(`cheat: character ${character} update`, update);
    const tx = await DungeonAdmin.updateCharacter(
      character,
      update.monsterId || 666,
      update.hpChange || 0,
      update.xpChange || 0,
      gearById(Number(update.gear)),
      update.durabilityChange || 0,
      [...(update.elemsChange || [0, 0, 0, 0, 0]), update.coins || 0, update.keys || 0, update.fragments || 0],
      opts,
    );
    await tx.wait();
    const info = await this.character.info(character, await this.character.reloadCharacterStats(character));
    this.sockets.emit('update', { characterInfos: [info] });
    return update;
  }

  async generateIncome(_, {coordinates, benefactor, coins, fragments}) {
    const { DungeonAdmin } = this.contracts;
    const tx = await DungeonAdmin.generateRoomIncome(
      coordinatesToLocation(coordinates),
      benefactor,
      [0, 0, 0, 0, 0, coins || 0, 0, fragments || 0],
      opts,
    );
    await tx.wait();
    return this.map.reorgRoom(coordinates);
  }

  async killCharacter(_, character) {
    console.log(`cheat: kill character ${character}`);
    await this.dungeon.combat.characterDefeated(character);
    return true;
  }

  async killMonster(_, coordinates) {
    console.log(`cheat: kill monster at ${coordinates}`);
    await this.dungeon.combat.monsterDefeated(coordinates);
    return true;
  }

  async spawnMonster(_, { coordinates, monsterId }) {
    console.log(`cheat: spawning monster ${monsterId} at ${coordinates}`);
    return await this.dungeon.randomEvents.spawnMonster(coordinates, monsterId);
  }

  async spawnNPC(_, { coordinates, type = 'recycler', timed }) {
    console.log(`cheat: spawning NPC ${type} at ${coordinates}`);
    return await this.dungeon.randomEvents.spawnNPC(coordinates, type, timed);
  }

  async killNPC(_, coordinates) {
    console.log(`cheat: killing NPC at ${coordinates}`);
    await this.dungeon.randomEvents.killNPC(coordinates);
    return true;
  }

  spawnChest(_, { coordinates }) {
    console.log(`cheat: spawning chest at ${coordinates}`);
    return this.dungeon.randomEvents.spawnChest(coordinates);
  }

  async updateCombat(_, { coordinates, combat }) {
    console.log('cheat: update combat');
    return this.dungeon.combat.updateCombat(coordinates, combat);
  }

  async reloadRoom(_, { coordinates }) {
    console.log('cheat: reloading room');
    return this.map.reorgRoom(coordinates);
  }

  // TODO ability to change roomHash and monsterHash
  async reorgRoom(_, { coordinates }) {
    console.log('cheat: forcing reorg of room ' + coordinates);
    return this.map.reorgRoom(coordinates);
  }

  async reorgCharacter(_, { character, status = false }) {
    console.log('cheat: forcing reorg of character ' + character);
    return this.character.reorgCharacter(character, status);
  }

  async updateQuest(_, { character, id, status, data }) {
    console.log('cheat: quest update ' + character);
    const quest = new this.dungeon.quests.available[id](this.dungeon, character);
    quest.status = status;
    quest.data = data;
    return this.dungeon.quests.updateQuest(character, id, quest);
  }

  async sellGear(_, { seller, buyer, gear, coins }) {
    console.log('cheat: sell gear ' + gear);
    return this.dungeon.trading.sellGear(seller, buyer, gear, coins);
  }

  get character() {
    return this.dungeon.character;
  }

  get map() {
    return this.dungeon.map;
  }
}

module.exports = Cheats;
