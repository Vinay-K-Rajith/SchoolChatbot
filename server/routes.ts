import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertChatMessageSchema, insertChatSessionSchema } from "@shared/schema";
import { generateResponse, updateKnowledgeBaseWithGemini } from "./services/gemini";
import { nanoid } from "nanoid";
import { getSchoolContext, getSchoolAuth, getAllSessionsBySchool, getMessagesBySession, storeSession, storeMessage, countMessagesBySession } from "./services/school-context";
import { MongoClient } from "mongodb";
// @ts-ignore
import requestIp from "request-ip";
// If you get a 'Cannot find module \"dotenv\"' error, run: npm install dotenv
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { marked } from "marked";
import cookieParser from "cookie-parser";
import adminSchoolsRouter from './routes/adminSchools';
dotenv.config();

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
  app.use(cookieParser());

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
      const schoolContext = await getSchoolContext(schoolCode);
      if (!schoolContext) return res.status(404).json({ error: "School not found" });

      // Fetch Gemini API key from schools collection
      const uri = process.env.MONGODB_URI || "";
      const client = new MongoClient(uri);
      await client.connect();
      const db = client.db("test");
      const schoolAuth = await db.collection("schools").findOne({ schoolCode });
      await client.close();

      // Flatten school fields to root
      const schoolFields = schoolContext.school || {};
      res.json({
        ...schoolContext,
        ...schoolFields, // This brings generalInfo, infrastructure, etc. to the root
        geminiApiKey: schoolAuth?.geminiApiKey || ""
      });
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/school/:schoolCode/images", async (req, res) => {
    const { schoolCode } = req.params;
    try {
      const school = await getSchoolContext(schoolCode);
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
      const school = await getSchoolContext(schoolCode);
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
    const {
      generalInfo,
      infrastructure,
      fees,
      admissionAndDocuments,
      importantNotes,
      bus,
      links,
      miscellaneous
    } = req.body;
    try {
      const uri = process.env.MONGODB_URI || "";
      const client = new MongoClient(uri);
      await client.connect();
      const db = client.db("test");
      const collection = db.collection("school_data");
      // Build update object only with provided fields, inside school object
      const updateFields: any = {};
      if (generalInfo !== undefined) updateFields["school.generalInfo"] = generalInfo;
      if (infrastructure !== undefined) updateFields["school.infrastructure"] = infrastructure;
      if (fees !== undefined) updateFields["school.fees"] = fees;
      if (admissionAndDocuments !== undefined) updateFields["school.admissionAndDocuments"] = admissionAndDocuments;
      if (importantNotes !== undefined) updateFields["school.importantNotes"] = importantNotes;
      if (bus !== undefined) updateFields["school.bus"] = bus;
      if (links !== undefined) updateFields["school.links"] = links;
      if (miscellaneous !== undefined) updateFields["school.miscellaneous"] = miscellaneous;
      const result = await collection.updateOne(
        { schoolCode },
        { $set: updateFields }
      );
      // Fetch updated document
      const updatedDoc = await collection.findOne({ schoolCode });
      await client.close();
      res.json({ success: true, message: `Knowledge base updated for ${schoolCode}`, schoolData: updatedDoc });
    } catch (err) {
      console.error("Knowledge base update error:", err);
      res.status(500).json({ error: "Failed to update knowledge base" });
    }
  });

  // Metrics endpoint for dashboard
  app.get("/api/school/:schoolCode/metrics", async (req, res) => {
    const { schoolCode } = req.params;
    const uri = process.env.MONGODB_URI || "";
    const client = new MongoClient(uri);
    try {
      await client.connect();
      const db = client.db("test");
      const sessionsCollection = db.collection("chat_sessions");
      const messagesCollection = db.collection("chat_messages");

      const totalSessions = await sessionsCollection.countDocuments({ schoolCode });
      const totalMessages = await messagesCollection.countDocuments({ schoolCode, isUser: true });
      const userIds = await messagesCollection.distinct("sessionId", { schoolCode, isUser: true });
      const totalUsers = userIds.length;

      // View tracking logic
      const viewerId = req.ip + (req.headers['user-agent'] || '');
      trackView(schoolCode, viewerId);
      const totalViews = schoolViews[schoolCode] || 0;
      const totalActiveViewers = (schoolActiveViewers[schoolCode]?.size) || 0;

      res.json({ totalMessages, totalSessions, totalUsers, totalViews, totalActiveViewers });
    } catch (err) {
      console.error("Error fetching metrics from DB:", err);
      res.status(500).json({ error: "Failed to fetch metrics" });
    } finally {
      await client.close();
    }
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
    // Ensure start and end are Date objects
    if (typeof start === 'string') start = new Date(start);
    if (typeof end === 'string') end = new Date(end);
    if (start && end) {
      const startTime = start.getTime();
      const endTime = end.getTime();
      sessions = sessions.filter((session: any) => {
        // Robustly parse createdAt (handle ISO string or Date object)
        const created = session.createdAt ? new Date(session.createdAt) : null;
        if (!created || isNaN(created.getTime())) return false;
        const createdTime = created.getTime();
        return createdTime >= startTime && createdTime <= endTime;
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

  // Serve dynamic inject.js for embeddable widget (full widget loader)
  app.get('/:schoolCode/inject.js', (req: any, res: any) => {
    const { schoolCode } = req.params;
    res.type('application/javascript').send(`(function() {
      if (window.chatbotInjected) return;
      window.chatbotInjected = true;
      const config = {
        chatbotUrl: 'https://chat.entab.net/${schoolCode}',
        chatbotTitle: 'EnquiryDesk',
        buttonIcon: '💬',
        position: 'bottom-right'
      };
      const styles = \`
        .chatbot-container { position: fixed; bottom: 32px; right: 32px; z-index: 999999; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .chatbot-button { width: 70px; height: 70px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 50%; cursor: pointer; box-shadow: 0 4px 24px rgba(102, 126, 234, 0.4); transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; color: white; font-size: 30px; }
        .chatbot-button:hover { transform: scale(1.1); box-shadow: 0 6px 30px rgba(102, 126, 234, 0.6); }
        .chatbot-widget { position: absolute; bottom: 90px; right: 0; width: 480px; height: 720px; background: white; border-radius: 24px; box-shadow: 0 12px 48px rgba(0, 0, 0, 0.22); display: none; flex-direction: column; overflow: hidden; animation: slideUp 0.3s ease; }
        .chatbot-widget.active { display: flex; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .chatbot-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.25rem 1.5rem; display: flex; justify-content: space-between; align-items: center; position: relative; }
        .chatbot-title { font-weight: bold; font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem; }
        .chatbot-header .chatbot-logo { width: 32px; height: 32px; margin-right: 0.5rem; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15); }
        .chatbot-header .chatbot-logo img { width: 28px; height: 28px; }
        .chatbot-close { background: none; border: none; color: white; font-size: 2rem; cursor: pointer; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background 0.3s ease; }
        .chatbot-close:hover { background: rgba(255, 255, 255, 0.2); }
        .chatbot-iframe { flex: 1; border: none; width: 100%; }
        .chatbot-container.bottom-right { bottom: 32px; right: 32px; left: auto; }
        .chatbot-container.bottom-left { bottom: 32px; left: 32px; right: auto; }
        .chatbot-container.bottom-left .chatbot-widget { right: auto; left: 0; }
        .chatbot-container.top-right { top: 32px; bottom: auto; right: 32px; }
        .chatbot-container.top-right .chatbot-widget { top: 90px; bottom: auto; }
        .chatbot-container.top-left { top: 32px; bottom: auto; left: 32px; right: auto; }
        .chatbot-container.top-left .chatbot-widget { top: 90px; bottom: auto; right: auto; left: 0; }
        @media (max-width: 900px) { .chatbot-widget { width: 98vw; height: 80vh; right: 1vw; } .chatbot-container.bottom-left .chatbot-widget, .chatbot-container.top-left .chatbot-widget { left: 1vw; right: auto; } }
        @media (max-width: 600px) { .chatbot-widget { width: 100vw; height: 100vh; right: 0; left: 0; border-radius: 0; } .chatbot-container { bottom: 0 !important; right: 0 !important; left: 0 !important; } }
        @keyframes pulse { 0% { box-shadow: 0 4px 24px rgba(102, 126, 234, 0.4); } 50% { box-shadow: 0 4px 24px rgba(102, 126, 234, 0.8); } 100% { box-shadow: 0 4px 24px rgba(102, 126, 234, 0.4); } }
        .chatbot-button.pulse { animation: pulse 2s infinite; }
      \`;
      const styleSheet = document.createElement('style');
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
      const chatbotHTML = '<div class="chatbot-container ' + config.position + '"><button class="chatbot-button" id="chatbotToggle">' + config.buttonIcon + '</button><div class="chatbot-widget" id="chatbotWidget"><div class="chatbot-header"><div class="chatbot-title">' + config.chatbotTitle + '</div><button class="chatbot-close" id="chatbotClose">×</button></div><iframe class="chatbot-iframe" src="' + config.chatbotUrl + '" title="AI Chatbot"></iframe></div></div>';
      function initializeChatbot() {
        const container = document.createElement('div');
        container.innerHTML = chatbotHTML;
        document.body.appendChild(container.firstElementChild);
        const chatbotToggle = document.getElementById('chatbotToggle');
        const chatbotWidget = document.getElementById('chatbotWidget');
        const chatbotClose = document.getElementById('chatbotClose');
        chatbotToggle.addEventListener('click', () => {
          chatbotWidget.classList.add('active');
          chatbotToggle.style.display = 'none';
        });
        chatbotClose.addEventListener('click', () => {
          chatbotWidget.classList.remove('active');
          chatbotToggle.style.display = 'flex';
        });
        document.addEventListener('click', (e) => {
          if (!e.target.closest('.chatbot-container')) {
            chatbotWidget.classList.remove('active');
            chatbotToggle.style.display = 'flex';
          }
        });
        const hasSeenChatbot = localStorage.getItem('chatbot-seen');
        if (!hasSeenChatbot) {
          chatbotToggle.classList.add('pulse');
          setTimeout(() => {
            chatbotToggle.classList.remove('pulse');
            localStorage.setItem('chatbot-seen', 'true');
          }, 10000);
        }
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeChatbot);
      } else {
        initializeChatbot();
      }
      window.ChatbotConfig = {
        updateUrl: function(newUrl) {
          const iframe = document.querySelector('.chatbot-iframe');
          if (iframe) { iframe.src = newUrl; }
        },
        updateTitle: function(newTitle) {
          const title = document.querySelector('.chatbot-title');
          if (title) { title.textContent = newTitle; }
        },
        updateIcon: function(newIcon) {
          const button = document.querySelector('.chatbot-button');
          if (button) { button.textContent = newIcon; }
        },
        show: function() {
          const widget = document.getElementById('chatbotWidget');
          const toggle = document.getElementById('chatbotToggle');
          if (widget && toggle) {
            widget.classList.add('active');
            toggle.style.display = 'none';
          }
        },
        hide: function() {
          const widget = document.getElementById('chatbotWidget');
          const toggle = document.getElementById('chatbotToggle');
          if (widget && toggle) {
            widget.classList.remove('active');
            toggle.style.display = 'flex';
          }
        }
      };
    })();
    `);
  });

  // School admin login endpoint
  app.post("/api/school-admin/login", (req, res) => {
    const { username, password } = req.body;
    if (username === "admin" && password === "123") {
      res.cookie("schoolAdmin", "1", { httpOnly: true, sameSite: "lax" });
      return res.json({ success: true });
    }
    res.status(401).json({ success: false, error: "Invalid credentials" });
  });

  // School admin auth check endpoint
  app.get("/api/school-admin/check-auth", (req, res) => {
    if (req.cookies && req.cookies.schoolAdmin === "1") {
      return res.json({ authenticated: true });
    }
    res.json({ authenticated: false });
  });

  // Get all schools for admin dashboard
  app.get("/api/school-admin/schools", async (req, res) => {
    try {
      const uri = process.env.MONGODB_URI || "";
      const client = new MongoClient(uri);
      await client.connect();
      const db = client.db("test");
      // Use school_data as the source of truth for all schools
      const schoolData = await db.collection("school_data").find({}).toArray();
      const schoolsWithData = await Promise.all(schoolData.map(async (doc) => {
        const code = doc.schoolCode;
        const name = (doc.school && doc.school.name) ? doc.school.name : code;
        const sessionsCollection = db.collection("chat_sessions");
        const messagesCollection = db.collection("chat_messages");
        const totalSessions = await sessionsCollection.countDocuments({ schoolCode: code });
        const totalMessages = await messagesCollection.countDocuments({ schoolCode: code });
        return {
          code,
          name,
          totalSessions,
          totalMessages,
          status: doc.status || 'active',
        };
      }));
      // Sort by totalSessions desc, then totalMessages desc
      schoolsWithData.sort((a, b) => {
        if (b.totalSessions !== a.totalSessions) return b.totalSessions - a.totalSessions;
        return b.totalMessages - a.totalMessages;
      });
      await client.close();
      res.json({ schools: schoolsWithData });
    } catch (err) {
      console.error("Error fetching schools:", err);
      res.status(500).json({ error: "Failed to fetch schools" });
    }
  });

  // Get dashboard analytics for admin
  app.get("/api/school-admin/analytics", async (req, res) => {
    try {
      const uri = process.env.MONGODB_URI || "";
      const client = new MongoClient(uri);
      await client.connect();
      const db = client.db("test");
      
      const schoolsCollection = db.collection("schools");
      const sessionsCollection = db.collection("chat_sessions");
      const messagesCollection = db.collection("chat_messages");
      
      const totalSchools = await schoolsCollection.countDocuments({});
      const totalSessions = await sessionsCollection.countDocuments({});
      const totalMessages = await messagesCollection.countDocuments({});
      const totalUsers = await messagesCollection.distinct("sessionId");
      
      // Mock revenue data (in real app, this would come from billing system)
      const totalRevenue = totalSchools * 587.68; // Mock calculation
      
      res.json({
        metrics: {
          totalRevenue: totalRevenue.toFixed(2),
          totalSchools,
          totalSessions,
          totalMessages,
          totalUsers: totalUsers.length
        }
      });
      
      await client.close();
    } catch (err) {
      console.error("Error fetching analytics:", err);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Get all schools from school_data for admin dropdown
  app.get('/api/school-admin/school-data-list', async (req, res) => {
    try {
      const uri = process.env.MONGODB_URI || "";
      const client = new MongoClient(uri);
      await client.connect();
      const db = client.db("test");
      const schoolData = await db.collection("school_data").find({}).toArray();
      const result = schoolData.map(doc => ({
        schoolCode: doc.schoolCode,
        name: (doc.school && doc.school.name) ? doc.school.name : doc.schoolCode
      }));
      await client.close();
      res.json({ schools: result });
    } catch (err) {
      console.error("Error fetching school_data list:", err);
      res.status(500).json({ error: "Failed to fetch school_data list" });
    }
  });

  // Get daily usage (total messages per day across all schools)
  app.get("/api/school-admin/daily-usage", async (req, res) => {
    try {
      const uri = process.env.MONGODB_URI || "";
      const client = new MongoClient(uri);
      await client.connect();
      const db = client.db("test");
      const messagesCollection = db.collection("chat_messages");
      // Last 30 days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
      const pipeline = [
        { $match: { timestamp: { $gte: startDate } } },
        { $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            count: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
      ];
      const results = await messagesCollection.aggregate(pipeline).toArray();
      // Fill missing days with 0
      const usage: { date: string, count: number }[] = [];
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().slice(0, 10);
        const found = results.find(r => r._id === dateStr);
        usage.push({ date: dateStr, count: found ? found.count : 0 });
      }
      await client.close();
      res.json({ usage });
    } catch (err) {
      console.error("Error fetching daily usage:", err);
      res.status(500).json({ error: "Failed to fetch daily usage" });
    }
  });

  // School-wise daily usage (last 30 days)
  app.get("/api/school/:schoolCode/daily-usage", async (req, res) => {
    const { schoolCode } = req.params;
    try {
      const uri = process.env.MONGODB_URI || "";
      const client = new MongoClient(uri);
      await client.connect();
      const db = client.db("test");
      const messagesCollection = db.collection("chat_messages");
      // Last 30 days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
      const pipeline = [
        { $match: { schoolCode, timestamp: { $gte: startDate } } },
        { $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            count: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
      ];
      const results = await messagesCollection.aggregate(pipeline).toArray();
      // Fill missing days with 0
      const usage = [];
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().slice(0, 10);
        const found = results.find(r => r._id === dateStr);
        usage.push({ date: dateStr, count: found ? found.count : 0 });
      }
      await client.close();
      res.json({ usage });
    } catch (err) {
      console.error("Error fetching daily usage for school:", err);
      res.status(500).json({ error: "Failed to fetch daily usage" });
    }
  });

  // Endpoint to get unanswered messages for a school (with user question)
  app.get("/api/school/:schoolCode/unanswered-messages", async (req, res) => {
    const { schoolCode } = req.params;
    try {
      const uri = process.env.MONGODB_URI || "";
      const client = new MongoClient(uri);
      await client.connect();
      const db = client.db("test");
      const messagesCollection = db.collection("chat_messages");
      const phrases = [
        "I don't have",
        "I'm sorry",
        "I cannot provide information",
        "I cannot fulfill this request"
      ];
      const regex = new RegExp(phrases.map(p => p.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join("|"), "i");
      // Find all bot messages matching the phrases
      const botMessages = await messagesCollection.find({
        schoolCode,
        isUser: false,
        content: { $regex: regex }
      }).sort({ timestamp: -1 }).toArray();
      // For each bot message, find the immediately preceding user message in the same session
      const results = await Promise.all(botMessages.map(async (botMsg) => {
        const userMsg = await messagesCollection.find({
          schoolCode,
          sessionId: botMsg.sessionId,
          isUser: true,
          timestamp: { $lt: botMsg.timestamp }
        }).sort({ timestamp: -1 }).limit(1).toArray();
        return {
          question: userMsg[0]?.content || "(User message not found)",
          answer: botMsg.content,
          timestamp: botMsg.timestamp
        };
      }));
      await client.close();
      res.json({ messages: results });
    } catch (err) {
      console.error("Error fetching unanswered messages:", err);
      res.status(500).json({ error: "Failed to fetch unanswered messages" });
    }
  });

  // PATCH endpoint to update Gemini API key for a school
  app.patch("/api/school/:schoolCode/gemini-api-key", async (req, res) => {
    const { schoolCode } = req.params;
    const { geminiApiKey } = req.body;
    if (!geminiApiKey) return res.status(400).json({ error: "Gemini API key required" });

    try {
      const uri = process.env.MONGODB_URI || "";
      const client = new MongoClient(uri);
      await client.connect();
      const db = client.db("test");
      const result = await db.collection("schools").updateOne(
        { schoolCode },
        { $set: { geminiApiKey } }
      );
      await client.close();
      if (result.modifiedCount === 1) {
        res.json({ success: true, geminiApiKey });
      } else {
        res.status(404).json({ error: "School not found" });
      }
    } catch (err) {
      res.status(500).json({ error: "Failed to update Gemini API key" });
    }
  });

  app.use('/api/admin', adminSchoolsRouter);

  const httpServer = createServer(app);
  return httpServer;
}
