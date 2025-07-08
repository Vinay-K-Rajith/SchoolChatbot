import { RequestHandler } from 'express';
declare const schoolAuth: RequestHandler;
export default schoolAuth; 
// API key authentication middleware for multi-tenant schools
const { MongoClient } = require('mongodb');
const client = new MongoClient(process.env.MONGODB_URI);

async function schoolAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'API key required' });

  try {
    await client.connect();
    const db = client.db();
    const school = await db.collection('schools').findOne({ api_key: apiKey, status: 'active' });
    if (!school) return res.status(401).json({ error: 'Invalid API key' });
    req.school = school;
    next();
  } catch (err) {
    console.error('schoolAuth error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = schoolAuth; 