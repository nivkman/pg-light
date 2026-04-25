# @entergreat/pg-light 🐘

A lightweight PostgreSQL connection utility with one-line setup. Simple, clean, and production-ready.

## Features ✨

- ⚡ **One-line Connection** - Connect with a single function call
- 🔗 **Connection String or Config** - Flexible connection options
- 🏊 **Connection Pooling** - Built-in connection pool management
- 🔄 **Transaction Support** - Easy transaction handling with auto-rollback
- 📊 **Query Interface** - Simple query execution
- 🎨 **Mongoose-like Models** - Friendly API for common CRUD operations
- 🔨 **Knex Query Builder** - Powerful chainable API for complex queries (NEW!)
- 📝 **Integrated Logging** - Uses `@entergreat/logger-standard` for consistent logging
- 🧹 **Clean Code** - All functions ≤7 lines
- 🎯 **TypeScript Ready** - JSDoc types for better IDE support

## Installation

```bash
npm install @entergreat/pg-light
```

## Quick Start

### Raw SQL Queries

```js
import { connectDB } from '@entergreat/pg-light';

// One-liner connection with connection string
const db = await connectDB('postgresql://user:pass@localhost:5432/mydb');

// Query data
const result = await db.query('SELECT * FROM users WHERE id = $1', [123]);
console.log(result.rows);

// Close connection
await db.disconnect();
```

### Mongoose-like Models (For Simple CRUD)

```js
import { connectDB } from '@entergreat/pg-light';

const db = await connectDB('postgresql://user:pass@localhost:5432/mydb');

// Create a model
const User = db.model('users');

// CRUD operations - No SQL needed!
const newUser = await User.create({ name: 'John', email: 'john@example.com' });
const users = await User.find({ active: true });
const user = await User.findById(1);
await User.updateById(1, { name: 'Jane' });
await User.deleteById(1);

await db.disconnect();
```

### Knex Query Builder (For Complex Queries)

```js
import { connectDB } from '@entergreat/pg-light';

const db = await connectDB('postgresql://user:pass@localhost:5432/mydb');

// Complex queries with Knex chainable API
const popularPosts = await db.builder('posts')
  .select('posts.*', 'users.name as author')
  .join('users', 'posts.user_id', 'users.id')
  .where('posts.views', '>', 1000)
  .whereIn('posts.category', ['tech', 'science'])
  .orderBy('posts.views', 'desc')
  .limit(10);

// Aggregations
const stats = await db.builder('orders')
  .count('* as total_orders')
  .sum('amount as revenue')
  .where('status', 'completed');

// Transactions
await db.knex.transaction(async (trx) => {
  const [user] = await trx('users').insert({ name: 'Alice' }).returning('*');
  await trx('posts').insert({ user_id: user.id, title: 'First Post' });
});

await db.disconnect();
```

## API

### `connectDB(config, options?)`

Connects to PostgreSQL database and returns a `PgLight` instance.

**Parameters:**
- `config` - Connection string or config object
- `options.service` - Logger service name (default: `'pg-light'`)
- `options.logLevel` - Log level: `'debug'`, `'info'`, `'warn'`, `'error'` (default: `'info'`)

**Returns:** `Promise<PgLight>`

### Connection Methods

#### With Connection String

```js
const db = await connectDB('postgresql://user:pass@localhost:5432/mydb');
```

#### With Config Object

```js
const db = await connectDB({
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  user: 'myuser',
  password: 'mypassword',
  max: 20,              // Max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
```

#### With Custom Logger Options

```js
const db = await connectDB(config, {
  service: 'my-api',
  logLevel: 'debug'
});
```

### PgLight Methods

#### `query(text, params?)`

Execute a SQL query.

```js
// Simple query
const result = await db.query('SELECT * FROM users');

// Parameterized query (prevents SQL injection)
const result = await db.query(
  'SELECT * FROM users WHERE email = $1',
  ['john@example.com']
);

// Access results
console.log(result.rows);      // Array of row objects
console.log(result.rowCount);  // Number of rows
```

#### `transaction(callback)`

Execute queries within a transaction. Automatically commits on success or rolls back on error.

