/* eslint-disable class-methods-use-this,no-use-before-define,no-console */
import io from 'socket.io-client';
import { writable, get, derived } from 'svelte/store';
import { subscribe } from 'svelte/internal';
import { BigNumber } from 'ethers';
import retry from 'p-retry';
import equal from 'fast-deep-equal';
import log from 'utils/log';

import config from 'data/config';
import Dungeon from 'lib/dungeon';
import ReadOnly from 'lib/readOnly';
import roomGenerator from 'lib/roomGenerator';
import Moves from './moves';
import wallet from 'stores/wallet';
import { mapModal, notificationOverlay } from 'stores/screen';
import { inflictionText, receivedText, classPortrait, gearImage } from 'utils/data';
import { combatText, statusesText, classes, notifications } from 'data/text';
import quests from 'data/quests';
import Message from 'lib/chat';
import { humanizeJoin, pluralize } from 'utils/text';
import { bfs, encodeDirections, parseCoordinates, aroundCoordinates, identity } from 'utils/utils';
import Walker from './walker';
import cacheUrl from './cacheUrl';

class Cache {
  constructor(url, character, dungeon) {
    this.url = url;
    this.dungeon = dungeon;
    this.rooms = {};
    this.moves = new Moves();
    this.subscribed = new Set();
    _characterId.set(character);
  }

