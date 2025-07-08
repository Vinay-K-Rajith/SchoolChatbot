import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/yourdbname';
const client = new MongoClient(uri);

async function createIndexes() {
  await client.connect();
  const db = client.db();
  await db.collection('users').createIndex({ school_id: 1 });
  await db.collection('chat_sessions').createIndex({ school_id: 1 });
  await db.collection('chat_messages').createIndex({ school_id: 1 });
  await db.collection('chat_widgets').createIndex({ school_id: 1 });
  await db.collection('school_admins').createIndex({ school_id: 1 });
  console.log('Indexes created!');
  await client.close();
}
createIndexes().catch(err => {
  console.error('Index creation failed:', err);
  process.exit(1);
}); 