```js
await db.transaction(async (client) => {
  await client.query('INSERT INTO users (name, email) VALUES ($1, $2)',
    ['John Doe', 'john@example.com']);

  await client.query('INSERT INTO logs (action, user_id) VALUES ($1, $2)',
    ['user_created', 1]);

  // If any query fails, all changes are rolled back
});
```

**Error Handling:**

```js
try {
  await db.transaction(async (client) => {
    await client.query('INSERT INTO users (name) VALUES ($1)', ['John']);
    throw new Error('Something went wrong');
    // Transaction automatically rolls back
  });
} catch (error) {
  console.error('Transaction failed:', error.message);
}
```

#### `disconnect()`

Close all connections in the pool.

```js
await db.disconnect();
```

#### `getPool()`

Get the underlying `pg.Pool` instance for advanced usage.

```js
const pool = db.getPool();

// Use native pg.Pool methods
pool.on('error', (err) => {
  console.error('Unexpected pool error', err);
});
```

#### `model(tableName)`

Create a Mongoose-like model for a database table. Returns a `Model` instance with CRUD methods.

```js
const User = db.model('users');
const Post = db.model('posts');
```

#### `builder(tableName)`

Create a Knex query builder for complex queries. Returns a Knex query builder instance.

```js
// SELECT with WHERE and JOIN
const results = await db.builder('posts')
  .select('posts.*', 'users.name as author')
  .join('users', 'posts.user_id', 'users.id')
  .where('posts.published', true)
  .orderBy('posts.created_at', 'desc')
  .limit(10);

// Aggregations
const stats = await db.builder('orders')
  .select('user_id')
  .count('* as order_count')
  .sum('total as revenue')
  .groupBy('user_id')
  .having('order_count', '>', 5);

// INSERT
const [user] = await db.builder('users')
  .insert({ name: 'Alice', email: 'alice@example.com' })
  .returning('*');

// UPDATE
await db.builder('users')
  .where({ id: 1 })
  .update({ last_login: db.knex.fn.now() });

// DELETE
await db.builder('users')
  .where('active', false)
  .delete();
```

