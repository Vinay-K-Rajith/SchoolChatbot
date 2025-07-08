// MongoDB migration script for multi-tenant support
// Usage: node server/migrate-multitenant.js

const { MongoClient, ObjectId } = require('mongodb');
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/yourdbname';
const client = new MongoClient(uri);

async function migrate() {
  await client.connect();
  const db = client.db();

  // 1. Create default school if not exists
  let defaultSchool = await db.collection('schools').findOne({ domain: 'default.local' });
  if (!defaultSchool) {
    const result = await db.collection('schools').insertOne({
      name: "Default School",
      domain: "default.local",
      api_key: "sk_default",
      api_secret: "secret_default",
      status: "active",
      subscription_tier: "basic",
      created_at: new Date(),
      updated_at: new Date()
    });
    defaultSchool = await db.collection('schools').findOne({ _id: result.insertedId });
    console.log('Created default school:', defaultSchool._id);
  } else {
    console.log('Default school already exists:', defaultSchool._id);
  }

  // 2. Update all users, chat_sessions, chat_messages with school_id
  const schoolId = defaultSchool._id;
  const collections = ['users', 'chat_sessions', 'chat_messages'];
  for (const col of collections) {
    const result = await db.collection(col).updateMany(
      { school_id: { $exists: false } },
      { $set: { school_id: schoolId } }
    );
    console.log(`Updated ${result.modifiedCount} documents in ${col}`);
  }

  await client.close();
  console.log('Migration complete!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
}); 