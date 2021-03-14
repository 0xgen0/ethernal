const { Pool } = require('pg');

const config = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ethernal111@localhost:5544/postgres',
};
if (process.env.DATABASE_SSL) {
  config.ssl = { rejectUnauthorized: false };
}
const prefix = process.env.SCHEMA_PREFIX || '';

class Postgres {
  constructor() {
    this.pool = new Pool(config);
  }

  async init(contracts) {
    console.log('connecting to postgres');
    const db = await this.connect();
    await db.query('SELECT NOW()');
    this.contracts = contracts;
    const { Dungeon } = this.contracts;
    this.schema = `${prefix}_${Dungeon.address}`;
    await db.query(`CREATE SCHEMA IF NOT EXISTS ${this.schema}`);
    db.release();
    console.log(`db ${db.client.host} connected, schema ${this.schema}`);
  }

  async connect() {
    return new Client(await this.pool.connect());
  }

  async query(q, params) {
    // console.log('query:', q, params);
    const res = await this.pool.query(q, params);
    // console.log('result:', res.rows);
    return res;

  }

  async tx(transaction) {
    const client = await this.connect();
    try {
      await client.query('BEGIN');
      await transaction(client);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      console.log('tx failed:', e);
      throw e;
    } finally {
      client.release();
    }
  }

  tableName(table) {
    return `${this.schema}.${table}`;
  }

  async tableExists(table) {
    try {
      await this.query(`SELECT '${table}'::regclass`);
      return true;
    } catch (_) {
      return false;
    }
  }
}

class Client {
  constructor(client) {
    this.client = client;
  }

  async query(q, params) {
    try {
      return await this.client.query(q, params);
    } catch (e) {
      console.log('query failed:', q, params, e);
      throw e;
    }
  }

  release() {
    return this.client.release();
  }
}

module.exports = Postgres;
