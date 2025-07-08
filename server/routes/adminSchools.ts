import express, { Request, Response } from "express";
import { MongoClient } from "mongodb";
import ApiKeyService from "../services/apiKeyService";

const router = express.Router();
const client = new MongoClient(process.env.MONGODB_URI!);

// Create a new school/project
router.post("/schools", async (req: Request, res: Response) => {
  const { code, name, geminiApiKey } = req.body;
  if (!code || !name || !geminiApiKey) {
    return res.status(400).json({ error: "All fields required" });
  }
  await client.connect();
  const db = client.db();
  // Check for duplicate code
  const existing = await db.collection("schools").findOne({ code });
  if (existing) return res.status(409).json({ error: "School code already exists" });

  // Insert school first to get _id
  const schoolResult = await db.collection("schools").insertOne({
    code,
    name,
    geminiApiKey,
    status: "active",
    created_at: new Date(),
    updated_at: new Date(),
  });
  const schoolId = schoolResult.insertedId;
  // Generate API key/secret and update school
  const { apiKey, apiSecret } = await ApiKeyService.createApiKeyForSchool(schoolId.toString());
  await db.collection("schools").updateOne(
    { _id: schoolId },
    { $set: { api_key: apiKey, api_secret: apiSecret } }
  );
  res.status(201).json({
    schoolId,
    apiKey,
    embedCode: `<script src=\"https://yourdomain.com/${code}/inject.js\"></script>`
  });
});

// List all schools (for super-admin)
router.get("/schools", async (_req: Request, res: Response) => {
  await client.connect();
  const db = client.db();
  const schools = await db.collection("schools").find({}).toArray();
  res.json({ schools });
});

export default router; 