  async init() {
    if (!this.initialized) {
      this.initialized = initialize.bind(this)();
    }
    return this.initialized;

    async function initialize() {
      log.info('initializing cache');
      this.callbacks = {};
      this.privileged = false;

      this.socket = io(this.url)
        .on('connect', () => log.info('socket connected'))
        .on('privileged', () => (this.privileged = true))
        .on('hello', () => {
          this.dungeon.delegateWallet.signMessage(this.socket.id).then(signature => {
            this.socket.emit('idelegate', `${this.characterId}:${signature}`);
            log.info(`joined as ${this.characterId}`);
          });
        });

      await this.once('accepted');
      await this.fetchAll();

      // welcome screen
      const alchemistQuest = get(characterQuests)[2];
      if (alchemistQuest.status === 'discovered') {
        this.action('accept-quest', { id: 2 });
        mapModal.open('characterEntered');
        this.pushHistory(statusesText.entered);
      }

      // !!!!
      // @TODO - Map these event listners to functions for clarity, cleaner code
      // !!!!

      this.on('character-joined', ({ characterInfo: info }) => {
        // I DONT THINK THIS GETS CALLED AS JOINED CALLS BEFORE THE AWAITS BEFORE
        if (info.character === this.characterId) {
          log.info('my character joined', info);
          if (info.status && !info.status.newCharacter && this.currentRoom) {
            this.pushHistory(this.currentRoom.entry, 1);
          }
          return;
        }

        log.info('character joined', info);
        this.applyCharacterInfo(info);
        this._emitUpdate('onlineCharacterAdded', info);
      });

      this.on(
        'left',
        ({ character }) => this.characterLeft(character),
        ({ character }) => character !== this.characterId,
      );

      this.on('ready', () => {
        log.info(`backend restarted, reloading ...`);
        window.location.reload();
      });

      this.on('update', update => this.applyUpdate(update));
      this.on('reorg', update => this.applyUpdate(update, true));

      this.on('move', e => {
        this.applyRoomUpdates(e.roomUpdates);
        this.applyStatusUpdates(e.statusUpdates);
        this.applyMove(e);
        this.applyCharacterInfo(e.characterInfo);
        this.calculateReachableRooms();
      });

      this.on('teleport-discovered', room => {
        _poiRooms.teleports.set([...get(_poiRooms.teleports), room]);
      });

      this.on('chat-message', async ({ coordinates, character: id, message }) => {
        // Skip if not in room, in case BE does not leave room or char leaves before final message sent
        if (coordinates !== this.characterCoordinates) {
          return;
        }

        let character = get(_onlineCharacters)[id];
        if (!character) {
          character = await fetchCache(`characters/${id}`);
        }
        const msg = new Message({ character, type: 'public', message });
        chatMessages.add(await msg.generate());
      });

      this.on('trade', async ({ character: id, trade }) => {
        if (!trade) {
          _currentTrade.set(null);
          return;
        }

        let character = get(_onlineCharacters)[id];
        if (!character) {
          character = await fetchCache(`characters/${id}`);
        }
        const msg = new Message({ character, type: 'private', message: { action: 'trade', trade } });
        chatMessages.add(await msg.generate());

        // Mark as completed/cancelled by clearing currentTrade
        if (['completed', 'denied'].includes(trade.status)) {
          _currentTrade.set(null);
          return;
        }

        _currentTrade.set({ character, trade });
      });

      this.on('rewards-claimed', async e => {
        this.applyStatusUpdates(e.statusUpdates);
        if (e.statusUpdates[this.characterId]) {
          await this.fetchAndApplyCharacterInfo();
        }
        log.info(`rewards claimed by ${e.character}`, e.statusUpdates);
      });

      this.on('acknowledged-death', async e => {
        this.applyStatusUpdates(e.statusUpdates);
        log.info(`acknowledged death ${e.character}`, e.statusUpdates);
      });

      this.on('combat-help', ({ character: id, roomUpdates, coordinates }) => {
        if (coordinates === this.characterCoordinates) {
          this.applyRoomUpdates(roomUpdates);
        } else {
          const character = get(_onlineCharacters)[id];
          const [x, y, z = 0] = coordinates.split(',');
          const text = combatText.help({ player: character.characterName || 'Someone', x, y, z });
          notificationOverlay.open('generic', { coordinates, text, timeout: 15000 });
        }
      });

      this.on(
        'monster-attacked',
        ({ character, roomUpdates, statusUpdates, coordinates }) => {
          log.info(`monster attacked in ${coordinates}`, roomUpdates);

          let duel;
          const { combat } = statusUpdates[character];
          if (combat) {
            duel = combat.duels[character];
          }

          // @TODO: this should be root event property, it shouldn't be necessary to dive down to get it
          const turnAction = duel && duel.log.length > 0 ? duel.log[duel.log.length - 1] : null;

          // If current player, start combat reveal before we update currentCombat
          if (character === this.characterId) {
            log.info('myDuelTurn', {
              combat,
              characterStatus: this.characterStatus,
              turnAction,
            });
            this._emitUpdate('myDuelTurn', {
              combat,
              characterStatus: this.characterStatus,
              turnAction,
            });
            _characterHP.set(duel.attacker.stats.health);
          }

          // Update room and status (incld. currentCombat)
          // (Possible race condition with combat revealTurn via emit event and setting cache.currentCombat...)
          this.applyRoomUpdates(roomUpdates);
          this.applyStatusUpdates(statusUpdates);

          // Update other player's turn
          if (character !== this.characterId) {
            log.info('otherDuelTurn', {
              character,
              characterData: duel.attacker,
              turnAction,
            });
            this._emitUpdate('otherDuelTurn', {
              character,
              characterData: duel.attacker,
              turnAction,
            });
          }
        },
        ({ coordinates }) => coordinates === this.characterCoordinates,
      );

      this.on('monster-defeated', e => {
        this.applyRoomUpdates(e.roomUpdates);
        this.applyStatusUpdates(e.statusUpdates);
        this.calculateReachableRooms();
        log.info(`monster defeated in ${e.coordinates}`, e.roomUpdates);
        if (e.coordinates === this.currentRoom.coordinates) {
          this._emitUpdate('monsterDefeated');
        }
      });

      this.on('character-escaped', ({ character, coordinates, statusUpdates }) => {
        this.applyStatusUpdates(statusUpdates);
        if (coordinates === this.characterCoordinates) {
          if (character === this.characterId) {
            this._emitUpdate('characterEscaped', character);
          } else {
            this._emitUpdate('otherCharacterEscaped', character);
          }
        }
        log.info(`character escaped`, statusUpdates);
      });

      this.on('character-defeated', async e => {
        this.applyStatusUpdates(e.statusUpdates);
        if (e.statusUpdates[this.characterId]) {
          await this.fetchAndApplyCharacterInfo();
          log.info('died');
        }
        log.info(`character defeated at ${e.coordinates}`, e.statusUpdates);
        if (e.coordinates === this.currentRoom.coordinates && this.currentDuel) {
          if (e.character === this.characterId) {
            this._emitUpdate('characterDefeated');
          } else {
            this._emitUpdate('otherCharacterDefeated', e.character);
          }
        }
      });

      this.on(
        'levelup',
        _ => this.fetchAndApplyCharacterInfo(),
        ({ character }) => character === this.characterId,
      );

      this.on('heal', ({ characterInfo }) => this.applyCharacterInfo(characterInfo));

      this.on(
        'refill',
        ({ characterInfo }) => {
          this.applyCharacterInfo(characterInfo);
          this.calculateReachableRooms();
        },
        ({ character }) => character === this.characterId,
      );

      this.on(
        'equip',
        _ => this.fetchAndApplyCharacterInfo(),
        ({ character }) => character === this.characterId,
      );

      this.on(
        'gear-broken',
        ({ gear }) => {
          console.log('gear broken', gear);
          const text = statusesText.gearBroken(gear);
          this.pushHistory(text, 0);
          notificationOverlay.open('generic', { text, image: gearImage(gear) });
        },
        ({ character }) => character === this.characterId,
      );

      this.on(
        'scavenge',
        async e => {
          log.info('scavenge', e);
          this.pushHistory(this.scavengeEventToText(e), 0);
        },
        ({ coordinates }) => coordinates === this.characterCoordinates,
      );

      this.on('unique-gear-minted', e => {
        this.fetchUniqueGearAvailable();

        if (e.character === this.characterId) {
          this.pushHistory(statusesText.rareArtFound);
        } else {
          // how to mock, run in console:
          // `cache.socket._callbacks['$unique-gear-minted'][0]({ character: 1, gear: { ... } })`
          notificationOverlay.open('uniqueGearMinted', e);
        }
      });

      this.on('claimed-ubf', console.log);

      this.on('monster-spawned', ({ coordinates }) => {
        const rooms = new Set(get(_poiRooms.monster));
        rooms.add(coordinates);
        _poiRooms.monster.set(Array.from(rooms));
      });

      this.on('monster-defeated', ({ coordinates }) => {
        const rooms = new Set(get(_poiRooms.monster));
        rooms.delete(coordinates);
        _poiRooms.monster.set(Array.from(rooms));
      });

      this.on('boss-spawned', ({ coordinates, monster }) => {
        // how to mock, run in console:
        // `cache.socket._callbacks['$boss-spawned'][0]({ coordinates: '0,0', monster: { ... } })`
        console.log('boss spawned', coordinates, monster);
        this.fetchPoiRooms('boss');
        if (this.characterCoordinates !== coordinates) {
          notificationOverlay.open('bossSpawned', { coordinates, monster });
        }
      });

      this.on('npc-spawned', ({ coordinates, npc }) => {
        console.log('npc spawned', coordinates, npc);
        this.fetchPoiRooms('npc');
        if (this.characterCoordinates !== coordinates && npc.type === 'alchemist' && !npc.personal) {
          notificationOverlay.open('npcSpawned', { coordinates, npc });
        }
      });

      this.on('npc-killed', ({ coordinates }) => {
        console.log('npc killed', coordinates);
        this.fetchPoiRooms('npc');
      });

      this.on('chest-spawned', ({ coordinates }) => {
        console.log('chest spawned', coordinates);
        this.fetchPoiRooms('chest');
      });

      this.on('ability-used', ({ ability, character, coordinates }) => {
        console.log(`dungeon keeper ${character} used ability at ${coordinates}`, ability);
        // how to mock, run in console:
        // `cache.socket._callbacks['$ability-used'][0]({ character: 1, ability: { monster: true }, coordinates: '0,0' })`
        if (!ability.local) {
          notificationOverlay.open('roomAbilityAdded', { ability, character, coordinates });
        }
      });

      this.on('room-name', ({ characterInfo, coordinates, room }) => {
        const { characterName } = characterInfo;
        const { customName } = room;
        const [x, y, z = 0] = coordinates.split(',');
        const text = notifications.roomRename({ x, y, z, characterName, customName, timeout: 15000 });
        notificationOverlay.open('generic', { text, coordinates });
      });

      this.on('ubf-available', ({ slot }) => {
        console.log(`new ubf slot`, slot);
        // how to mock, run in console:
        // `cache.socket._callbacks['$ubf-available'][0]({ slot: 123 })`
        notificationOverlay.open('generic', { text: notifications.ubfAvailable, timeout: 900000 });
      });

      this.on('foreclosure-update', ({ added = [], removed = [] }) => {
        const rooms = new Set(get(foreclosedRooms));
        added.forEach(coordinates => rooms.add(coordinates));
        removed.forEach(coordinates => rooms.delete(coordinates));
        _poiRooms.foreclosed.set([...rooms]);

        // Show only first added room even if multiple provided.
        if (added.length > 0) {
          // how to mock, run in console:
          // `cache.socket._callbacks['$foreclosure-update'][0]({ added: ['0,0'] })`
          notificationOverlay.open('roomSale', { coordinates: added[0] });
        } else if (removed.length > 0) {
          // how to mock, run in console:
          // `cache.socket._callbacks['$foreclosure-update'][0]({ removed: ['0,0'] })`
          notificationOverlay.open('roomSale', { coordinates: removed[0], sold: true });
        }
      });

      this.on('bounty-added', ({ character, coordinates, characterInfo, room }) => {
        if (character !== this.characterId) {
          notificationOverlay.open('generic', {
            text: `<em>${characterInfo.characterName}</em> added a bounty on a monster.`,
            coordinates
          });
        }
        this.fetchPoiRooms('bounty');
      });

      this.on('bounty-claimed', ({ coordinates, characterInfo, room }) => {
        this.fetchPoiRooms('bounty');
      });

      this.on(
        'transfer',
        async ({ from, to, room }) => {
          console.log('room transfered', { from, to, room });
          this.subscribeRooms(await this.fetchKeeper());
        },
        ({ from, to, room }) => room && (from === this.playerAddress || to === this.playerAddress),
      );

      this.on(
        'income',
        ({ coordinates, income, total }) => {
          console.log('income received', { coordinates, income });
          _keeperIncome.set(total);
        },
        ({ benefactor }) => benefactor === this.playerAddress,
      );

      this.on('chest-opened', ({ coordinates, character, reward }) => {
        console.log('chest opened', { coordinates, character, reward });
        this.fetchPoiRooms('chest');
        this.fetchAndApplyCharacterInfo();
      });

      this.on(
        'quest-update',
        async ({ id, character, quest }) => {
          mapModal.close();
          await this.fetchQuests();
          questUpdate.set({ id, quest });
          if (character === this.characterId) {
            this._emitUpdate('characterUpdated', { character, coordinates: this.characterCoordinates });
          }
          if (quests[id] && quests[id].notification && quest.status === 'claiming') {
            notificationOverlay.open('questFinish', { questId: id });
          }
        },
        ({ character }) => character === this.characterId,
      );

      this.on('transfer', transfer => {
        console.log('TRANSFER', transfer);
      });

      this.on('exchange', exchange => {
        console.log('EXCHANGE', exchange);
      });

      this.on('subscribe-rooms-reply', rooms => {
        this.applyRoomUpdates(rooms);
        this.updateKeeperRooms(); // TODO we should probably have this.rooms as the store or atleast subscribed rooms set
        this.calculateReachableRooms();
      });

      this.on('chest-updated', ({ coordinates }) => {
        console.log('chest updated', coordinates);
        this.fetchPoiRooms('chest');
      });

      this.on('boss-defeated', ({ coordinates, combat, rewards }) => {
        // how to mock, run in console:
        // `cache.socket._callbacks['$boss-defeated'][0]({ coordinates: '0,0', combat: { ... }, rewards: { ... } })`
        console.log('boss defeated', coordinates, combat, rewards);
        this.fetchPoiRooms('boss');
        notificationOverlay.close();
      });

      this.on(
        'status',
        e => {
          const statusUpdates = {};
          statusUpdates[e.character] = { status: e.status };
          this.applyStatusUpdates(statusUpdates);
        },
        () => true,
        2,
      );

      this.walker = new Walker(this);
      log.info('cache initialized');
    }
  }

