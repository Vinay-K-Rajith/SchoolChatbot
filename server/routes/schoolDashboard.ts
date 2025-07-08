import express, { Request, Response, NextFunction } from 'express';
import schoolAuth from '../middleware/schoolAuth';
import { MongoClient, ObjectId, Db } from 'mongodb';

const router = express.Router();
const client = new MongoClient(process.env.MONGODB_URI!);

// Type for the school object
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

// Attach school to request type
interface SchoolRequest extends Request {
  school: School;
}

// Apply schoolAuth middleware to all routes in this router
router.use(schoolAuth);

// GET /api/v1/schools/dashboard - School dashboard summary
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    await client.connect();
    const db: Db = client.db();
    const schoolId = (req as any).school._id;

    // Example: Get counts for dashboard metrics
    const totalUsers = await db.collection('users').countDocuments({ school_id: schoolId });
    const totalSessions = await db.collection('chat_sessions').countDocuments({ school_id: schoolId });
    const totalMessages = await db.collection('chat_messages').countDocuments({ school_id: schoolId });

    res.json({
      school: (req as any).school,
      metrics: {
        totalUsers,
        totalSessions,
        totalMessages
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 