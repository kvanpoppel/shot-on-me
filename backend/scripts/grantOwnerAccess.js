const { MongoClient } = require('mongodb');

const URI = 'mongodb+srv://katevanpoppel_db_user:xDxYEYHpCZLnoYJ2@cluster0.uoylpxu.mongodb.net/shotonme';
const EMAIL = 'kate@shotonme.com';

async function run() {
  const client = new MongoClient(URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('shotonme');
    const users = db.collection('users');

    // Run the update
    const result = await users.updateOne(
      { email: EMAIL },
      { $set: { isOwner: true, role: 'owner' } }
    );

    if (result.matchedCount === 0) {
      console.error(`No user found with email: ${EMAIL}`);
      console.error('Register the account first, then re-run this script.');
      process.exit(1);
    }

    console.log(`Updated: matched=${result.matchedCount}, modified=${result.modifiedCount}`);

    // Confirm
    const user = await users.findOne(
      { email: EMAIL },
      { projection: { email: 1, role: 1, isOwner: 1 } }
    );
    console.log('Current state:', user);
    console.log('Done. Owner access granted.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

run();
