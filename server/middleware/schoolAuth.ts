import { Request, Response, NextFunction, RequestHandler } from 'express';
import { MongoClient, Db } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI!);

const schoolAuth: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(401).json({ error: 'API key required' });
  }

  try {
    await client.connect();
    const db: Db = client.db();
    const school = await db.collection('schools').findOne({ api_key: apiKey, status: 'active' });
    if (!school) return res.status(401).json({ error: 'Invalid API key' });
    // Attach school to request (TypeScript users can extend Request type for full type safety)
    (req as any).school = school;
    next();
  } catch (err) {
    console.error('schoolAuth error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export default schoolAuth; 