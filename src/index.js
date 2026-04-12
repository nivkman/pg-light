import pg from 'pg';
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

class PgLight {
  #pool = null;
  #logger = null;
  _logger = null;

  constructor(pool, logger) {
    this.#pool = pool;
    this.#logger = logger;
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
    this.#logger.info('Database connection closed');
  }

  getPool() {
    return this.#pool;
  }

  model(tableName) {
    return new Model(this, tableName);
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
  await testConnection(pool, logger);
  return new PgLight(pool, logger);
}

export { Model };
