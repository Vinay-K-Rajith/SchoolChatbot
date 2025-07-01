import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertChatMessageSchema, insertChatSessionSchema } from "@shared/schema";
import { generateResponse } from "./services/gemini";
import { nanoid } from "nanoid";
import { getSchoolData } from "./services/school-context";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create a new chat session
  app.post("/api/chat/session", async (req, res) => {
    try {
      const sessionId = nanoid();
      const session = await storage.createChatSession({ sessionId });
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
        content,
        isUser: true,
      });

      // Generate AI response
      const aiResponse = await generateResponse(content, sessionId, schoolCode);

      // Save AI response
      const aiMessage = await storage.createChatMessage({
        sessionId,
        content: aiResponse,
        isUser: false,
      });

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
    // TODO: Fetch analytics from MongoDB for the given schoolCode and timeframe
    // Example: aggregate chat messages by hour/day/week/month/year
    // Return mock data for now
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
    // TODO: Use Gemini API to generate a MongoDB query based on text/image and update the school's knowledge base
    // Use the provided Gemini API key and model
    // For now, simulate success
    res.json({ success: true, message: `Knowledge base updated for ${schoolCode}` });
  });

  // Metrics endpoint for dashboard
  app.get("/api/school/:schoolCode/metrics", async (req, res) => {
    const { schoolCode } = req.params;
    // Aggregate metrics from storage
    // For now, aggregate all sessions/messages (since schoolCode is not in schema, assume all data is for the school)
    // In a real app, filter by schoolCode
    const allSessions = storage.getAllChatSessions();
    const allMessages = storage.getAllChatMessages();
    const totalSessions = allSessions.length;
    const totalMessages = allMessages.filter(m => m.isUser).length;
    const userIds = new Set(allMessages.filter(m => m.isUser).map(m => m.sessionId));
    const totalUsers = userIds.size;
    res.json({ totalMessages, totalSessions, totalUsers });
  });

  // Recent activity endpoint for dashboard
  app.get("/api/school/:schoolCode/recent-activity", async (req, res) => {
    const { schoolCode } = req.params;
    // For now, return the latest 10 chat messages (in a real app, filter by schoolCode)
    const allMessages = storage.getAllChatMessages();
    const recent = allMessages.sort((a, b) => (b.timestamp as any) - (a.timestamp as any)).slice(0, 10);
    res.json({ recent });
  });

  const httpServer = createServer(app);
  return httpServer;
}
