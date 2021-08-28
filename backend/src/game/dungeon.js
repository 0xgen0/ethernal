const Sentry = require('@sentry/node');
const fetch = require('node-fetch');
const jsonDiff = require('json-diff');
const { events, pastEvents, provider } = require('../db/provider');
const Character = require('./character.js');
const Combat = require('./combat.js');
const DungeonMap = require('./map.js');
const Gear = require('./gear.js');
const Elements = require('./elements.js');
const RandomEvents = require('./randomEvents.js');
const Trading = require('./trading.js');
const Quests = require('./quests.js');
const Keeper = require('./keeper.js');
const Cheats = require('./cheats.js');
const { uint256, mapValues } = require('../data/utils');
const drawMap = require('../utils/drawMap.js');
const { coordinatesToLocation } = require('./utils');

class Dungeon {
  constructor(contracts, sockets, leaderboard) {
    this.contracts = contracts;
    this.sockets = sockets;
    this.leaderboard = leaderboard;

    this.map = new DungeonMap(this);
    this.combat = new Combat(this);
    this.character = new Character(this);
    this.gear = new Gear(this);
    this.elements = new Elements(this);
    this.randomEvents = new RandomEvents(this);
    this.trading = new Trading(this);
    this.quests = new Quests(this);
    this.keeper = new Keeper(this);
    this.cheats = new Cheats(this);

    this.debug = {
      moveEvents: [],
      reorgs: [],
      metatxFails: [],
      removedMoveEvents: [],
      removedLogs: [],
      desync: [],
    };
  }

  async init() {
    const [{ blockNumber }] = await pastEvents('Dungeon', 'RoomDiscovered', [uint256(coordinatesToLocation('0,0'))]);
    this.firstBlock = blockNumber;
    console.log('first dungeon block', this.firstBlock);

    this.initBlock = process.env.LATEST_INIT_BLOCK
      ? 'latest'
      : Number((await provider.send('eth_getBlockByNumber', ['latest', false])).number);
    console.log('initializing data from block', this.initBlock);
    const block = await events.deferEvents();
    console.log('defering events from block', block);

    this.map.registerEventHandlers();
    this.gear.registerEventHandlers();
    this.elements.registerEventHandlers();
    this.character.registerEventHandlers();
    this.randomEvents.registerEventHandlers();
    this.trading.registerEventHandlers();
    this.quests.registerEventHandlers();
    this.keeper.registerEventHandlers();

    let fromBlock = this.firstBlock;
    let snapshot = null;
    if (this.initBlock !== 'latest') {
      snapshot = await this.loadSnapshot();
      if (snapshot) {
        fromBlock = snapshot.blockNumber + 1;
      }
    }

    await this.gear.fetchAll(fromBlock, this.initBlock, snapshot);
    await this.map.fetchAllRooms(fromBlock, this.initBlock, snapshot);
    await this.character.fetchAll(fromBlock, this.initBlock, snapshot);
    await this.elements.fetchAll(fromBlock, this.initBlock, snapshot);
    await this.map.fetchCharacterMovements(fromBlock, this.initBlock, snapshot);
    await this.map.fetchDeadCharacters(fromBlock, this.initBlock, snapshot);
    await this.randomEvents.fetchAll(fromBlock, this.initBlock, snapshot);
    await this.quests.fetchAll(fromBlock, this.initBlock, snapshot);
    await this.keeper.fetchAll(fromBlock, this.initBlock, snapshot);

    console.log('processing events missed during initialization');
    if (this.initBlock === 'latest') {
      const dropped = events.takeDeferredEvents();
      console.log(`dropping ${dropped.length} deferred events`);
    }
    const deferred = await events.processDeferred();
    console.log('deferred events processed', deferred);

    const leaderboard = this.hallOfFame();
    const weekly = this.weeklyLeaderboard();
    console.log('initialized leaderboard, top character is', leaderboard.length > 0 && leaderboard[0].characterName);
    console.log('weekly top is', weekly.length > 0 && weekly[0].characterName);

    console.log(drawMap(this.rooms));

    // TODO sync of the joined rooms between sockets should be handled in sockets.js
    this.sockets.on('connected', character => {
      const { coordinates } = this.character.info(character) || {};
      if (coordinates) {
        this.sockets.move(character, null, coordinates);
      }
    });

    this.sockets.on('joined', this.handleCharacterJoined.bind(this));
    this.sockets.on('left', this.handleCharacterLeft.bind(this));
    this.sockets.onCharacter('metatx-error', this.handleMetaTxError.bind(this));
    this.sockets.onCharacter('chat-message', this.handleChatMessage.bind(this));

    this.initialized = true;
  }