  on(eventName, callback, filter, priority = 0) {
    const has = filter || (() => true);
    this.socket.on(eventName, event => {
      if (has(event)) {
        log.info(`event: ${eventName}`, event);
        setTimeout(() => callback(event), priority);
      }
    });
  }

  async action(type, actionData) {
    this.socket.emit(type, actionData);

    return new Promise(resolve => {
      // @TODO: make this more modular (handling related to the specific action should be where the action is triggered)
      // @TODO: consider moving to lang file
      this.socket.once(`${type}-reply`, data => {
        switch (type) {
          case 'attack': {
            this.pushHistory(combatText.attack);
            break;
          }
          case 'escape': {
            let text;
            if (data.success) {
              const turn = inflictionText(data.turn.inflictions.defender);
              text = combatText.escape.success({ turn });
            } else {
              text = combatText.escape.failure;
            }
            this.pushHistory(text);
            break;
          }
          case 'finish': {
            const reward = get(rewardsToCollect);
            const notifyAboutEquip = reward && reward.gear && get(defaultGearEquipped);
            this.pushHistory(combatText.finish.success);
            if (notifyAboutEquip) {
              this.pushHistory(combatText.finish.notifyEquip);
            }
            break;
          }
          default: {
            break;
          }
        }
        resolve(data);
      });
    });
  }

