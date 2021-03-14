import { coordinatesChunkId } from './render/MapUtils';
import { currentFloor, currentQuest } from 'lib/cache';
import { parseCoordinates } from 'utils/utils';
import { mapModal } from 'stores/screen';

/**
 * This handle event from Cache and add things to the map. This allow the Pixi Map to stay focus on dealing with
 *   display objects and animating them.
 */
class MapUpdates {
  /**
   * @constructor
   *
   * @param cache {Cache}
   * @param map {MapRenderer}
   * @param actions {any}
   */
  constructor(cache, map, actions) {
    // actions will emit event for when a user is doing an action, like initiating a move tx...
    this.cache = cache;
    this.map = map;
    this.actions = actions;
  }

  async init(coordinates) {
    this.map.floor = this.cache.currentFloor;
    this.map.refocus(coordinates, 0);
    this.map.doCull(true);
    this.map.activeChunks.forEach(chunk => chunk.createContent());

    cache.onUpdate('roomUpdate', update => {
      const { newest = {} } = update;
      if (parseCoordinates(newest.coordinates).z === this.map.floor) {
        const chunkId = coordinatesChunkId(newest.coordinates);
        if (!this.map.chunks.get(chunkId)) {
          this.map.createChunk(chunkId);
          this.map.doCull(true);
        }
        if (this.map.isRoomActive(newest.coordinates)) {
          this.map.handleRoomUpdate(update);

          // Update room actions for player only if they are in that room
          if (
            newest.coordinates === cache.characterCoordinates &&
            newest.onlineCharacters.includes(cache.characterId)
          ) {
            this.map.displayRoomActions(newest.coordinates);
          }
        }
      }
    });

    cache.onUpdate('characterUpdated', ({ character, coordinates }) => {
      // Update room actions for current player if character update matches known coordinates
      if (character === cache.characterId && coordinates === cache.characterCoordinates) {
        this.map.displayRoomActions(cache.characterCoordinates);
      }
    });

    cache.onUpdate('characterMoved', ({ character, from, to, mode, path }) => {
      const fromFloor = parseCoordinates(from).z;
      const toFloor = parseCoordinates(to).z;
      const fromActive = this.map.isRoomActive(from);
      const toActive = this.map.isRoomActive(to);
      if (fromFloor === toFloor && toFloor === cache.currentFloor) {
        if (fromActive && toActive) {
          this.map.moveCharacter(character, from, to, mode, path);
        } else if (fromActive && !toActive) {
          this.map.removeCharacter(character);
        } else if (!fromActive && toActive) {
          this.map.addCharacter(character, to);
        }
        if (character === this.cache.characterId && mode === 1) {
          setTimeout(() => this.map.refocus(to), 500);
        }
      } else {
        if (cache.currentFloor === toFloor && toActive) {
          this.map.addCharacter(character, to);
        }
        if (cache.currentFloor === fromFloor && fromActive) {
          this.map.removeCharacter(character, to);
        }
      }
    });

    currentQuest.subscribe(quest => {
      const opened = mapModal ? mapModal.isOpen() : false;
      if (quest && quest.status !== 'completed' && !opened) {
        mapModal.open('quest', { id: quest.id });
      }
    });

    currentFloor.subscribe(newFloor => {
      if (this.map.floor !== newFloor) {
        this.map.chunks.forEach(chunk => this.map.removeChunk(chunk.id));
        this.map.refocus(this.cache.characterCoordinates, 0);
        this.map.floor = newFloor;
        Object.values(this.cache.rooms).forEach(room => {
          const { z } = parseCoordinates(room.coordinates);
          if (z === newFloor) {
            this.map.handleRoomUpdate({ newest: room });
          }
        });
        this.map.doCull(true);
      }
    });

    cache.onUpdate('onlineCharacterAdded', ({ character, coordinates, status: { status: characterStatus } }) => {
      if (cache.characterId !== character && this.map.isRoomActive(coordinates)) {
        this.map.addCharacter(character, coordinates, characterStatus);
      }
    });

    cache.onUpdate('onlineCharacterRemoved', character => {
      if (cache.characterId !== character) {
        this.map.removeCharacter(character);
      }
    });

    cache.onUpdate('characterStatus', ({ character, status }) => {
      const isMe = character === cache.characterId;
      const coordinates = isMe
        ? cache.characterCoordinates
        : cache.onlineCharacters[character] && cache.onlineCharacters[character].coordinates;
      if (status === 'just died' && coordinates && this.map.isRoomActive(coordinates)) {
        this.map.killCharacter(character, coordinates, isMe);
      }

      // @TODO: animation for change status (exploring -> fighting, etc...)
    });
  }
}

export default MapUpdates;
