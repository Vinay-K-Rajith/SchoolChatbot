import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertChatMessageSchema, insertChatSessionSchema } from "@shared/schema";
import { generateResponse, updateKnowledgeBaseWithGemini } from "./services/gemini";
import { nanoid } from "nanoid";
import { getSchoolData, getAllSessionsBySchool, getMessagesBySession, storeSession, storeMessage, countMessagesBySession } from "./services/school-context";
import { MongoClient } from "mongodb";
// @ts-ignore
import requestIp from "request-ip";

// In-memory view tracking per school
const schoolViews: Record<string, number> = {};
const schoolActiveViewers: Record<string, Set<string>> = {};

// Middleware to track views and active viewers
function trackView(schoolCode: string, viewerId: string) {
  schoolViews[schoolCode] = (schoolViews[schoolCode] || 0) + 1;
  if (!schoolActiveViewers[schoolCode]) schoolActiveViewers[schoolCode] = new Set();
  schoolActiveViewers[schoolCode].add(viewerId);
  // Remove viewers after 10 minutes (simulate active viewers)
  setTimeout(() => {
    schoolActiveViewers[schoolCode]?.delete(viewerId);
  }, 10 * 60 * 1000);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Create a new chat session
  app.post("/api/chat/session", async (req, res) => {
    try {
      const sessionId = nanoid();
      const schoolCode = req.body.schoolCode || "SXSBT";
      const ip = requestIp.getClientIp(req) || req.ip || null;
      const session = await storage.createChatSession({ sessionId, schoolCode });
      await storeSession({ sessionId, schoolCode, createdAt: new Date(), updatedAt: new Date(), ip });
      res.json({ sessionId: session.sessionId });
    } catch (error) {
      console.error("Error creating chat session:", error);
      res.status(500).json({ error: "Failed to create chat session" });
    }
  });

  // Send a message and get AI response
  app.post("/api/chat/message", async (req, res) => {
    try {
      const { sessionId, content, schoolCode = "SXSBT" } = req.body;
      
      if (!sessionId || !content) {
        return res.status(400).json({ error: "Session ID and content are required" });
      }

      // Save user message
      const userMessage = await storage.createChatMessage({
        sessionId,
        schoolCode,
        content,
        isUser: true,
      });
      await storeMessage({ sessionId, schoolCode, content, isUser: true, timestamp: new Date() });

      // Generate AI response
      const aiResponse = await generateResponse(content, sessionId, schoolCode);

      // Save AI response
      const aiMessage = await storage.createChatMessage({
        sessionId,
        schoolCode,
        content: aiResponse,
        isUser: false,
      });
      await storeMessage({ sessionId, schoolCode, content: aiResponse, isUser: false, timestamp: new Date() });

      res.json({
        userMessage,
        aiMessage,
      });
    } catch (error) {
      console.error("Error processing message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  // Get chat history for a session
  app.get("/api/chat/history/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const messages = await storage.getChatMessages(sessionId);
      res.json({ messages });
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ error: "Failed to fetch chat history" });
    }
  });

  app.get("/api/school/:schoolCode", async (req, res) => {
    const { schoolCode } = req.params;
    try {
      const school = await getSchoolData(schoolCode);
      if (!school) return res.status(404).json({ error: "School not found" });
      res.json(school);
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/school/:schoolCode/images", async (req, res) => {
    const { schoolCode } = req.params;
    try {
      const school = await getSchoolData(schoolCode);
      if (!school) return res.status(404).json({ error: "School not found" });
      const images = (school.school?.images || []).map((img: any) => ({
        url: img.url || img,
        alt: img.alt || img.caption || "School image"
      }));
      res.json({ images });
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/school/:schoolCode/image-keywords", async (req, res) => {
    const { schoolCode } = req.params;
    try {
      const school = await getSchoolData(schoolCode);
      if (!school) return res.status(404).json({ error: "School not found" });
      const keywords = (school.school?.images || [])
        .map((img: any) => img.keyword || img.alt || img.caption || null)
        .filter(Boolean);
      res.json({ keywords });
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Analytics endpoint for dashboard
  app.get("/api/school/:schoolCode/analytics", async (req, res) => {
    const { schoolCode } = req.params;
    const { timeframe = "hourly" } = req.query;
    // Only use messages for this school
    const allMessages = storage.getAllChatMessagesBySchool(schoolCode);
    // TODO: Aggregate by timeframe
    // For now, return mock data
    const now = new Date();
    let data: { label: string; value: number }[] = [];
    if (timeframe === "hourly") {
      data = Array.from({ length: 24 }, (_, i) => ({ label: `${i}:00`, value: Math.floor(Math.random() * 20) }));
    } else if (timeframe === "daily") {
      data = Array.from({ length: 7 }, (_, i) => ({ label: `Day ${i + 1}`, value: Math.floor(Math.random() * 100) }));
    } else if (timeframe === "weekly") {
      data = Array.from({ length: 4 }, (_, i) => ({ label: `Week ${i + 1}`, value: Math.floor(Math.random() * 200) }));
    } else if (timeframe === "monthly") {
      data = Array.from({ length: 12 }, (_, i) => ({ label: `Month ${i + 1}`, value: Math.floor(Math.random() * 500) }));
    } else if (timeframe === "yearly") {
      data = Array.from({ length: 5 }, (_, i) => ({ label: `${now.getFullYear() - 4 + i}`, value: Math.floor(Math.random() * 1000) }));
    }
    res.json({ data });
  });

  // Knowledge base editor endpoint for dashboard
  app.post("/api/school/:schoolCode/knowledge-base", async (req, res) => {
    const { schoolCode } = req.params;
    const { text, image } = req.body;
    try {
      // 1. Fetch current school data
      const school = await getSchoolData(schoolCode);
      const currentKnowledgeBase = school?.knowledgeBase || {};
      // 2. Call Gemini to get updated knowledge base
      const updatedKnowledgeBase = await updateKnowledgeBaseWithGemini(currentKnowledgeBase, { text, image });
      // 3. Update the knowledgeBase field in the DB
      const uri = "mongodb+srv://vaishakhp11:PiPa7LUEZ5ufQo8z@cluster0.toscmfj.mongodb.net/";
      const client = new MongoClient(uri);
      await client.connect();
      const db = client.db("test");
      const collection = db.collection("school_data");
      await collection.updateOne(
        { schoolCode },
        { $set: { knowledgeBase: updatedKnowledgeBase } }
      );
      // 4. Return success
      res.json({ success: true, message: `Knowledge base updated for ${schoolCode}`, knowledgeBase: updatedKnowledgeBase });
    } catch (err) {
      console.error("Knowledge base update error:", err);
      res.status(500).json({ error: "Failed to update knowledge base" });
    }
  });

  // Metrics endpoint for dashboard
  app.get("/api/school/:schoolCode/metrics", async (req, res) => {
    const { schoolCode } = req.params;
    // Track view and active viewer
    const viewerId = req.ip + (req.headers['user-agent'] || '');
    trackView(schoolCode, viewerId);
    // Aggregate metrics for this school only
    const allSessions = storage.getAllChatSessionsBySchool(schoolCode);
    const allMessages = storage.getAllChatMessagesBySchool(schoolCode);
    const totalSessions = allSessions.length;
    const totalMessages = allMessages.filter(m => m.isUser).length;
    const userIds = new Set(allMessages.filter(m => m.isUser).map(m => m.sessionId));
    const totalUsers = userIds.size;
    const totalViews = schoolViews[schoolCode] || 0;
    const totalActiveViewers = (schoolActiveViewers[schoolCode]?.size) || 0;
    res.json({ totalMessages, totalSessions, totalUsers, totalViews, totalActiveViewers });
  });

  // Recent activity endpoint for dashboard
  app.get("/api/school/:schoolCode/recent-activity", async (req, res) => {
    const { schoolCode } = req.params;
    // For now, return the latest 10 chat messages (in a real app, filter by schoolCode)
    const allMessages = storage.getAllChatMessages();
    const recent = allMessages.sort((a, b) => (b.timestamp as any) - (a.timestamp as any)).slice(0, 10);
    res.json({ recent });
  });

  // School-specific chat history endpoints
  app.get("/api/school/:schoolCode/sessions", async (req, res) => {
    const { schoolCode } = req.params;
    const { startDate, endDate } = req.query;
    let start: Date | undefined = undefined;
    let end: Date | undefined = undefined;
    if (typeof startDate === 'string') start = new Date(startDate);
    if (typeof endDate === 'string') end = new Date(endDate);
    let sessions = await getAllSessionsBySchool(schoolCode);
    if (start && end) {
      sessions = sessions.filter((session: any) => {
        const created = new Date(session.createdAt);
        return created >= start && created <= end;
      });
    }
    // For each session, count messages
    const sessionsWithCounts = await Promise.all(sessions.map(async (session: any) => {
      const totalMessages = await countMessagesBySession(session.sessionId, schoolCode);
      return { ...session, totalMessages };
    }));
    res.json({ sessions: sessionsWithCounts });
  });

  app.get("/api/school/:schoolCode/session/:sessionId/messages", async (req, res) => {
    const { schoolCode, sessionId } = req.params;
    const messages = await getMessagesBySession(sessionId, schoolCode);
    res.json({ messages });
  });

  // Serve dynamic inject.js for embeddable widget
  app.get('/:schoolCode/inject.js', (req, res) => {
    const { schoolCode } = req.params;
    res.type('application/javascript').send(`
      (function() {
        var containerId = 'widget-root';
        if (!document.getElementById(containerId)) {
          var div = document.createElement('div');
          div.id = containerId;
          document.body.appendChild(div);
        }
        var script = document.createElement('script');
        script.src = 'http://127.0.0.1:5173/static/chat-widget.js';
        script.onload = function() {
          window.initSchoolChatWidget && window.initSchoolChatWidget({ schoolCode: '${schoolCode}' });
        };
        document.body.appendChild(script);
      })();
    `);
  });

  // Get formatted knowledge base for display
  app.get("/api/school/:schoolCode/knowledge-base-formatted", async (req, res) => {
    const { schoolCode } = req.params;
    try {
      const school = await getSchoolData(schoolCode);
      if (!school || Object.keys(school).length === 0) {
        return res.json({ formatted: "<span style='color:#888'>No knowledge base found for this school.</span>" });
      }
      // Use Gemini to format the full school context for display
      const { GoogleGenerativeAI } = require("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "AIzaSyD2u1YsYP5eWNhzREAHc3hsnLtvD0ImVKI");
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite-preview-06-17" });
      const prompt = `Format the following school context as a knowledge base for display to users. Use clear sections, bullet points, and emojis where appropriate. Do not use tables.\n\nSchool Context:\n${JSON.stringify(school, null, 2)}`;
      const chat = model.startChat({
        history: [
          { role: "user", parts: [{ text: prompt }] },
        ],
        generationConfig: { maxOutputTokens: 2048 },
      });
      const result = await chat.sendMessage("Format the knowledge base for display.");
      const formatted = result.response.text();
      res.json({ formatted });
    } catch (err) {
      console.error("Error formatting knowledge base:", err);
      res.status(500).json({ error: "Failed to format knowledge base" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