  handleCharacterJoined({ character }) {
    this.map.updateOnlineCharacters(character);
    const characterInfo = this.character.info(character);
    if (characterInfo) {
      this.sockets.emit('character-joined', { character, characterInfo });
    }
  }

  handleCharacterLeft({ character }) {
    this.map.updateOnlineCharacters(character);
    this.sockets.emit('character-left', { character });
  }

  async handleMetaTxError(character, error) {
    console.log(`character ${character} metatransaction error:`, error.reason);
    await this.character.reloadCharacterStats(character);
    const info = this.character.info(character);
    await this.map.reorgRoom(info.coordinates, [info]);
    this.debug.metatxFails.push({ character, error, date: new Date().toISOString() });
    Sentry.withScope(scope => {
      scope.setExtras({ character });
      Sentry.captureException(error);
    });
  }

  handleChatMessage(character, message) {
    const { coordinates } = this.character.info(character) || {};
    if (coordinates) {
      this.sockets.emitRoom(coordinates, 'chat-message', { coordinates, character, message });
    }
  }

  hallOfFame() {
    const parents = new Set(Object.values(this.character.lineage).flat());
    return Object.values(this.characters)
      .filter(({ character }) => !parents.has(Number(character)))
      .sort((a, b) => b.stats.xp - a.stats.xp)
      .map(({ character }, i) => {
        const cached = this.characters[character];
        cached.hallOfFame = i + 1;
        return cached;
      });
  }

  weeklyLeaderboard() {
    const parents = new Set(Object.values(this.character.lineage).flat());
    return Object.values(this.characters)
      .map(({ character }) => {
        const cached = this.characters[character];
        cached.weeklyXp = this.leaderboard.weeklyXp(cached);
        return cached;
      })
      .filter(({ character }) => !parents.has(Number(character)))
      .sort((a, b) => b.weeklyXp - a.weeklyXp)
      .map(({ character }, i) => {
        const cached = this.characters[character];
        cached.weeklyRank = i + 1;
        return cached;
      });
  }

  async snapshot() {
    const blockNumber = await events.deferEvents();
    const { balances, data } = this.gear;
    const result = JSON.stringify(
      {
        blockNumber,
        version: process.env.COMMIT,
        contracts: mapValues(this.contracts, ({ address }) => address),
        rooms: this.rooms,
        moves: this.map.moves,
        character: {
          data: this.character.data,
          lineage: this.character.lineage,
        },
        balances: this.elements.balances,
        gear: { balances, data },
        keeper: this.keeper,
        randomEvents: {
          lastHash: this.randomEvents.lastHash,
        },
      },
      (key, value) => (value instanceof Set ? [...value] : value),
    );
    events.processDeferred();
    return result;
  }

  async loadSnapshot() {
    let snapshot = null;
    const url = process.env.SNAPSHOT;
    if (url) {
      try {
        snapshot = await fetch(url).then(res => res.json());
        const contractAddresses = mapValues(this.contracts, ({ address }) => address);
        const contractsDifference = jsonDiff.diff(snapshot.contracts, contractAddresses);
        if (contractsDifference) {
          console.log('snapshot is from different contracts', contractsDifference);
        }
        console.log(`using snapshot from block ${snapshot.blockNumber}`);
      } catch (e) {
        console.log('snapshot loading failed', e);
      }
    }
    return snapshot;
  }

  get characters() {
    return this.character.data;
  }

  get rooms() {
    return this.map.rooms;
  }

  get debugData() {
    const balances = mapValues({ ...this.gear.balances }, b => Array.from(b));
    return { ...this.debug, gear: { balances }, balances: this.elements.balances };
  }
}

module.exports = Dungeon;
