const Sentry = require('@sentry/node');
const { events, pastEvents } = require('../db/provider');
const { mapValues, justValues } = require('../data/utils');
const DungeonComponent = require('./dungeonComponent');
const TRANSITIONS = require('./quest/transitions');
const Minimap = require('./quest/minimap');
const CanaryFragments = require('./quest/canaryFragments');
const Alchemist = require('./quest/alchemist');
const { UnlockLevel1, UnlockLevel2, UnlockLevel3, UnlockLevel4, UnlockLevel5, UnlockLevel6, UnlockLevel7, UnlockLevel8 } = require('./quest/nextLevel');

class Quests extends DungeonComponent {
  available = {};
  characters = {};

  constructor(map) {
    super(map);
    this.available = {
      1: Minimap,
      2: CanaryFragments,
      3: UnlockLevel1,
      4: UnlockLevel2,
      5: UnlockLevel3,
      6: UnlockLevel4,
      7: UnlockLevel5,
      8: UnlockLevel6,
      9: UnlockLevel7,
      10: UnlockLevel8,
      11: Alchemist,
    };
    this.initial = Object.keys(this.available);
    this.sockets
      .onCharacter('can-accept-quest', this.canAccept.bind(this))
      .onCharacter('accept-quest', this.accept.bind(this))
      .onCharacter('advance-quest', this.advance.bind(this))
      .onCharacter('reject-quest', this.reject.bind(this))
      .onCharacter('claim-quest-reward', this.claim.bind(this));
  }

  registerEventHandlers() {
    const { Dungeon } = this.dungeon.contracts;
    events.on(Dungeon, 'QuestUpdate', this.handleQuestUpdate.bind(this));
  }

  async fetchAll(fromBlock = 0, toBlock = 'latest', snapshot) {
    console.log('fetching quests events');
    justValues(await pastEvents('Dungeon', 'QuestUpdate', [], this.dungeon.firstBlock, toBlock)).forEach(values => {
        this.handleQuestUpdate(...values, null, true);
    });
    this.respawnNPC();
  }

  respawnNPC(coords) {
    console.log('respawning npc', coords);
    Object.values(this.dungeon.characters).forEach(({ characterId }) =>
      Object.values(this.getAll(characterId))
        .filter(({ coordinates }) => coords ? coordinates === coords : true)
        .forEach(quest => quest.spawnNPC()));
  }

  async advanceHandler(character, data) {
    const { move } = data;
    if (move) {
      const { to, discovered } = move;
      this.respawnNPC(discovered ? null : to);
    }
    const quests = mapValues(this.characters[character], (quest, id) => {
      if (['discovered', 'accepted'].includes(quest.status)) {
        try {
          const result = quest.advanceHandler(data);
          if (result) {
            return this.updateQuest(character, id, quest);
          } else {
            return null;
          }
        } catch (e) {
          console.log('advance handler failed', {character, data, id, error: e.message});
          Sentry.withScope(scope => {
            scope.setExtras({character, data, quest, id});
            Sentry.captureException(e);
          });
          return null;
        }
      }
    });
    await Promise.all(Object.values(quests));
    return quests;
  }

  getQuest(character, id) {
    if (!this.dungeon.characters[character]) {
      return null;
    }
    if (!this.available[id]) {
      throw new Error('quest doesnt exists');
    }
    if (!this.characters[character]) {
      this.characters[character] = {};
    }
    if (!this.characters[character][id]) {
      const parent = this.dungeon.character.parent(character);
      let inherited;
      if (parent) {
        const quest = this.getQuest(parent, id);
        if (quest.status && quest.status === 'completed') {
          inherited = quest;
        }
      }
      this.characters[character][id] = inherited || new this.available[id](this.dungeon, character);
    }
    return this.characters[character][id];
  }

  getAll(character) {
    return mapValues(this.available, (_, id) => this.getQuest(character, id));
  }

  handleQuestUpdate(character, id, status, data, event, init = false) {
    character = character.toString();
    id = id.toString();
    status = Object.keys(TRANSITIONS)[Number(status)];
    const quest = this.getQuest(character, id);
    data = quest.decodeData(data);
    quest.status = status;
    quest.data = data;
    if (!init) {
      console.log('quest update', id, status, data);
      quest.handleUpdate();
    }
    this.sockets.emit('quest-update', { character, id, quest: {status, data} });
  }

  async canAccept(character, { id }) {
    const quest = this.getQuest(character, id);
    return quest.canAccept();
  }

  async accept(character, { id }) {
    const quest = this.getQuest(character, id);
    quest.accept();
    return await this.updateQuest(character, id, quest);
  }

  async advance(character, { id, data }) {
    const quest = this.getQuest(character, id);
    quest.advance(data);
    return await this.updateQuest(character, id, quest);
  }

  async reject(character, { id }) {
    const quest = this.getQuest(character, id);
    quest.changeStatus('rejected');
    return await this.updateQuest(character, id, quest);
  }

  async claim(character, { id }) {
    const quest = this.getQuest(character, id);
    if (quest.coordinates && this.dungeon.character.coordinates(character) !== quest.coordinates) {
      throw new Error('cannot claim reward here');
    }
    quest.changeStatus('completed');
    try {
      await quest.claimRewards();
    } catch (err) {
      console.log('quest reward failed', err);
      quest.status = 'claiming';
      Sentry.withScope(scope => {
        scope.setExtras({ ...quest.toJSON() });
        Sentry.captureException(err);
      });
    }
    return await this.updateQuest(character, id, quest);
  }

  async updateQuest(character, id, quest) {
    const { DungeonAdmin } = this.dungeon.contracts;
    const { status, data } = quest;
    const tx = await DungeonAdmin.updateQuest(
      character,
      id,
      Object.keys(TRANSITIONS).indexOf(status),
      quest.encodeData(data),
    );
    try {
      await tx.wait();
    } catch (e) {
      console.log('quest update tx failed', e);
      Sentry.withScope(scope => {
        scope.setExtras({ tx, id, quest, character });
        Sentry.captureException(e);
      });
      throw e;
    }
    return quest;
  }
}

module.exports = Quests;
