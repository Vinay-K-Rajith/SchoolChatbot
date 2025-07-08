const { MongoClient, ObjectId } = require('mongodb');
const crypto = require('crypto');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

function generateApiKey(schoolId) {
  return `sk_${schoolId}_${crypto.randomBytes(32).toString('hex')}`;
}

function generateApiSecret() {
  return crypto.randomBytes(48).toString('hex');
}

async function addApiKeysToExistingSchools() {
  try {
    await client.connect();
    const db = client.db();
    const schools = await db.collection('schools').find({ $or: [ { api_key: { $exists: false } }, { api_key: null } ] }).toArray();
    if (schools.length === 0) {
      console.log('All schools already have API keys.');
      return;
    }
    for (const school of schools) {
      const apiKey = generateApiKey(school._id.toString());
      const apiSecret = generateApiSecret();
      await db.collection('schools').updateOne(
        { _id: school._id },
        { $set: { api_key: apiKey, api_secret: apiSecret } }
      );
      console.log(`Added API key for school: ${school.name} (${school.code})`);
    }
    console.log('API key migration complete.');
  } catch (err) {
    console.error('Error updating schools:', err);
  } finally {
    await client.close();
  }
}

addApiKeysToExistingSchools(); 