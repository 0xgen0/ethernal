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
      app.get('/entry', async (req, res) => {
        res.json(await this.dungeon.map.randomEntryLocation());
      });

      // Boss rooms
      app.get('/rooms/boss', async (req, res) => {
        res.json((await this.dungeon.map.roomsWith(`roomdata->'combat'->'monster'->>'type' = 'big boss'`))
          .map(cleanRoom));
      });

      // Rooms with monster
      app.get('/rooms/monster', async (req, res) => {
        res.json((await this.dungeon.map.roomsWith(`roomdata->>'combat' != 'null'`))
          .map(({coordinates}) => coordinates));
      });

      // Rooms with monster
      app.get('/rooms/bounty', async (req, res) => {
        res.json((await this.dungeon.map.roomsWith(`roomdata->>'combat' != 'null' AND roomdata->'bounty'->>'sponsors' != '[]'`))
          .map(cleanRoom));
      });

      // NPC rooms
      app.get('/rooms/npc', async (req, res) => {
        res.json((await this.dungeon.randomEvents.npcRooms()).map(cleanRoom));
      });

      // Chest rooms
      app.get('/rooms/chest', async (req, res) => {
        res.json((await this.dungeon.randomEvents.chestRooms()).map(cleanRoom));
      });

      // Teleport rooms, coordinates only
      app.get('/rooms/teleports', async (req, res) => {
        res.json((await this.dungeon.map.roomsWith(`roomdata->>'kind' = '2'`))
          .map(({coordinates}) => ({coordinates})));
      });

      // Teleport rooms, coordinates only
      app.get('/rooms/foreclosed', async (req, res) => {
        res.json(await this.dungeon.keeper.foreclosedRooms());
      });

      // Closest rooms from coordinates
      app.get('/rooms/closest/:coordinates', async (req, res) => {
        res.json((await this.dungeon.map.roomsByDistance(req.params.coordinates)).map(cleanRoom));
      });

      // Room at coordinates
      app.get('/rooms/:coordinates', async (req, res) => {
        res.json(cleanRoom(await this.dungeon.room(req.params.coordinates)));
      });

      // Room at coordinates
      app.get('/rooms/:coordinates/raw', async (req, res) => {
        res.json(await this.dungeon.room(req.params.coordinates));
      });

      // Rooms viewport
      app.get('/map/viewport/:floor', async (req, res) => {
        const floor = Number(req.params.floor);
        res.json(await this.dungeon.map.viewport(floor));
      });

      // Rooms by floor
      app.get('/rooms/floor/:floor', async (req, res) => {
        const floor = Number(req.params.floor);
        res.json(await this.dungeon.map.floorRooms(floor));
      });

      // Rooms within given chunk (x,y,z) and chunkSize
      app.get('/map/chunks/:chunk/:chunkSize', async (req, res) => {
        const {chunkSize, chunk} = req.params;
        res.json(mapValues(await this.dungeon.map.roomsInChunk(chunk, Number(chunkSize)), cleanRoom));
      });

      // Rooms in radius around the coordinates
      app.get('/map/:coordinates/:radius', async (req, res) => {
        const {
          params: {coordinates, radius},
        } = req;
        const rooms = await this.dungeon.map.roomsAround(coordinates, Number(radius) || 5);
        if (req.accepts('text/html') || !req.accepts('json')) {
          res.type('txt').send(drawMap(rooms, coordinates, Number(radius) || 5));
        } else {
          res.json(mapValues(rooms, cleanRoom));
        }
      });

      // List of online character ids
      // TODO all online characters synced in memory
      app.get('/characters/online', (req, res) => {
        res.json(this.dungeon.sockets.onlineCharacters);
      });

      // Online characters info
      app.get('/characters/online/info', async (req, res) => {
        res.json(await this.dungeon.map.onlineCharactersInfo());
      });

      // Character info by id
      app.get('/characters/:character', async (req, res) => {
        const {
          params: {character},
        } = req;
        res.json(await this.dungeon.character.info(character));
      });

      // Character's moves
      app.get('/characters/:character/moves', async (req, res) => {
        const {
          params: {character},
        } = req;
        res.json(await this.dungeon.character.moves(character));
      });

      // Character's status data
      app.get('/characters/:character/status', async (req, res) => {
        const {
          params: {character},
        } = req;
        res.json(await this.dungeon.character.status(character));
      });

      // Character's status data
      app.get('/characters/:character/quests', async (req, res) => {
        const {
          params: {character},
        } = req;
        res.json(await this.dungeon.quests.getAll(character));
      });

      // Character's vault
      app.get('/characters/:characterOrAddress/vault', async (req, res) => {
        const {
          params: {characterOrAddress},
        } = req;
        res.json(await this.dungeon.character.vault(characterOrAddress));
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

      // Keeper abilities
      app.get('/keeper/abilities', (req, res) => {
        res.json(this.dungeon.keeper.abilities);
      });

      // Keeper rooms for character
      app.get('/keeper/:character', async (req, res) => {
        const {
          params: {character},
        } = req;
        res.json(await this.dungeon.keeper.balanceOf(character));
      });

      // Keeper rooms for character
      app.get('/keeper/:character/income', async (req, res) => {
        const {
          params: {character},
        } = req;
        res.json(await this.dungeon.keeper.characterIncome(character));
      });

      // Hall of Fame
      app.get('/leaderboards', async (req, res) => {
        res.json((await this.dungeon.character.hallOfFame()).slice(0, 10));
      });

      // Weekly Leaderboards
      app.get('/leaderboards/weekly', async (req, res) => {
        res.json((await this.dungeon.character.weeklyLeaderboard()).slice(0, 10));
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