  async move(coordinates) {
    const destination = this.reachableRooms[coordinates];
    if (!destination) {
      throw new Error('room is not reachable');
    }
    const directions = encodeDirections(destination.parent.path);
    log.info('movement triggered to', coordinates, destination.parent.path, destination, this.characterCoordinates);
    if (directions.length === 0) {
      throw new Error('you are already there');
    } else if (directions.length === 1) {
      return this.dungeon.move(directions[0]);
    } else {
      return this.dungeon.movePath(directions);
    }
  }

  onMove(callback) {
    this.on('move', callback, e => e.character === this.characterId, 2);
  }

  onAnyMove(callback) {
    this.on('move', callback, () => true);
  }

  onStatusUpdate(callback) {
    this.dungeon.on('status', callback);
  }

  async once(eventName, filter = () => true) {
    return new Promise(resolve => {
      const cb = event => {
        if (filter(event)) {
          this.socket.off(eventName, cb);
          resolve(true);
        }
      };
      this.socket.on(eventName, cb);
    });
  }

  async onceMoved() {
    return this.once('move', e => e.character === this.characterId);
  }

  async onceEquipped(gear) {
    return this.once('equip', e => e.character === this.characterId && e.gear.id === gear.id);
  }

  async onceLevelUp(newLevel) {
    return this.once('levelup', e => e.character === this.characterId && e.newLevel === newLevel);
  }

  async onceRefill() {
    return this.once('refill', e => e.character === this.characterId);
  }

  async fetchAll() {
    log.info('loading dungeon data');
    await Promise.all([
      this.fetchOnlineCharactersInfo(),
      this.fetchUniqueGearAvailable(),
      this.fetchPoiRooms('boss'),
      this.fetchPoiRooms('npc'),
      this.fetchPoiRooms('chest'),
      this.fetchPoiRooms('teleports'),
      this.fetchPoiRooms('monster'),
      this.fetchPoiRooms('foreclosed'),
      this.fetchPoiRooms('bounty'),
      this.fetchKeeperAbilities(),
    ]);

    log.info(`loading character info ${this.characterId}`);
    const info = await retry(
      () =>
        this.fetch(`characters/${this.characterId}`).then(async info => {
          if (info.characterId === this.characterId) {
            return info;
          } else {
            throw new Error('backend not ready');
          }
        }),
      {
        onFailedAttempt: e => log.info(e.message),
      },
    );
    this.applyCharacterInfo(info);

    log.info(`loading additional character info ${this.characterId}`);
    await Promise.all([]);

    await Promise.all([
      this.fetchVault(),
      this.fetchQuests(),
      this.fetchKeeper(),
      this.fetchKeeperIncome(),
      this.fetch(`characters/${this.characterId}/moves`).then(moves => {
        moves.map(move => this.moves.useExits(move));
        console.log('moves fetched', moves, this.moves);
      }),
      this.fetch(`characters/${this.characterId}/status`).then(status =>
        this.applyStatusUpdates({ [this.characterId]: status }),
      ),
    ]);

    const { coordinates } = info;

    log.info(`characters is at ${coordinates}`, info);

    const initialCoordinates = aroundCoordinates(coordinates, 20);
    console.log('fetching rooms', initialCoordinates);
    const rooms = await this.subscribeRooms(initialCoordinates);
    console.log('rooms fetched', rooms);
    this.applyRoomUpdates(rooms);

    const characterRoom = this.rooms[coordinates];
    if (!this.currentCombat && characterRoom && characterRoom.combat) {
      _currentCombat.set(characterRoom.combat);
    }
    if (characterRoom) {
      characterRoom.onlineCharacters = Array.from(new Set([this.characterId, ...characterRoom.onlineCharacters]));
      _currentRoom.set(roomGenerator(characterRoom));
    }
    this.calculateReachableRooms();

    this.subscribeRooms(get(_keeper));
  }

  applyUpdate({ roomUpdates, statusUpdates, characterInfos }, reorg) {
    if (statusUpdates) {
      this.applyStatusUpdates(statusUpdates);
    }
    if (roomUpdates) {
      this.applyRoomUpdates(roomUpdates);
    }
    if (characterInfos) {
      characterInfos.map(info => {
        this.applyCharacterInfo(info);
        if (reorg && info.character === this.characterId && info.coordinates !== this.currentRoom.coordinates) {
          this.applyMove({
            character: this.characterId,
            from: this.currentRoom.coordinates,
            to: info.coordinates,
            mode: 1,
            received: {},
          });
        }
      });
    }
    this.calculateReachableRooms();
  }

  applyRoomUpdates(roomUpdates) {
    roomUpdates.forEach(room => {
      const existingRoom = this.rooms[room.coordinates];
      this.rooms[room.coordinates] = { ...existingRoom, ...room };

      if (this.characterCoordinates === room.coordinates) {
        _currentRoom.set(roomGenerator(this.rooms[room.coordinates]));
        if (room.combat) {
          _currentCombat.set(room.combat);
        }
      }

      this._emitUpdate('roomUpdate', {
        old: existingRoom,
        newest: this.rooms[room.coordinates],
      });
    });
    this.updateKeeperRooms();
  }

