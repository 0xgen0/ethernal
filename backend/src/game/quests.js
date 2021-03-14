const Sentry = require('@sentry/node');
const { events, db } = require('../db/provider');
const { mapValues, toMap } = require('../data/utils');
const DungeonComponent = require('./dungeonComponent');
const TRANSITIONS = require('./quest/transitions');
const Minimap = require('./quest/minimap');
const CanaryFragments = require('./quest/canaryFragments');
const Alchemist = require('./quest/alchemist');
const { UnlockLevel1, UnlockLevel2, UnlockLevel3, UnlockLevel4, UnlockLevel5, UnlockLevel6, UnlockLevel7, UnlockLevel8 } = require('./quest/nextLevel');

class Quests extends DungeonComponent {
  available = {};
  shared = {};

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
    const { Dungeon } = this.contracts;
    events.on(Dungeon, 'QuestUpdate', this.handleQuestUpdate.bind(this));
  }

  async initSharedData()  {
    await Promise.all(Object.entries(this.available).map(async ([id, Quest]) => {
      if (!this.shared[id]) {
        this.shared[id] = await Quest.initSharedData(this.dungeon);
      }
    }));
  }

  async advanceHandler(character, data) {
    const quests = mapValues(await this.getAll(character), async (quest, id) => {
      if (['discovered', 'accepted'].includes(quest.status)) {
        try {
          const result = await quest.advanceHandler(data);
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

  async getQuest(character, id) {
    if (!this.available[id]) {
      throw new Error('quest doesnt exists');
    }
    let quest = await this._quest(character, id);
    if (!quest) {
      const parent = await this.dungeon.character.parent(character);
      let inherited;
      if (parent) {
        const q = await this.getQuest(parent, id);
        if (q.status && q.status === 'completed') {
          inherited = q;
        }
      }
      quest = inherited || new this.available[id](this.dungeon, character, id);
    }
    return quest;
  }

  async getAll(character) {
    const quests = await Promise.all(Object.keys(this.available).map(async id => ([id, await this.getQuest(character, id)])));
    return toMap(quests);
  }

  async handleQuestUpdate(character, id, statusCode, data, event, init = false) {
    character = character.toString();
    id = id.toString();
    const status = Object.keys(TRANSITIONS)[Number(statusCode)];
    const quest = await this.getQuest(character, id);
    data = quest.decodeData(data);
    quest.status = status;
    quest.data = data;
    if (!init) {
      console.log('quest update', id, status, data);
      await quest.handleUpdate();
      await this.store([[character, id, statusCode, quest.encodeData(data)]]);
    }
    this.sockets.emit('quest-update', { character, id, quest });
  }

  async canAccept(character, { id }) {
    const quest = await this.getQuest(character, id);
    return quest.canAccept();
  }

  async accept(character, { id }) {
    const quest = await this.getQuest(character, id);
    await quest.accept();
    return await this.updateQuest(character, id, quest);
  }

  async advance(character, { id, data }) {
    const quest = await this.getQuest(character, id);
    await quest.advance(data);
    return await this.updateQuest(character, id, quest);
  }

  async reject(character, { id }) {
    const quest = await this.getQuest(character, id);
    quest.changeStatus('rejected');
    return await this.updateQuest(character, id, quest);
  }

  async claim(character, { id }) {
    const quest = await this.getQuest(character, id);
    const coordinates = await this.dungeon.character.coordinates(character);
    if (quest.coordinates && coordinates !== quest.coordinates) {
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
    const { DungeonAdmin } = this.contracts;
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

  async storeSchema() {
    return db.tx(t => {
      t.query(`
        CREATE TABLE IF NOT EXISTS ${db.tableName('quest')} (
            characterId numeric(256),
            questId numeric(256),
            questStatus numeric(16),
            questData varchar,
            PRIMARY KEY (characterId, questId))
      `);
    });
  }

  async store(questRows) {
    return db.tx(t => {
      questRows.forEach(row =>
        t.query(
          `INSERT INTO ${db.tableName('quest')} (characterId, questId, questStatus, questData) VALUES ($1,$2,$3,$4)
              ON CONFLICT (characterId, questId) DO UPDATE
              SET questStatus = excluded.questStatus,
                  questData = excluded.questData`,
          row,
        ));
    });
  }

  async _quest(character, id) {
    const { rows } = await db.query(`SELECT * FROM ${db.tableName('quest')} WHERE characterId = $1 AND questId = $2`, [character, id]);
    if (rows.length) {
      const { queststatus, questdata } = rows[0];
      const quest = new this.available[id](this.dungeon, character, id);
      quest.data = quest.decodeData(questdata);
      quest.status = Object.keys(TRANSITIONS)[Number(queststatus)];
      return quest;
    } else {
      return null;
    }
  }
}

module.exports = Quests;
