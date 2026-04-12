import { connectDB } from './src/index.js';

// Example: Using Knex Query Builder for Complex Queries

async function main() {
  // Connect to database
  const db = await connectDB('postgresql://user:password@localhost:5432/mydb', {
    service: 'knex-example',
    logLevel: 'debug'
  });

  try {
    // SIMPLE QUERIES WITH KNEX

    // Select all users
    const allUsers = await db.builder('users').select('*');
    console.log('All users:', allUsers);

    // Select with WHERE
    const activeUsers = await db.builder('users')
      .select('*')
      .where({ active: true })
      .orderBy('created_at', 'desc');
    console.log('Active users:', activeUsers);

    // Select specific columns
    const userEmails = await db.builder('users')
      .select('id', 'name', 'email')
      .where('age', '>', 25)
      .limit(10);
    console.log('User emails:', userEmails);

    // COMPLEX QUERIES

    // JOIN queries
    const postsWithAuthors = await db.builder('posts')
      .select('posts.*', 'users.name as author_name', 'users.email as author_email')
      .join('users', 'posts.user_id', 'users.id')
      .where('posts.published', true)
      .orderBy('posts.created_at', 'desc')
      .limit(20);
    console.log('Posts with authors:', postsWithAuthors);

    // Multiple JOINs
    const postsWithCommentsCount = await db.builder('posts')
      .select('posts.*', 'users.name as author')
      .count('comments.id as comment_count')
      .leftJoin('users', 'posts.user_id', 'users.id')
      .leftJoin('comments', 'posts.id', 'comments.post_id')
      .groupBy('posts.id', 'users.name')
      .having(db.knex.raw('COUNT(comments.id) > ?', [5]))
      .orderBy('comment_count', 'desc');
    console.log('Popular posts:', postsWithCommentsCount);

    // WHERE with multiple conditions
    const filteredUsers = await db.builder('users')
      .select('*')
      .where('active', true)
      .andWhere('age', '>=', 18)
      .andWhere('age', '<=', 65)
      .whereIn('role', ['admin', 'moderator'])
      .whereNotNull('email')
      .orderBy('created_at', 'desc');
    console.log('Filtered users:', filteredUsers);

    // OR conditions
    const searchResults = await db.builder('users')
      .select('*')
      .where('name', 'like', '%John%')
      .orWhere('email', 'like', '%john%')
      .limit(10);
    console.log('Search results:', searchResults);

    // Subqueries
    const usersWithManyPosts = await db.builder('users')
      .select('users.*')
      .whereIn('users.id', function() {
        this.select('user_id')
          .from('posts')
          .groupBy('user_id')
          .havingRaw('COUNT(*) > ?', [10]);
      });
    console.log('Prolific authors:', usersWithManyPosts);

    // AGGREGATIONS

    // Count
    const userCount = await db.builder('users').count('* as total');
    console.log('Total users:', userCount[0].total);

    // Average, Sum, Min, Max
    const stats = await db.builder('orders')
      .select(
        db.knex.raw('AVG(total) as avg_order'),
        db.knex.raw('SUM(total) as revenue'),
        db.knex.raw('MIN(total) as min_order'),
        db.knex.raw('MAX(total) as max_order')
      )
      .where('status', 'completed');
    console.log('Order stats:', stats[0]);

    // Group by with aggregation
    const ordersByUser = await db.builder('orders')
      .select('user_id')
      .count('* as order_count')
      .sum('total as total_spent')
      .groupBy('user_id')
      .orderBy('total_spent', 'desc')
      .limit(10);
    console.log('Top spenders:', ordersByUser);

    // INSERT

    const [newUser] = await db.builder('users')
      .insert({
        name: 'Alice Johnson',
        email: 'alice@example.com',
        age: 28,
        active: true
      })
      .returning('*');
    console.log('Created user:', newUser);

    // Bulk insert
    const newUsers = await db.builder('users')
      .insert([
        { name: 'Bob', email: 'bob@example.com', age: 30 },
        { name: 'Charlie', email: 'charlie@example.com', age: 25 }
      ])
      .returning('*');
    console.log('Created users:', newUsers);

    // UPDATE

    const updatedCount = await db.builder('users')
      .where({ email: 'alice@example.com' })
      .update({
        last_login: db.knex.fn.now(),
        login_count: db.knex.raw('login_count + 1')
      });
    console.log('Updated rows:', updatedCount);

    // UPDATE with JOIN (PostgreSQL specific)
    await db.knex.raw(`
      UPDATE posts
      SET featured = true
      FROM users
      WHERE posts.user_id = users.id
        AND users.role = 'premium'
    `);

    // DELETE

    const deletedCount = await db.builder('users')
      .where('active', false)
      .andWhere('last_login', '<', db.knex.raw("NOW() - INTERVAL '1 year'"))
      .delete();
    console.log('Deleted inactive users:', deletedCount);

    // TRANSACTIONS WITH KNEX

    await db.knex.transaction(async (trx) => {
      // Insert user
      const [user] = await trx('users')
        .insert({ name: 'David', email: 'david@example.com' })
        .returning('*');

      // Insert posts for user
      await trx('posts').insert([
        { user_id: user.id, title: 'Post 1', content: 'Content 1' },
        { user_id: user.id, title: 'Post 2', content: 'Content 2' }
      ]);

      // Update user stats
      await trx('users')
        .where({ id: user.id })
        .update({ post_count: 2 });

      console.log('Transaction completed');
    });

    // RAW QUERIES WITH KNEX

    const customQuery = await db.knex.raw(`
      SELECT u.*, COUNT(p.id) as post_count
      FROM users u
      LEFT JOIN posts p ON u.id = p.user_id
      WHERE u.active = ?
      GROUP BY u.id
      HAVING COUNT(p.id) > ?
      ORDER BY post_count DESC
      LIMIT ?
    `, [true, 5, 10]);
    console.log('Custom query results:', customQuery.rows);

    // COMBINING MODEL API WITH KNEX

    const User = db.model('users');

    // Simple CRUD with Model
    const simpleUser = await User.findById(1);
    console.log('Simple find:', simpleUser);

    // Complex query with Knex
    const complexQuery = await db.builder('users')
      .select('users.*', db.knex.raw('COUNT(posts.id) as post_count'))
      .leftJoin('posts', 'users.id', 'posts.user_id')
      .where('users.active', true)
      .groupBy('users.id')
      .having(db.knex.raw('COUNT(posts.id) > ?'), 10)
      .orderBy('post_count', 'desc');
    console.log('Complex query:', complexQuery);

    // PAGINATION

    const page = 2;
    const perPage = 10;
    const offset = (page - 1) * perPage;

    const paginatedResults = await db.builder('users')
      .select('*')
      .where({ active: true })
      .orderBy('created_at', 'desc')
      .limit(perPage)
      .offset(offset);

    const [{ total }] = await db.builder('users')
      .count('* as total')
      .where({ active: true });

    console.log({
      data: paginatedResults,
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage)
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.disconnect();
  }
}

main();
