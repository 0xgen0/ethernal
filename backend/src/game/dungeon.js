const Sentry = require('@sentry/node');
const taim = require('taim');
const { events, pastEvents, provider } = require('../db/provider');
const Mutex = require('../db/mutex');
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
const { uint256 } = require('../data/utils');
const drawMap = require('../utils/drawMap.js');
const { coordinatesToLocation } = require('./utils');

class Dungeon {
  constructor({ contracts, sockets, leaderboard }) {
    this.contracts = contracts;
    this.sockets = sockets;
    this.leaderboard = leaderboard;

    this.mutex = new Mutex();

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
    console.log('deferring events from block', block);

    const lastProcessed = await events.lastProcessedBlock();
    let fromBlock = lastProcessed || this.firstBlock;
    console.log('fast forwarding dungeon from block', fromBlock)

    const components = [
      this.map,
      this.gear,
      this.elements,
      this.character,
      this.randomEvents,
      this.trading,
      this.quests,
      this.keeper,
    ];

    components.forEach(component => component.registerEventHandlers());
    await Promise.all(
      components.map(component => component.storeSchema()),
    );

    await taim('replay', events.replay(fromBlock, this.initBlock));

    await this.keeper.applyDataUpdates();
    await this.quests.initSharedData();
    await this.keeper.checkForeclosures();

    console.log('processing events missed during initialization');
    if (this.initBlock === 'latest') {
      const dropped = events.takeDeferredEvents();
      console.log(`dropping ${dropped.length} deferred events`);
    }
    const deferred = await events.processDeferred();
    console.log('deferred events processed', deferred);

    const leaderboard = await this.character.hallOfFame();
    const weekly = await this.character.weeklyLeaderboard();
    console.log('initialized leaderboard, top character is', leaderboard.length > 0 && leaderboard[0].characterName);
    console.log('weekly top is', weekly.length > 0 && weekly[0].characterName);

    console.log(drawMap(await this.map.roomsAround()));

    // TODO sync of the joined rooms between sockets should be handled in sockets.js
    this.sockets.on('connected', async character => {
      const coordinates = await this.character.coordinates(character) || {};
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

  async handleCharacterJoined({ character }) {
    await this.map.updateOnlineCharacters(character);
    const characterInfo = await this.character.info(character);
    if (characterInfo) {
      this.sockets.emit('character-joined', { character, characterInfo });
    }
  }

  async handleCharacterLeft({ character }) {
    await this.map.updateOnlineCharacters(character);
    this.sockets.emit('character-left', { character });
  }

  async handleMetaTxError(character, error) {
    console.log(`character ${character} metatransaction error:`, error.reason);
    const info = await this.character.info(
      character,
      await this.reloadPlayerInfo(character, await this.reloadCharacterStats(character)),
    );
    await this.map.reorgRoom(info.coordinates, [info]);
    this.debug.metatxFails.push({ character, error, date: new Date().toISOString() });
    Sentry.withScope(scope => {
      scope.setExtras({ character });
      Sentry.captureException(error);
    });
  }

  async handleChatMessage(character, message) {
    const coordinates = await this.character.coordinates(character);
    if (coordinates) {
      this.sockets.emitRoom(coordinates, 'chat-message', { coordinates, character, message });
    }
  }

  async room(coordinates) {
    return this.map.roomAt(coordinates);
  }
}

module.exports = Dungeon;