  applyStatusUpdates(statusUpdates) {
    const myStatus = statusUpdates[this.characterId];
    log.info('status updates', statusUpdates);
    if (myStatus) {
      log.info('updating my status', myStatus);
      const previousStatus = this.statusData;
      _statusData.set(myStatus);
      _characterStatus.set(myStatus.status);

      if (
        previousStatus &&
        previousStatus.status === 'blocked by monster' &&
        myStatus.status === 'exploring' &&
        !myStatus.escaped
      ) {
        this.pushHistory(statusesText.monsterDead, 3);
      }

      if (myStatus.status === 'dead') {
        this.pushHistory(statusesText.dead, 3);
      }

      if (myStatus.combat) {
        _currentCombat.set(myStatus.combat);
      }

      if (myStatus.rewards) {
        _rewardsToCollect.set(myStatus.rewards[this.characterId]);
      } else {
        _rewardsToCollect.set(null);
      }
      this.calculateReachableRooms();
    }

    _onlineCharacters.update(characters => {
      Object.keys(characters).forEach(key => {
        const statusUpdate = statusUpdates[key];
        if (statusUpdate) {
          characters[key].status = statusUpdate;
        }
      });
      return characters;
    });

    Object.keys(statusUpdates).forEach(key => {
      if (statusUpdates[key]) {
        this._emitUpdate('characterStatus', {
          character: key,
          status: statusUpdates[key].status,
          data: statusUpdates[key],
        });
      }
    });
  }

  applyMove(move, init = false) {
    if (move.character === this.characterId) {
      this.moves.useExits(move);
      const from = this.rooms[move.from];
      const to = this.rooms[move.to];
      const generatedRoom = roomGenerator(to);
      _currentRoom.set(generatedRoom);

      const entryText = [generatedRoom.entry];
      if (move.received.elements) {
        entryText.push(receivedText(move.received, to));
      }
      if (to.combat) {
        entryText.push(statusesText.rooms.monster({ monster: to.combat.monster.name }));
        _currentCombat.set(to.combat);
      } else {
        _currentCombat.set(null);
      }

      this.pushHistory(entryText.filter(s => s).join(' '), 0);
      if (!init) {
        this._emitUpdate('roomUpdate', { old: from, newest: from });
        this._emitUpdate('roomUpdate', { old: to, newest: to });
      }
    }
    _onlineCharacters.update(characters => {
      const character = characters[move.character];
      if (character) {
        character.coordinates = move.to;
      }
      return characters;
    });
    // TODO is this usefull sometime?
    if (!init && !move.path && (move.mode === 2 || move.mode === 0)) {
      log.info('path missing in move event, calculating locally...');
      try {
        move.path = bfs(
          this.rooms,
          this.moves,
          move.from,
          move.character === this.characterId ? get(_characterBalances).keys : move.characterInfo.keys,
        )[move.to].parent.path;
      } catch (_) {
        move.path = bfs(this.rooms, this.moves, move.from, null, 5, true, true)[move.to].parent.path;
      }
    }
    if (!init) {
      this._emitUpdate('characterMoved', move);
    }
  }

  calculateReachableRooms() {
    const previous = cache.reachableRooms;
    const recalculated =
      !this.characterCoordinates || get(needFood) || this.characterStatus !== 'exploring'
        ? {[this.characterCoordinates]: this.currentRoom}
        : bfs(this.rooms, this.moves, this.characterCoordinates, get(_characterBalances).keys);
    if (!equal(previous, recalculated)) {
      _reachableRooms.set(recalculated);
    }
  }

  async getRoom(coordinates) {
    if (this.rooms[coordinates]) {
      return this.rooms[coordinates];
    }
    return this.fetchRoom(coordinates);
  }

  async fetchRoom(coordinates) {
    return this.fetch(`rooms/${coordinates}`);
  }

  async entry() {
    const { location } = await this.fetch('entry');
    return location;
  }

  async teleportCost(destination) {
    return this.fetch(`characters/${this.characterId}/teleportCost/${destination}`);
  }

  async healCost(hp) {
    return this.fetch(`characters/${this.characterId}/healCost/${hp}`);
  }

  async fetch(resource) {
    return fetch(`${this.url}/${resource}`, {
      headers: { Accept: 'application/json' },
    }).then(result => result.json());
  }

  subscribeRooms(coordinates) {
    coordinates = [...coordinates].filter(coords => !this.subscribed.has(coords));
    if (coordinates.length) {
      coordinates.forEach(coord => this.subscribed.add(coord));
      return this.action('subscribe-rooms', { coordinates });
    }
  }

  async fetchMapViewport(floor) {
    const result = await this.fetch(`map/viewport/${floor != null ? floor : this.currentFloor}`);
    return result;
  }

  // TODO kill this, replace with data from event
  async fetchAndApplyCharacterInfo() {
    const info = await this.fetch(`characters/${this.characterId}`);
    logO(info);
    this.applyCharacterInfo(info);
  }

  async fetchHallOfFame() {
    return this.fetch('leaderboards');
  }

  async fetchWeeklyLeaderboard() {
    return this.fetch('leaderboards/weekly');
  }

  async fetchVault() {
    const vault = await this.fetch(`characters/${this.characterId}/vault`);
    const gear = vault.gear.filter(gear => gear.id && gear.name);
    _characterVault.set({ ...vault, gear });
    return vault;
  }

