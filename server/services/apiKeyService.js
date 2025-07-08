const crypto = require('crypto');
const { MongoClient, ObjectId } = require('mongodb');
const client = new MongoClient(process.env.MONGODB_URI);

class ApiKeyService {
  static generateApiKey(schoolId) {
    return `sk_${schoolId}_${crypto.randomBytes(32).toString('hex')}`;
  }

  static generateApiSecret() {
    return crypto.randomBytes(48).toString('hex');
  }

  static async createApiKeyForSchool(schoolId) {
    const apiKey = this.generateApiKey(schoolId);
    const apiSecret = this.generateApiSecret();
    await client.connect();
    const db = client.db();
    await db.collection('schools').updateOne(
      { _id: new ObjectId(schoolId) },
      { $set: { api_key: apiKey, api_secret: apiSecret } }
    );
    return { apiKey, apiSecret };
  }

  static async validateApiKey(apiKey) {
    await client.connect();
    const db = client.db();
    const school = await db.collection('schools').findOne({ api_key: apiKey, status: 'active' });
    return school;
  }

  static async rotateApiKey(schoolId) {
    return this.createApiKeyForSchool(schoolId);
  }
}

module.exports = ApiKeyService; 