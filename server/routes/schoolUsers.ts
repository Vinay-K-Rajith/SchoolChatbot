import express, { Request, Response } from 'express';
import schoolAuth from '../middleware/schoolAuth';
import { MongoClient, ObjectId, Db } from 'mongodb';

const router = express.Router();
const client = new MongoClient(process.env.MONGODB_URI!);

interface School {
  _id: ObjectId;
  name: string;
  domain: string;
  api_key: string;
  api_secret: string;
  status: string;
  subscription_tier: string;
  created_at: Date;
  updated_at: Date;
}

interface SchoolRequest extends Request {
  school: School;
}

// Apply schoolAuth middleware to all routes in this router
router.use(schoolAuth);

// GET /api/v1/schools/users - List users for the current school
router.get('/users', async (req: Request, res: Response) => {
  try {
    await client.connect();
    const db: Db = client.db();
    const schoolId = (req as any).school._id;
    const users = await db.collection('users').find({ school_id: schoolId }).toArray();
    res.json({ users });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/v1/schools/users - Create a new user for the current school
router.post('/users', async (req: Request, res: Response) => {
  try {
    await client.connect();
    const db: Db = client.db();
    const schoolId = (req as any).school._id;
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    // Check for duplicate username in this school
    const existing = await db.collection('users').findOne({ username, school_id: schoolId });
    if (existing) {
      return res.status(409).json({ error: 'Username already exists for this school' });
    }
    const result = await db.collection('users').insertOne({
      username,
      password, // In production, hash the password!
      school_id: schoolId,
      created_at: new Date(),
    });
    res.status(201).json({ userId: result.insertedId });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 