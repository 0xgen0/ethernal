const { Mutex: AsyncMutex } = require('async-mutex');

class Mutex {
  locks = {};

  async run(id, callback) {
    if (!this.locks[id]) {
      this.locks[id] = new AsyncMutex();
    }
    return this.locks[id].runExclusive(callback);
  }
}

module.exports = Mutex;
