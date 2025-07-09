import express, { Request, Response } from "express";
import { MongoClient } from "mongodb";
// Remove the top-level require for ApiKeyService (ESM compatibility)
// const ApiKeyService = require("../services/apiKeyService.cjs");

const router = express.Router();
const client = new MongoClient(process.env.MONGODB_URI!);

// Create a new school/project
router.post("/schools", async (req: Request, res: Response) => {
  // Dynamically import ApiKeyService (CommonJS) in ESM context
  // @ts-ignore
  const ApiKeyService = (await import("../services/apiKeyService.cjs")).default || (await import("../services/apiKeyService.cjs"));
  const { code, name, geminiApiKey } = req.body;
  if (!code || !name || !geminiApiKey) {
    return res.status(400).json({ error: "All fields required" });
  }
  await client.connect();
  const db = client.db();
  // Check for duplicate code
  const existing = await db.collection("schools").findOne({ schoolCode: code });
  if (existing) return res.status(409).json({ error: "School code already exists" });

  // Insert into schools collection
  const schoolDoc = {
    schoolCode: code,
    name,
    geminiApiKey,
    status: "active",
    created_at: new Date(),
    updated_at: new Date(),
  };
  const schoolResult = await db.collection("schools").insertOne(schoolDoc);
  const schoolId = schoolResult.insertedId;
  // Generate API key/secret and update school
  const { apiKey, apiSecret } = await ApiKeyService.createApiKeyForSchool(schoolId.toString());
  await db.collection("schools").updateOne(
    { _id: schoolId },
    { $set: { api_key: apiKey, api_secret: apiSecret } }
  );

  // Insert into school_data collection
  await db.collection("school_data").insertOne({
    schoolCode: code,
    school: {
      name,
      generalInfo: "",
      infrastructure: "",
      fees: "",
      admissionAndDocuments: "",
      importantNotes: "",
      bus: "",
      links: "",
      miscellaneous: ""
    }
  });

  res.status(201).json({
    schoolId,
    apiKey,
    embedCode: `<script src=\"https://chat.entab.net/${code}/inject.js\"></script>`
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