  async fetchQuests() {
    const results = await this.fetch(`characters/${this.characterId}/quests`);
    _characterQuests.set(results);

    // Notable features
    if (results) {
      // Minimap
      if (results[1] && results[1].status === 'completed') {
        _characterFeatures.add('minimap');
      }
      // Dungeon Keeper
      if (results[11] && results[11].status === 'completed') {
        _characterFeatures.add('dungeonKeeper');
      }
    }

    return results;
  }

  async fetchUniqueGearAvailable() {
    try {
      const available = await this.fetch('gear/unique');
      _uniqueGearAvailable.set(available);
      return available;
    } catch (_) {
      return [];
    }
  }

  async fetchKeeperIncome() {
    const keeperIncome = await this.fetch(`keeper/${this.characterId}/income`);
    _keeperIncome.set(keeperIncome);
    return keeperIncome;
  }

  async fetchKeeper() {
    const roomList = await this.fetch(`keeper/${this.characterId}`);
    _keeper.set(roomList);
    this.updateKeeperRooms();
    return roomList;
  }

  async fetchKeeperAbilities() {
    const abilities = await this.fetch('keeper/abilities');
    _keeperAbilities.set(abilities);
    return abilities;
  }

  updateKeeperRooms() {
    const rooms = get(_keeper);
    // @TODO - HOW TO HANDLE ROOMS NOT ON CURRENT FLOOR
    _keeperRooms.set(rooms.map(coordinates => this.rooms[coordinates]).filter(identity));
  }

  async fetchPoiRooms(type) {
    // @TODO - SUPPORT FLOORS
    const rooms = await this.fetch(`rooms/${type}`);
    _poiRooms[type].set(rooms);
    return rooms;
  }

  async fetchOnlineCharactersInfo() {
    const characters = await this.fetch('characters/online/info');
    _onlineCharacters.set(
      characters.reduce((chars, info) => {
        chars[info.character] = info;
        log.debug('adding char', info);
        this._emitUpdate('onlineCharacterAdded', info);
        return chars;
      }, {}),
    );
    return get(_onlineCharacters);
  }

  onUpdate(name, callback) {
    if (typeof callback !== 'function') {
      throw new Error('expecting a function to be used as callback');
    }
    if (!this.callbacks[name]) {
      this.callbacks[name] = [];
    }
    this.callbacks[name].push(callback);
    return () => {
      const index = this.callbacks[name].indexOf(callback);
      if (index > -1) {
        this.callbacks[name].splice(index, 1);
      }
    };
  }

