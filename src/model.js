function buildWhereClause(conditions) {
  const keys = Object.keys(conditions);
  const whereParts = keys.map((key, idx) => `${key} = $${idx + 1}`);
  const values = keys.map(key => conditions[key]);
  return { clause: whereParts.join(' AND '), values };
}

function createPlaceholders(keys) {
  return keys.map((_, idx) => `$${idx + 1}`).join(', ');
}

function getKeysAndValues(data) {
  const keys = Object.keys(data);
  const values = keys.map(key => data[key]);
  return { keys, values };
}

function buildInsertQuery(tableName, data) {
  const { keys, values } = getKeysAndValues(data);
  const columns = keys.join(', ');
  const placeholders = createPlaceholders(keys);
  const text = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) RETURNING *`;
  return { text, values };
}

function buildSetClause(data) {
  const keys = Object.keys(data);
  const setParts = keys.map((key, idx) => `${key} = $${idx + 1}`);
  const values = keys.map(key => data[key]);
  return { clause: setParts.join(', '), values };
}

function buildUpdateQuery(tableName, data, conditions) {
  const { clause: setClause, values: setValues } = buildSetClause(data);
  const { clause: whereClause, values: whereValues } = buildWhereClause(conditions);
  const text = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause} RETURNING *`;
  const values = [...setValues, ...whereValues];
  return { text, values };
}

export class Model {
  #db = null;
  #tableName = null;
  #logger = null;

  constructor(db, tableName) {
    this.#db = db;
    this.#tableName = tableName;
    this.#logger = db._logger;
  }

  async find(conditions = {}, options = {}) {
    const hasConditions = Object.keys(conditions).length > 0;

    if (!hasConditions) {
      return this.#findAll(options);
    }

    return this.#findWithConditions(conditions, options);
  }

  async #findAll(options) {
    const limit = options.limit ? `LIMIT ${options.limit}` : '';
    const offset = options.offset ? `OFFSET ${options.offset}` : '';
    const query = `SELECT * FROM ${this.#tableName} ${limit} ${offset}`.trim();
    const result = await this.#db.query(query);
    return result.rows;
  }

  async #findWithConditions(conditions, options) {
    const { clause, values } = buildWhereClause(conditions);
    const limit = options.limit ? `LIMIT ${options.limit}` : '';
    const offset = options.offset ? `OFFSET ${options.offset}` : '';
    const query = `SELECT * FROM ${this.#tableName} WHERE ${clause} ${limit} ${offset}`.trim();
    const result = await this.#db.query(query, values);
    return result.rows;
  }

  async findOne(conditions) {
    const rows = await this.find(conditions, { limit: 1 });
    return rows[0] || null;
  }

  async findById(id) {
    return this.findOne({ id });
  }

  async create(data) {
    const { text, values } = buildInsertQuery(this.#tableName, data);
    const result = await this.#db.query(text, values);
    this.#logger.debug(`Created record in ${this.#tableName}`);
    return result.rows[0];
  }

  async update(conditions, data) {
    const { text, values } = buildUpdateQuery(this.#tableName, data, conditions);
    const result = await this.#db.query(text, values);
    this.#logger.debug(`Updated ${result.rowCount} rows in ${this.#tableName}`);
    return result.rows;
  }

  async updateById(id, data) {
    const result = await this.update({ id }, data);
    return result[0] || null;
  }

  async delete(conditions) {
    const { clause, values } = buildWhereClause(conditions);
    const query = `DELETE FROM ${this.#tableName} WHERE ${clause} RETURNING *`;
    const result = await this.#db.query(query, values);
    this.#logger.debug(`Deleted ${result.rowCount} rows from ${this.#tableName}`);
    return result.rows;
  }

  async deleteById(id) {
    const result = await this.delete({ id });
    return result[0] || null;
  }

  async #countAll() {
    const result = await this.#db.query(`SELECT COUNT(*) FROM ${this.#tableName}`);
    return parseInt(result.rows[0].count);
  }

  async #countWithConditions(conditions) {
    const { clause, values } = buildWhereClause(conditions);
    const query = `SELECT COUNT(*) FROM ${this.#tableName} WHERE ${clause}`;
    const result = await this.#db.query(query, values);
    return parseInt(result.rows[0].count);
  }

  async count(conditions = {}) {
    const hasConditions = Object.keys(conditions).length > 0;
    if (!hasConditions) return this.#countAll();
    return this.#countWithConditions(conditions);
  }
}
