import { connectDB } from './src/index.js';

// Example: Mongoose-like Model API for pg-light

async function main() {
  // Connect to database
  const db = await connectDB('postgresql://user:password@localhost:5432/mydb', {
    service: 'model-example',
    logLevel: 'debug'
  });

  // Create models (like Mongoose)
  const User = db.model('users');
  const Post = db.model('posts');

  try {
    // CREATE - Insert new records
    const newUser = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30
    });
    console.log('Created user:', newUser);

    // FIND ALL - Get all records
    const allUsers = await User.find();
    console.log('All users:', allUsers);

    // FIND WITH CONDITIONS - Filter records
    const activeUsers = await User.find({ active: true });
    console.log('Active users:', activeUsers);

    // FIND WITH OPTIONS - Pagination
    const firstTenUsers = await User.find({}, { limit: 10, offset: 0 });
    console.log('First 10 users:', firstTenUsers);

    // FIND ONE - Get single record
    const john = await User.findOne({ email: 'john@example.com' });
    console.log('Found John:', john);

    // FIND BY ID - Get by primary key
    const userById = await User.findById(1);
    console.log('User #1:', userById);

    // UPDATE - Update records
    const updatedUsers = await User.update(
      { email: 'john@example.com' },
      { last_login: new Date() }
    );
    console.log('Updated users:', updatedUsers);

    // UPDATE BY ID - Update single record
    const updatedUser = await User.updateById(1, { name: 'John Smith' });
    console.log('Updated user:', updatedUser);

    // COUNT - Count records
    const totalUsers = await User.count();
    console.log('Total users:', totalUsers);

    const activeCount = await User.count({ active: true });
    console.log('Active users count:', activeCount);

    // DELETE - Remove records
    const deletedUsers = await User.delete({ active: false });
    console.log('Deleted inactive users:', deletedUsers);

    // DELETE BY ID - Remove single record
    const deletedUser = await User.deleteById(999);
    console.log('Deleted user:', deletedUser);

    // RELATIONSHIPS - Create related records
    const post = await Post.create({
      title: 'My First Post',
      content: 'Hello World!',
      user_id: newUser.id,
      published: true
    });
    console.log('Created post:', post);

    // Find posts by user
    const userPosts = await Post.find({ user_id: newUser.id });
    console.log('User posts:', userPosts);

    // COMPLEX QUERIES - Still use raw SQL when needed
    const popularPosts = await db.query(
      `SELECT p.*, u.name as author_name
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.views > $1
       ORDER BY p.views DESC
       LIMIT $2`,
      [1000, 10]
    );
    console.log('Popular posts:', popularPosts.rows);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.disconnect();
  }
}

main();
