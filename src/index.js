import pg from 'pg';
import knex from 'knex';
import { Logger } from 'logger-standard';
import { Model } from './model.js';

const { Pool } = pg;

function isConnectionString(config) {
  return typeof config === 'string';
}

function createPoolConfig(config) {
  if (isConnectionString(config)) {
    return { connectionString: config };
  }
  return config;
}

function createLogger(options) {
  const service = options?.service || 'pg-light';
  const logLevel = options?.logLevel || 'info';
  return new Logger({ service, logLevel });
}

function createKnexInstance(config) {
  const connection = isConnectionString(config) ? config : createPoolConfig(config);
  return knex({ client: 'pg', connection });
}

class PgLight {
  #pool = null;
  #logger = null;
  #knex = null;
  _logger = null;

  constructor(pool, logger, knexInstance) {
    this.#pool = pool;
    this.#logger = logger;
    this.#knex = knexInstance;
    this._logger = logger;
  }

  async query(text, params = []) {
    this.#logger.debug(`Executing query: ${text}`);
    const result = await this.#pool.query(text, params);
    this.#logger.debug(`Query returned ${result.rowCount} rows`);
    return result;
  }

  async #executeTransaction(client, callback) {
    await client.query('BEGIN');
    await callback(client);
    await client.query('COMMIT');
    this.#logger.debug('Transaction committed');
  }

  async #rollbackTransaction(client, error) {
    await client.query('ROLLBACK');
    this.#logger.error(`Transaction rolled back: ${error.message}`);
    throw error;
  }

  async transaction(callback) {
    const client = await this.#pool.connect();
    try {
      await this.#executeTransaction(client, callback);
    } catch (error) {
      await this.#rollbackTransaction(client, error);
    } finally {
      client.release();
    }
  }

  async disconnect() {
    await this.#pool.end();
    await this.#knex.destroy();
    this.#logger.info('Database connection closed');
  }

  getPool() {
    return this.#pool;
  }

  model(tableName) {
    return new Model(this, tableName);
  }

  builder(tableName) {
    this.#logger.debug(`Creating query builder for ${tableName}`);
    return this.#knex(tableName);
  }

  get knex() {
    return this.#knex;
  }
}

async function testConnection(pool, logger) {
  try {
    await pool.query('SELECT NOW()');
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error(`Connection failed: ${error.message}`);
    throw error;
  }
}

export async function connectDB(config, options = {}) {
  const logger = createLogger(options);
  const poolConfig = createPoolConfig(config);
  const pool = new Pool(poolConfig);
  const knexInstance = createKnexInstance(config);
  await testConnection(pool, logger);
  return new PgLight(pool, logger, knexInstance);
}

export { Model };