See [Knex Query Builder Documentation](https://knexjs.org/guide/query-builder.html) for full API.

#### `knex`

Get the Knex instance for advanced usage, raw queries, and transactions.

```js
// Raw queries
const result = await db.knex.raw('SELECT NOW()');

// Transactions
await db.knex.transaction(async (trx) => {
  const [user] = await trx('users').insert({ name: 'Bob' }).returning('*');
  await trx('logs').insert({ user_id: user.id, action: 'created' });
});

// Knex utility functions
const now = db.knex.fn.now();
const count = db.knex.count('* as total');
```

### Model Methods

The Model class provides a friendly API for common database operations without writing SQL.

#### `create(data)`

Insert a new record and return it.

```js
const user = await User.create({
  name: 'Alice',
  email: 'alice@example.com',
  age: 25
});
// Returns: { id: 1, name: 'Alice', email: 'alice@example.com', age: 25 }
```

#### `find(conditions?, options?)`

Find multiple records matching conditions.

```js
// Find all users
const allUsers = await User.find();

// Find with conditions
const activeUsers = await User.find({ active: true });

// Find with pagination
const users = await User.find({ role: 'admin' }, { limit: 10, offset: 20 });

// Find with limit only
const recentUsers = await User.find({}, { limit: 5 });
```

#### `findOne(conditions)`

Find a single record matching conditions.

```js
const user = await User.findOne({ email: 'alice@example.com' });
// Returns: { id: 1, name: 'Alice', ... } or null
```

#### `findById(id)`

Find a record by its primary key (id).

```js
const user = await User.findById(1);
// Returns: { id: 1, name: 'Alice', ... } or null
```

#### `update(conditions, data)`

Update records matching conditions and return updated records.

```js
const updatedUsers = await User.update(
  { active: false },
  { status: 'archived' }
);
// Returns: [{ id: 5, status: 'archived', ... }, ...]
```

#### `updateById(id, data)`

Update a single record by id and return it.

```js
const user = await User.updateById(1, { last_login: new Date() });
// Returns: { id: 1, last_login: '2026-04-12T...', ... } or null
```

#### `delete(conditions)`

Delete records matching conditions and return deleted records.

```js
const deletedUsers = await User.delete({ active: false });
// Returns: [{ id: 10, active: false, ... }, ...]
```

#### `deleteById(id)`

Delete a single record by id and return it.

```js
const user = await User.deleteById(1);
// Returns: { id: 1, ... } or null
```

#### `count(conditions?)`

Count records matching conditions.

```js
// Count all records
const totalUsers = await User.count();
// Returns: 42

// Count with conditions
const activeCount = await User.count({ active: true });
// Returns: 35
```

## Usage Examples

### Model API (Mongoose-like) - Recommended

```js
import { connectDB } from '@entergreat/pg-light';

const db = await connectDB(process.env.DATABASE_URL);

// Create a model
const User = db.model('users');

// CREATE - Insert records
const alice = await User.create({
  name: 'Alice Smith',
  email: 'alice@example.com',
  active: true
});
console.log('Created:', alice);

// READ - Find records
const activeUsers = await User.find({ active: true });
console.log('Active users:', activeUsers);

const user = await User.findOne({ email: 'alice@example.com' });
console.log('Found user:', user);

const userById = await User.findById(1);
console.log('User #1:', userById);

// Pagination
const page1 = await User.find({}, { limit: 10, offset: 0 });
const page2 = await User.find({}, { limit: 10, offset: 10 });

// UPDATE - Modify records
await User.updateById(1, { last_login: new Date() });

const updated = await User.update(
  { active: false },
  { status: 'archived' }
);
console.log('Updated:', updated);

// DELETE - Remove records
await User.deleteById(999);

const deleted = await User.delete({ active: false });
console.log('Deleted:', deleted);

// COUNT - Count records
const total = await User.count();
const activeCount = await User.count({ active: true });
console.log(`${activeCount} active out of ${total} total users`);

await db.disconnect();
```

### Model with Relationships

```js
import { connectDB } from '@entergreat/pg-light';

const db = await connectDB(process.env.DATABASE_URL);

const User = db.model('users');
const Post = db.model('posts');
const Comment = db.model('comments');

// Create a user
const john = await User.create({
  name: 'John Doe',
  email: 'john@example.com'
});

// Create posts for the user
const post1 = await Post.create({
  user_id: john.id,
  title: 'My First Post',
  content: 'Hello World!',
  published: true
});

const post2 = await Post.create({
  user_id: john.id,
  title: 'Another Post',
  content: 'More content...',
  published: false
});

// Create comments
await Comment.create({
  post_id: post1.id,
  user_id: john.id,
  content: 'Great post!'
});

// Find all posts by user
const userPosts = await Post.find({ user_id: john.id });
console.log(`John has ${userPosts.length} posts`);

// Find published posts
const publishedPosts = await Post.find({ published: true });

// Complex queries still use raw SQL
const postsWithComments = await db.query(`
  SELECT p.*, COUNT(c.id) as comment_count
  FROM posts p
  LEFT JOIN comments c ON p.id = c.post_id
  WHERE p.user_id = $1
  GROUP BY p.id
`, [john.id]);

console.log('Posts with comment counts:', postsWithComments.rows);

await db.disconnect();
```

### Knex Query Builder Examples

```js
import { connectDB } from '@entergreat/pg-light';

const db = await connectDB(process.env.DATABASE_URL);

// SIMPLE QUERIES

// Select with WHERE
const activeUsers = await db.builder('users')
  .select('*')
  .where({ active: true })
  .orderBy('created_at', 'desc');

// Select specific columns
const userEmails = await db.builder('users')
  .select('id', 'name', 'email')
  .where('age', '>', 25)
  .limit(10);

// JOINS

const postsWithAuthors = await db.builder('posts')
  .select('posts.*', 'users.name as author_name')
  .join('users', 'posts.user_id', 'users.id')
  .where('posts.published', true)
  .orderBy('posts.views', 'desc')
  .limit(20);

// Multiple JOINs with aggregation
const postsWithStats = await db.builder('posts')
  .select('posts.*', 'users.name as author')
  .count('comments.id as comment_count')
  .leftJoin('users', 'posts.user_id', 'users.id')
  .leftJoin('comments', 'posts.id', 'comments.post_id')
  .groupBy('posts.id', 'users.name')
  .having(db.knex.raw('COUNT(comments.id) > ?', [5]));

// COMPLEX WHERE CLAUSES

const filtered = await db.builder('users')
  .select('*')
  .where('active', true)
  .andWhere('age', '>=', 18)
  .whereIn('role', ['admin', 'moderator'])
  .whereNotNull('email')
  .where(function() {
    this.where('name', 'like', '%John%')
      .orWhere('email', 'like', '%john%');
  });

// SUBQUERIES

const prolificAuthors = await db.builder('users')
  .select('users.*')
  .whereIn('users.id', function() {
    this.select('user_id')
      .from('posts')
      .groupBy('user_id')
      .havingRaw('COUNT(*) > ?', [10]);
  });

// AGGREGATIONS

const orderStats = await db.builder('orders')
  .select(
    db.knex.raw('AVG(total) as avg_order'),
    db.knex.raw('SUM(total) as revenue'),
    db.knex.raw('MIN(total) as min_order'),
    db.knex.raw('MAX(total) as max_order')
  )
  .where('status', 'completed')
  .first();

// GROUP BY

const topSpenders = await db.builder('orders')
  .select('user_id')
  .count('* as order_count')
  .sum('total as total_spent')
  .groupBy('user_id')
  .orderBy('total_spent', 'desc')
  .limit(10);

// INSERT

const [newUser] = await db.builder('users')
  .insert({
    name: 'Alice',
    email: 'alice@example.com',
    created_at: db.knex.fn.now()
  })
  .returning('*');

// Bulk insert
const newUsers = await db.builder('users')
  .insert([
    { name: 'Bob', email: 'bob@example.com' },
    { name: 'Charlie', email: 'charlie@example.com' }
  ])
  .returning('*');

// UPDATE

await db.builder('users')
  .where({ email: 'alice@example.com' })
  .update({
    last_login: db.knex.fn.now(),
    login_count: db.knex.raw('login_count + 1')
  });

// DELETE

const deletedCount = await db.builder('users')
  .where('active', false)
  .andWhere('last_login', '<', db.knex.raw("NOW() - INTERVAL '1 year'"))
  .delete();

// TRANSACTIONS

await db.knex.transaction(async (trx) => {
  const [user] = await trx('users')
    .insert({ name: 'David', email: 'david@example.com' })
    .returning('*');

  await trx('posts').insert([
    { user_id: user.id, title: 'Post 1' },
    { user_id: user.id, title: 'Post 2' }
  ]);

  await trx('users')
    .where({ id: user.id })
    .update({ post_count: 2 });
});

// PAGINATION

const page = 2;
const perPage = 10;

const results = await db.builder('users')
  .select('*')
  .where({ active: true })
  .orderBy('created_at', 'desc')
  .limit(perPage)
  .offset((page - 1) * perPage);

const [{ total }] = await db.builder('users')
  .count('* as total')
  .where({ active: true });

console.log({
  data: results,
  page,
  perPage,
  total,
  totalPages: Math.ceil(total / perPage)
});

await db.disconnect();
```

### Which API to Use?

**Use Model API when:**
- ✅ Simple CRUD operations (create, read, update, delete by ID)
- ✅ Single table queries with basic conditions
- ✅ You want the simplest, most readable code

**Use Knex Builder when:**
- ✅ Complex queries with JOINs
- ✅ Aggregations (COUNT, SUM, AVG, etc.)
- ✅ Subqueries
- ✅ GROUP BY / HAVING clauses
- ✅ Complex WHERE conditions
- ✅ You need chainable query building

**Use Raw SQL when:**
- ✅ PostgreSQL-specific features (window functions, CTEs, etc.)
- ✅ Highly optimized custom queries
- ✅ Database migrations
- ✅ You prefer writing SQL directly

**Mix and match as needed!** All three approaches work together seamlessly.

### Basic CRUD Operations (Raw SQL)

```js
import { connectDB } from '@entergreat/pg-light';

const db = await connectDB(process.env.DATABASE_URL);

// CREATE
const insertResult = await db.query(
  'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
  ['Alice Smith', 'alice@example.com']
);
console.log('Created user:', insertResult.rows[0]);

// READ
const users = await db.query('SELECT * FROM users WHERE active = $1', [true]);
console.log('Active users:', users.rows);

// UPDATE
const updateResult = await db.query(
  'UPDATE users SET last_login = NOW() WHERE id = $1 RETURNING *',
  [123]
);
console.log('Updated user:', updateResult.rows[0]);

// DELETE
await db.query('DELETE FROM users WHERE id = $1', [456]);

await db.disconnect();
```

### Transaction Example

```js
import { connectDB } from '@entergreat/pg-light';

const db = await connectDB(process.env.DATABASE_URL);

// Transfer money between accounts (atomic operation)
async function transferMoney(fromId, toId, amount) {
  await db.transaction(async (client) => {
    // Debit from account
    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
      [amount, fromId]
    );

    // Credit to account
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, toId]
    );

    // Log transaction
    await client.query(
      'INSERT INTO transactions (from_id, to_id, amount) VALUES ($1, $2, $3)',
      [fromId, toId, amount]
    );
  });
}

try {
  await transferMoney(1, 2, 100.00);
  console.log('Transfer successful');
} catch (error) {
  console.error('Transfer failed:', error.message);
}

await db.disconnect();
```

### Connection Pooling

```js
import { connectDB } from '@entergreat/pg-light';

// Configure connection pool
const db = await connectDB({
  host: 'localhost',
  database: 'mydb',
  user: 'myuser',
  password: 'mypass',
  max: 20,                    // Max 20 connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000  // Fail if connection takes > 2s
});

// Pool automatically manages connections
// Multiple queries share the pool
const [users, orders, products] = await Promise.all([
  db.query('SELECT * FROM users'),
  db.query('SELECT * FROM orders'),
  db.query('SELECT * FROM products')
]);

await db.disconnect();
```

### Custom Logging

```js
import { connectDB } from '@entergreat/pg-light';

// Enable debug logging
const db = await connectDB(process.env.DATABASE_URL, {
  service: 'my-api-db',
  logLevel: 'debug'
});

// Logs will show:
// [my-api-db] Database connected successfully
// [my-api-db] Executing query: SELECT * FROM users
// [my-api-db] Query returned 42 rows
```

### Environment Variables

```js
import { connectDB } from '@entergreat/pg-light';

// .env file:
// DATABASE_URL=postgresql://user:pass@localhost:5432/mydb

const db = await connectDB(process.env.DATABASE_URL);

// Or with separate vars:
const db = await connectDB({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});
```

### Express.js Integration

```js
import express from 'express';
import { connectDB } from '@entergreat/pg-light';

const app = express();
const db = await connectDB(process.env.DATABASE_URL);

app.get('/users', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/users', async (req, res) => {
  const { name, email } = req.body;

  try {
    const result = await db.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await db.disconnect();
  process.exit(0);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Why pg-light?

- ✅ **Minimal Learning Curve** - One function to connect, simple API
- ✅ **Production Ready** - Built on battle-tested `pg` library
- ✅ **Clean Code** - All functions ≤7 lines, easy to maintain
- ✅ **Integrated Logging** - Uses `@entergreat/logger-standard` for consistent logging
- ✅ **Transaction Safety** - Auto-rollback on errors
- ✅ **Connection Pooling** - Efficient resource management
- ✅ **Parameterized Queries** - SQL injection protection
- ✅ **Zero Magic** - Straightforward, predictable behavior

## Comparison

### Before (pg directly)

```js
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

pool.on('error', (err) => {
  console.error('Unexpected error', err);
  process.exit(-1);
});

const client = await pool.connect();
try {
  const result = await client.query('SELECT * FROM users');
  console.log(result.rows);
} finally {
  client.release();
}

await pool.end();
```

### After (pg-light)

```js
import { connectDB } from '@entergreat/pg-light';

const db = await connectDB(process.env.DATABASE_URL);
const result = await db.query('SELECT * FROM users');
console.log(result.rows);
await db.disconnect();
```

## License

ISC

## Contributing

Contributions, issues, and feature requests are welcome!

## Related Packages

- [@entergreat/logger-standard](https://www.npmjs.com/package/@entergreat/logger-standard) - Flexible logging utility (used internally)
- [pg](https://www.npmjs.com/package/pg) - PostgreSQL client (underlying library)

## Repository

[https://github.com/nivkman/pg-light](https://github.com/nivkman/pg-light)
