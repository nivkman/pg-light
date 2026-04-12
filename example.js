import { connectDB } from './src/index.js';

// Example usage of pg-light

async function main() {
  // Connect to database (use your connection string)
  const db = await connectDB('postgresql://user:password@localhost:5432/mydb', {
    service: 'pg-light-example',
    logLevel: 'debug'
  });

  try {
    // Simple query
    const result = await db.query('SELECT NOW() as current_time');
    console.log('Current time:', result.rows[0].current_time);

    // Parameterized query
    const users = await db.query(
      'SELECT * FROM users WHERE active = $1 LIMIT $2',
      [true, 10]
    );
    console.log('Active users:', users.rows);

    // Transaction example
    await db.transaction(async (client) => {
      await client.query('INSERT INTO logs (message) VALUES ($1)', ['Transaction started']);
      await client.query('INSERT INTO logs (message) VALUES ($1)', ['Transaction completed']);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    // Always disconnect
    await db.disconnect();
  }
}

main();
