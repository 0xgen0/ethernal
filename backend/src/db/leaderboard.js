const Sentry = require('@sentry/node');
const moment = require('moment');
const { Table } = require('dynamo-light');

const currentWeek = () => [moment().weekYear(), moment().week()].join('-');
const lastWeek = () => {
  const time = moment().startOf('week').subtract(2, 'day');
  return [time.weekYear(), time.week()].join('-');
};

class Leaderboard {
  constructor(tableName) {
    this.table = new Table(tableName);
    this.lastWeek = {};
  }

  async init() {
    try {
      await this.fetchLastWeekStats();

      console.log(
        `leaderboard ${this.table.tableName} connected with ${
          Object.values(this.lastWeek).length
        } players from last week`,
      );
      console.log('week started at:', moment().startOf('week').utc().format());

      this.connected = true;
    } catch (err) {
      console.log('weekly leaderboard not connected', err);
      Sentry.captureException(err);

      this.connected = false;
    }
  }

  async fetchLastWeekStats() {
    const res = await this.table.query({ period: lastWeek() }, { pagination: false });
    res.Items.forEach(({ character, xp }) => {
      this.lastWeek[character] = { xp };
    });
    return this.lastWeek;
  }

  async storeStats({ character, stats }, period) {
    if (this.connected) {
      const { xp } = stats;
      try {
        await this.table.put({ period: period || currentWeek(), character: String(character), xp });
      } catch (err) {
        console.log('failed to store stats', { character, stats, err });
        Sentry.withScope(scope => {
          scope.setExtras({ character, stats, period });
          Sentry.captureException(err);
        });
      }
    }
  }

  weeklyXp({ character, stats }) {
    return stats.xp - (this.lastWeek[character] ? this.lastWeek[character].xp : 0);
  }
}

module.exports = Leaderboard;
