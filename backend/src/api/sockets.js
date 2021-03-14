const Sentry = require('@sentry/node');
const socketio = require('socket.io');
const ethers = require('ethers');
const { EventEmitter } = require('events');
const { contracts } = require('../db/provider');

class Sockets {
  constructor(server) {
    this.characters = {};
    this.ownerOfCharacter = {};
    this.characterHandlers = [];
    this.sockets = new Map();
    this.internal = new EventEmitter();

    const privileged = process.env.PRIVILEGED_ADDRESSES;
    this.privilegedAddresses = new Set(privileged ? privileged.split(',').map(s => s.trim().toLowerCase()) : []);
    console.log('privileged addresses', Array.from(this.privilegedAddresses));
    this.io = socketio(server);
    this.io.on('connection', socket => {
      socket.emit('hello');

      socket.on('iam', signature => {
        try {
          const character = ethers.utils.verifyMessage(socket.id, signature);
          this.acceptCharacter(character, socket);
        } catch (err) {
          console.log('authorization failed', socket.id);
          Sentry.withScope(scope => {
            scope.setExtras({ signature });
            Sentry.captureException(err);
          });
        }
      });

      socket.on('idelegate', async msg => {
        const [characterId, signature] = msg.split(':');
        try {
          const delegate = ethers.utils.verifyMessage(socket.id, signature).toLowerCase();
          const { Characters, Player } = await contracts();
          const subOwner = await Characters.getSubOwner(characterId);
          const playerAddress = subOwner.toHexString();
          this.ownerOfCharacter[characterId] = playerAddress.toLowerCase();
          const isDelegate = await Player.isDelegateFor(delegate, playerAddress);
          if (!isDelegate) {
            throw new Error('not valid delegate');
          }
          this.acceptCharacter(characterId, socket, playerAddress);
        } catch (err) {
          console.log('delegate authorization failed', socket.id, err);
          Sentry.withScope(scope => {
            scope.setExtras({ characterId, signature, msg });
            Sentry.captureException(err);
          });
        }
      });
    });
  }

  acceptCharacter(character, socket, playerAddress) {
    this.join(character, socket);
    this.characterHandlers.forEach(({ event, callback }) => {
      if (this.isPrivileged(playerAddress)) {
        this.emitTo(character, 'privileged');
      }
      socket.on(event, async data => {
        const reply = await callback(character, data);
        this.emitTo(character, event + '-reply', reply);
      });
    });
    socket.on('disconnect', () => {
      this.leave(character, socket);
    });
    socket.emit('accepted', character);
  }

  onCharacter(event, callback) {
    this.characterHandlers.push({
      event,
      callback: async (...args) => {
        try {
          return (await callback(...args)) || true;
        } catch (e) {
          console.log('action failed', event, args, e.message, e);
          Sentry.withScope(scope => {
            scope.setExtras({ event, args });
            Sentry.captureException(e);
          });
          return { error: event + ' failed: ' + e.message };
        }
      },
    });
    return this;
  }

  isPrivileged(address) {
    return this.privilegedAddresses.has('everyone') || this.privilegedAddresses.has(address.toLowerCase());
  }

  onPrivilegedCharacter(event, callback) {
    this.characterHandlers.push({
      event,
      callback: async (...args) => {
        const character = args[0];
        const address = this.ownerOfCharacter[character];
        if (this.isPrivileged(address)) {
          try {
            return await callback(...args);
          } catch (e) {
            console.log(e);
            Sentry.withScope(scope => {
              scope.setExtras({ event, args });
              Sentry.captureException(e);
            });
            return { error: event + ' failed: ' + e.message, args };
          }
        } else {
          return { error: event + ' unauthorized' };
        }
      },
    });
    return this;
  }

  emit(event, data) {
    this.io.sockets.emit(event, data);
    this.internal.emit(event, data);
  }

  emitTo(character, event, data) {
    this.io.to(character).emit(event, data);
  }

  emitToGroup(characters = [], event, data) {
    characters.forEach(character => this.emitTo(character, event, data));
  }

  emitRoom(room, event, data) {
    this.io.in(room).emit(event, data);
  }

  on(event, callback) {
    this.internal.on(event, callback);
    return this;
  }

  once(event, callback) {
    return this.internal.once(event, callback);
  }

  move(character, from, to) {
    const sockets = this.characters[character];
    if (sockets) {
      sockets.forEach(socket => {
        if (from) {
          socket.leave(from);
        }
        if (to) {
          socket.join(to);
        }
      });
    }
  }

  join(character, socket) {
    const joined = !this.characters[character];
    if (joined) {
      this.characters[character] = new Map();
    }
    this.characters[character].set(socket.id, socket);
    this.sockets.set(socket.id, character);
    socket.join(character);
    if (joined) {
      console.log(`character ${character} joined the game`);
      this.emit('joined', { character });
      socket.emit('joined', { character });
    }
    this.emit('connected', character);
  }

  leave(character, socket) {
    if (!this.characters[character]) {
      this.characters[character] = new Map();
    }
    this.characters[character].delete(socket.id);
    this.sockets.delete(socket.id);
    if (this.characters[character] && this.characters[character].size === 0) {
      setTimeout(() => {
        if (this.characters[character] && this.characters[character].size === 0) {
          console.log(`character ${character} left the game`);
          delete this.characters[character];
          this.emit('left', { character });
        }
      }, 2000);
    }
  }

  get onlineCharacters() {
    return Object.keys(this.characters).filter(key => this.characters[key].size > 0);
  }
}

module.exports = Sockets;
