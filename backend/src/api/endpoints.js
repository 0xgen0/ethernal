const express = require('express');
const Sentry = require('@sentry/node');
const cors = require('cors');
const path = require('path');
const { provider } = require('../db/provider');
const { cleanRoom, mapValues } = require('../data/utils');
const drawMap = require('../utils/drawMap');

class Endpoints {
  map = null;

  constructor(preListener = false) {
    const app = express();

    // Add express middlewares
    app.use(Sentry.Handlers.requestHandler());
    app.use(
      cors({
        origin: (origin, callback) => callback(null, true),
      }),
    );

    // Serve static files
    app.use(express.static(path.resolve('./static')));

    // Health endpoint & version info
    app.get('/', async (req, res, next) => {
      res.json({
        ethernalCache: this.dungeon.initialized ? 'ok' : 'loading',
        version: process.env.COMMIT,
        block: this.dungeon.initialized ? await provider.getBlockNumber().catch(next) : this.dungeon.initBlock,
        since: this.dungeon.initBlock,
        clients: this.dungeon.initialized ? this.dungeon.sockets.onlineCharacters.length : 0,
      });
    });


    if (!preListener) {
      // Random valid entry point to the dungeon
      app.get('/entry', (req, res) => {
        res.json(this.dungeon.map.randomEntryLocation);
      });

      // Rooms
      app.get('/rooms', (req, res) => {
        res.json(mapValues(this.dungeon.rooms, cleanRoom));
      });

      // Raw rooms data
      app.get('/rooms/raw', (req, res) => {
        res.json(this.dungeon.rooms);
      });

      // Boss rooms
      app.get('/rooms/boss', (req, res) => {
        res.json(this.dungeon.map
          .roomsWith(({ combat }) => combat && combat.monster.type === 'big boss')
          .map(cleanRoom));
      });

      // Rooms with monster
      app.get('/rooms/monster', (req, res) => {
        res.json(this.dungeon.map
          .roomsWith(({ hasMonster }) => hasMonster)
          .map(({coordinates}) => coordinates));
      });

      // NPC rooms
      app.get('/rooms/npc', (req, res) => {
        res.json(this.dungeon.randomEvents.npcRooms.map(cleanRoom));
      });

      // Chest rooms
      app.get('/rooms/chest', (req, res) => {
        res.json(this.dungeon.randomEvents.chestRooms.map(cleanRoom));
      });

      // Teleport rooms, coordinates only
      app.get('/rooms/teleports', (req, res) => {
        res.json(this.dungeon.map
          .roomsWith(({ kind }) => Number(kind) === 2)
          .map(({coordinates}) => ({coordinates})));
      });

      // Teleport rooms, coordinates only
      app.get('/rooms/foreclosed', (req, res) => {
        res.json(this.dungeon.keeper.foreclosedRooms);
      });

      // Closest rooms from coordinates
      app.get('/rooms/closest/:coordinates', (req, res) => {
        res.json(this.dungeon.map.roomsByDistance(req.params.coordinates).map(cleanRoom));
      });

      // Room at coordinates
      app.get('/rooms/:coordinates', (req, res) => {
        res.json(cleanRoom(this.dungeon.rooms[req.params.coordinates]));
      });

      // Rooms viewport
      app.get('/map/viewport/:floor', (req, res) => {
        // @TODO - ADD CACHING
        const {floor} = req.params
        res.json(this.dungeon.map.viewport(floor));
      });

      // Rooms within given chunk (x,y,z) and chunkSize
      app.get('/map/chunks/:chunk/:chunkSize', (req, res) => {
        const {chunkSize, chunk} = req.params;
        res.json(mapValues(this.dungeon.map.roomsInChunk(chunk, Number(chunkSize)), cleanRoom));
      });

      // Rooms in radius around the coordinates
      app.get('/map/:coordinates/:radius', (req, res) => {
        const {
          params: {coordinates, radius},
        } = req;
        if (req.accepts('text/html') || !req.accepts('json')) {
          res.type('txt').send(drawMap(this.dungeon.rooms, coordinates, Number(radius) || 5));
        } else {
          res.json(mapValues(this.dungeon.map.roomsAround(coordinates, Number(radius) || 5), cleanRoom));
        }
      });

      // Info of all characters
      app.get('/characters', (req, res) => {
        res.json(Object.keys(this.dungeon.characters).map(character => this.dungeon.character.info(character)));
      });

      // List of online character ids
      app.get('/characters/online', (req, res) => {
        res.json(this.dungeon.sockets.onlineCharacters);
      });

      // Online characters info
      app.get('/characters/online/info', (req, res) => {
        res.json(this.dungeon.map.onlineCharactersInfo);
      });

      // Character info by id
      app.get('/characters/:character', (req, res) => {
        const {
          params: {character},
        } = req;
        res.json(this.dungeon.character.info(character));
      });

      // Character's moves
      app.get('/characters/:character/moves', (req, res) => {
        const {
          params: {character},
        } = req;
        res.json(this.dungeon.map.moves[character] || []);
      });

      // Character's status data
      app.get('/characters/:character/status', (req, res) => {
        const {
          params: {character},
        } = req;
        res.json(this.dungeon.character.status(character));
      });

      // Character's status data
      app.get('/characters/:character/quests', (req, res) => {
        const {
          params: {character},
        } = req;
        res.json(this.dungeon.quests.getAll(character));
      });

      // Character's vault
      app.get('/characters/:characterOrAddress/vault', (req, res, next) => {
        const {
          params: {characterOrAddress},
        } = req;
        res.json(this.dungeon.character.vault(characterOrAddress));
      });

      // Cost of the healing
      app.get('/characters/:character/healCost/:hp', async (req, res, next) => {
        const {
          params: {character, hp},
        } = req;
        res.json(await this.dungeon.character.healCost(character, hp).catch(next));
      });

      // Teleport cost
      app.get('/characters/:character/teleportCost/:destination', async (req, res, next) => {
        const {
          params: {character, destination},
        } = req;
        res.json(await this.dungeon.map.teleportCost(character, destination).catch(next));
      });

      // Available unique gear
      app.get('/gear/unique', (req, res) => {
        res.json(this.dungeon.gear.unique.available);
      });

      // Available unique gear
      app.get('/quests', (req, res) => {
        res.json(Object.keys(this.dungeon.quests.available));
      });

      // Kepper abilities
      app.get('/keeper/abilities', (req, res) => {
        res.json(this.dungeon.keeper.abilities);
      });

      // Kepper rooms for character
      app.get('/keeper/:character', (req, res) => {
        const {
          params: {character},
        } = req;
        res.json(this.dungeon.keeper.balanceOf(character));
      });

      // Kepper rooms for character
      app.get('/keeper/:character/income', (req, res) => {
        const {
          params: {character},
        } = req;
        res.json(this.dungeon.keeper.characterIncome(character));
      });

      // Hall of Fame
      app.get('/leaderboards', (req, res) => {
        res.json(this.dungeon.hallOfFame().slice(0, 10));
      });

      // Weekly Leaderboards
      app.get('/leaderboards/weekly', (req, res) => {
        res.json(this.dungeon.weeklyLeaderboard().slice(0, 10));
      });

      // Debug information
      app.get('/debug', (req, res) => {
        res.json(this.dungeon.debugData);
      });

      app.get('/debug/snapshot', async (req, res) => {
        res.set('Content-Type', 'application/json');
        res.send(await this.dungeon.snapshot());
      });
    }

    // Handle errors
    app.use(Sentry.Handlers.errorHandler());
    this.app = app;
  }

  connectDungeon(dungeon) {
    this.dungeon = dungeon;
    return this;
  }
}

module.exports = Endpoints;