  _emitUpdate(name, data) {
    log.info('emiting update: ' + name);
    const callbacks = this.callbacks[name];
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  scavengeEventToText({ character, coins, keys, gear, elements }) {
    // @TODO - MOVE TO I18N, SUPPORT PLURALIZATION, SMART "AND" PHRASE JOINING.
    const text = `${character === this.characterId ? 'You' : 'Someone else'} scavenged`;
    const items = [];
    if (gear) {
      items.push(gear.name);
    }
    if (coins) {
      items.push(`${coins} ${pluralize('coin', coins)}`);
    }
    if (keys) {
      items.push(`${keys} ${pluralize('key', keys)}`);
    }
    if (elements) {
      const els = elements.reduce((acc, el) => acc + el);
      if (els) {
        items.push(`${els} element`);
      }
    }
    return `${text} ${humanizeJoin(items)}.`;
  }

  async characterLeft(char) {
    _onlineCharacters.update(characters => {
      delete characters[char];
      return characters;
    });
    this._emitUpdate('onlineCharacterRemoved', char);
  }

  applyCharacterInfo(info) {
    const { character } = info;
    if (character === this.characterId) {
      const {
        coins,
        keys,
        fragments,
        elements: [fire, air, electricity, earth, water],
        hallOfFame,
        weeklyRank,
        weeklyXp,
      } = info;
      _characterInfo.set(info);
      _characterBalances.set({
        coins,
        keys,
        fragments,
        fire,
        water,
        earth,
        air,
        electricity,
      });
      _characterLeaderboard.set({ hallOfFame, weeklyXp, weeklyRank });
      _characterBag.set(info.gear);

      const { attackGear, defenseGear, stats } = info;
      _characterSlots.set({ attackGear, defenseGear });
      const isDefaultGear = attackGear.id === 1 && defenseGear.id === 4;
      _defaultGearEquipped.set(isDefaultGear);

      if (stats.hp > 0 && stats.xp >= info.nextLevel.xpRequired && stats.level < 8) {
        this.pushHistory(statusesText.levelUp, 20);
      }

      _characterFeatures.add('portal', Number(info.floors) > 0);
      _characterName.set(info.characterName);
      _characterClass.set(stats.characterClass);
      _characterClassName.set(classes[stats.characterClass][0]);
      _playerEnergy.set(info.energy);
      _characterHP.set(stats.health);
      _characterMaxHP.set(stats.fullHealth);
      _characterLevel.set(stats.level);
      _characterNextLevel.set(info.nextLevel);
      _characterXP.set(stats.xp);
      _characterLevelXP.set(stats.levelXp);

      this._emitUpdate('characterUpdated', info);
    }

    _onlineCharacters.update(characters => {
      // Prevent dead characters from appearing during scavenge
      if (!characters[character] && info.status.status === 'dead') {
        return characters;
      }
      characters[character] = info;
      return characters;
    });
  }

  pushHistory(line, interval = 1) {
    if (!line || !line.length) {
      return;
    }

    _mapLog.update(h => {
      if (h.length === 0) {
        return [line];
      }

      let write = true;
      h.slice(Math.max(h.length - interval, 0)).forEach(l => {
        if (line === l) {
          write = false;
        }
      });

      if (write) {
        return [...h, line];
      }

      return h;
    });
  }

  get onlineCharacters() {
    return get(onlineCharacters);
  }

  get characterId() {
    return get(characterId);
  }

  get characterName() {
    return get(characterName);
  }

  get characterStatus() {
    return get(characterStatus);
  }

  get statusData() {
    return get(statusData);
  }

  get currentRoom() {
    return get(currentRoom);
  }

  get currentDuel() {
    return get(currentDuel);
  }

  get currentCombat() {
    return get(currentCombat);
  }

  get characterCoordinates() {
    return this.currentRoom && this.currentRoom.coordinates;
  }

  get reachableRooms() {
    return get(reachableRooms);
  }

  get currentFloor() {
    return get(currentFloor);
  }

  get playerAddress() {
    return get(characterInfo).player;
  }

  get keeperRooms() {
    return get(keeperRooms);
  }
}

const logO = (...args) => log.info(...args.map(v => JSON.parse(JSON.stringify(v))));

const _characterId = writable(null);

const _characterStatus = writable(null);
const _statusData = writable(null);
const _currentRoom = writable(null); // roomData (location, hasMonster, areaType, kind ...)
const _currentCombat = writable(null); // current combat for character
const _rewardsToCollect = writable(null); // reward after combat
const _onlineCharacters = writable({}); // Set of character online with their location, charId, name, ...

const _playerEnergy = writable(null); // amount of energy (lockedEnergy + energy)
const _characterHP = writable(null); // amount of HP for the character
const _characterMaxHP = writable(null); // amount of maxHP for the character
const _characterXP = writable(null); // amount of XP for the character
const _characterLevel = writable(null); // level of the character
const _characterLevelXP = writable(null); // level of the character
const _characterNextLevel = writable(null); // Next Level requirements
const _characterBalances = writable({
  // object containing balances for each type of fungible tokens  // @TODO: break it down ?
  coins: null,
  keys: null,
  fire: null,
  water: null,
  earth: null,
  air: null,
  electricity: null,
});
const _characterSlots = writable({}); // contains the equiped gears
const _defaultGearEquipped = writable(null);
const _characterBag = writable([]); // contains the set of equipments, with their balances
const _characterVault = writable([]); // contains the set of equipments, with their balances
const _characterName = writable(null); // name of character
const _characterClass = writable(null); // class of character
const _characterClassName = writable(null); // class name of character
const _characterFeatures = (() => {
  const store = writable({});
  return {
    ...store,
    add: (key, val = true) => store.update(prev => ({ ...prev, [key]: val })),
    has: key => !!get(store)[key],
  };
})();
const _characterQuests = writable({});
const _characterLeaderboard = writable({
  hallOfFame: null,
  weeklyXp: null,
  weeklyRank: null,
}); // character leaderboard standing in hall of fame and weekly
const _characterInfo = writable(null); // like what backends sends // @TODO: make it derived, when fetchInfo will be not a thing
const _mapLog = writable([]); // text log above the map
const _reachableRooms = writable({}); // rooms reachable by the movePath
const _uniqueGearAvailable = writable([]);
const _poiRooms = {
  boss: writable([]),
  npc: writable([]),
  chest: writable([]),
  teleports: writable([]),
  monster: writable([]),
  foreclosed: writable([]),
  bounty: writable([]),
};
const _keeper = writable([]); // sync of the keeper endpoint
const _keeperRooms = writable([]); // mapped rooms managed by the character
const _keeperIncome = writable({}); // character total keeper income
const _keeperAbilities = writable({}); // available abilities
const _currentTrade = writable(null);

export const chatMessages = (() => {
  const store = writable({ unread: false, messages: [] });
  return {
    ...store,
    add: message => store.update(prev => ({ unread: true, messages: [...prev.messages, message] })),
    clear: () => store.set({ unread: false, messages: [] }),
    read: () => store.update(prev => ({ ...prev, unread: false })),
  };
})();

export const characterId = new ReadOnly(_characterId);

export const characterStatus = new ReadOnly(_characterStatus);
export const statusData = new ReadOnly(_statusData);
export const currentRoom = new ReadOnly(_currentRoom);
export const currentCombat = new ReadOnly(_currentCombat);
export const rewardsToCollect = new ReadOnly(_rewardsToCollect);
export const onlineCharacters = new ReadOnly(_onlineCharacters);
export const playerEnergy = new ReadOnly(_playerEnergy);
export const characterHP = new ReadOnly(_characterHP);
export const characterMaxHP = new ReadOnly(_characterMaxHP);
export const characterXP = new ReadOnly(_characterXP);
export const characterLevel = new ReadOnly(_characterLevel);
export const characterLevelXP = new ReadOnly(_characterLevelXP);
export const characterNextLevel = new ReadOnly(_characterNextLevel);
export const characterBalances = new ReadOnly(_characterBalances);
export const characterSlots = new ReadOnly(_characterSlots);
export const defaultGearEquipped = new ReadOnly(_defaultGearEquipped);
export const characterBag = new ReadOnly(_characterBag);
export const characterVault = new ReadOnly(_characterVault);
export const characterName = new ReadOnly(_characterName);
export const characterClass = new ReadOnly(_characterClass);
export const characterClassName = new ReadOnly(_characterClassName);
export const characterFeatures = new ReadOnly(_characterFeatures);
export const characterQuests = new ReadOnly(_characterQuests);
export const questUpdate = writable(null);
export const characterLeaderboard = new ReadOnly(_characterLeaderboard);
export const characterInfo = new ReadOnly(_characterInfo);
export const reachableRooms = new ReadOnly(_reachableRooms);
export const uniqueGearAvailable = new ReadOnly(_uniqueGearAvailable);
export const bossRooms = new ReadOnly(_poiRooms.boss);
export const npcRooms = new ReadOnly(_poiRooms.npc);
export const chestRooms = new ReadOnly(_poiRooms.chest);
export const teleportRooms = new ReadOnly(_poiRooms.teleports);
export const monsterRooms = new ReadOnly(_poiRooms.monster);
export const foreclosedRooms = new ReadOnly(_poiRooms.foreclosed);
export const bountyRooms = new ReadOnly(_poiRooms.bounty);
export const keeper = new ReadOnly(_keeper);
export const keeperRooms = new ReadOnly(_keeperRooms);
export const keeperIncome = new ReadOnly(_keeperIncome);
export const keeperAbilities = new ReadOnly(_keeperAbilities);
export const currentTrade = new ReadOnly(_currentTrade);
export const mapLog = new ReadOnly(_mapLog);

const logToText = turnAction => {
  const attack = inflictionText(turnAction.inflictions.attacker);
  const defense = inflictionText(turnAction.inflictions.defender);
  if (turnAction.inflictions.attacker.inflicted && turnAction.inflictions.attacker.inflicted.charge) {
    // @TODO - Determine if "card" or "cards"
    return combatText.turnCharged({ attack, defense });
  }
  return combatText.turn({ attack, defense });
};

export const currentDuel = derived([currentCombat, characterId], async ([$currentCombat, $characterId], set) => {
  set($currentCombat && $currentCombat.duels[$characterId]);
});

export const characterPortrait = derived([characterClass], ([$characterClass], set) => {
  set(classPortrait($characterClass));
});

export const combatLog = derived([currentDuel], async ([$currentDuel], set) => {
  const introduction = combatText.start;
  if ($currentDuel) {
    set([introduction, ...$currentDuel.log.map(logToText)]);
  } else {
    set([introduction]);
  }
});

export const needFood = derived([playerEnergy, wallet], ([$playerEnergy, $wallet], set) => {
  if ($playerEnergy) {
    set(BigNumber.from($playerEnergy).lt(BigNumber.from(config($wallet.chainId).minBalance).mul(5)));
    // set(true);
  }
});

export const scavengeLoot = derived([currentRoom], ([$currentRoom], set) => {
  const { scavenge } = $currentRoom;
  set(
    scavenge &&
      (scavenge.gear.length ||
        scavenge.corpses.length ||
        Object.values(scavenge.balance || {})
          .flat()
          .filter(Boolean).length)
      ? scavenge
      : null,
  );
});

export const currentFloor = derived([currentRoom], ([$currentRoom], set) => {
  const { z } = parseCoordinates($currentRoom.coordinates);
  set(z);
});

export const characterCoordinates = derived([currentRoom], ([$currentRoom], set) => {
  set($currentRoom.coordinates);
});

export const taxDueDate = derived([characterInfo], ([$characterInfo], set) => {
  set($characterInfo.taxDueDate);
});

export const currentQuest = derived([currentRoom, characterQuests], ([$currentRoom, $characterQuests], set) => {
  // Is NPC and can claim?
  const findQuest = () => {
    const charQuests = Object.entries($characterQuests).filter(([, q]) => q);
    const validStatus = ['discovered', 'accepted', 'claiming'];
    let result = charQuests.find(
      ([, q]) => q && q.coordinates === $currentRoom.coordinates && validStatus.includes(q.status),
    );
    if (!result) {
      const [, , floor] = $currentRoom.formattedCoordinates.split(',').map(Number);
      result = charQuests.find(
        ([, q]) =>
          q &&
          $currentRoom.npc &&
          q.rules.npc &&
          q.npc === $currentRoom.npc.type &&
          validStatus.includes(q.status) &&
          (q.floor == null || q.floor === floor),
      );
    }
    if (result) {
      const [id, quest] = result;
      let { status } = quest;
      if (status === 'accepted') {
        status = 'incomplete';
      }
      if (quests[id].states[status]) {
        return { id, ...quest, label: quests[id].buttons.npc };
      }
    }

    // Is permitted room and can advance?
    result = charQuests.find(
      ([, q]) =>
        q &&
        q.rules &&
        q.status === 'accepted' &&
        q.rules.roomTypes &&
        q.rules.roomTypes.includes($currentRoom.kind) &&
        q.data &&
        Array.isArray(q.data) &&
        !q.data.includes($currentRoom.coordinates),
    );
    if (result) {
      const [id, quest] = result;
      return { id, ...quest, label: quests[id].buttons.action };
    }
    return false;
  };
  const newQuest = findQuest();
  // None of the above
  if (!equal(newQuest, get(currentQuest))) {
    set(newQuest);
  }
});

export const fetchCache = resource =>
  cacheUrl
    .then(url =>
      fetch(`${url}/${resource}`, {
        headers: { Accept: 'application/json' },
      }),
    )
    .then(result => result.json());

// @TODO: remove debug
window.stores = {
  reachableRooms,
  currentRoom,
  playerEnergy,
  characterHP,
  characterMaxHP,
  characterXP,
  characterLevel,
  characterBalances,
  characterSlots,
  characterBag,
  characterVault,
  characterId,
  characterName,
  characterClass,
  characterClassName,
  characterQuests,
  characterStatus,
  currentCombat,
  rewardsToCollect,
  currentDuel,
  onlineCharacters,
  defaultGearEquipped,
  characterLevelXP,
  mapLog,
  statusData,
  uniqueGearAvailable,
  bossRooms,
  npcRooms,
  chestRooms,
  monsterRooms,
  foreclosedRooms,
  keeper,
  keeperRooms,
  keeperIncome,
  keeperAbilities,
  currentQuest,
  taxDueDate,
  bountyRooms,
};

// @TODO: remove debug
window.getStoreState = name => {
  return get(window.stores[name]);
};

export default Cache;
