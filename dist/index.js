var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/services/apiKeyService.cjs
var require_apiKeyService = __commonJS({
  "server/services/apiKeyService.cjs"(exports, module) {
    "use strict";
    var crypto = __require("crypto");
    var { MongoClient: MongoClient4, ObjectId: ObjectId2 } = __require("mongodb");
    var client3 = new MongoClient4(process.env.MONGODB_URI);
    var ApiKeyService2 = class {
      static generateApiKey(schoolId) {
        return `sk_${schoolId}_${crypto.randomBytes(32).toString("hex")}`;
      }
      static generateApiSecret() {
        return crypto.randomBytes(48).toString("hex");
      }
      static async createApiKeyForSchool(schoolId) {
        const apiKey = this.generateApiKey(schoolId);
        const apiSecret = this.generateApiSecret();
        await client3.connect();
        const db = client3.db();
        await db.collection("schools").updateOne(
          { _id: new ObjectId2(schoolId) },
          { $set: { api_key: apiKey, api_secret: apiSecret } }
        );
        return { apiKey, apiSecret };
      }
      static async validateApiKey(apiKey) {
        await client3.connect();
        const db = client3.db();
        const school = await db.collection("schools").findOne({ api_key: apiKey, status: "active" });
        return school;
      }
      static async rotateApiKey(schoolId) {
        return this.createApiKeyForSchool(schoolId);
      }
    };
    module.exports = ApiKeyService2;
  }
});

// server/index.ts
import express3 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
var MemStorage = class {
  users;
  chatSessions;
  chatMessages;
  currentUserId;
  currentMessageId;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.chatSessions = /* @__PURE__ */ new Map();
    this.chatMessages = /* @__PURE__ */ new Map();
    this.currentUserId = 1;
    this.currentMessageId = 1;
  }
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = this.currentUserId++;
    const user = { ...insertUser, id, schoolId: insertUser.schoolId ?? null };
    this.users.set(id, user);
    return user;
  }
  async createChatSession(insertSession) {
    const session = {
      id: Date.now(),
      sessionId: insertSession.sessionId,
      schoolCode: insertSession.schoolCode,
      schoolId: insertSession.schoolId ?? null,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.chatSessions.set(session.sessionId, session);
    this.chatMessages.set(session.sessionId, []);
    return session;
  }
  async createChatMessage(insertMessage) {
    const session = this.chatSessions.get(insertMessage.sessionId);
    const schoolCode = insertMessage.schoolCode || (session ? session.schoolCode : "");
    const schoolId = insertMessage.schoolId ?? (session ? session.schoolId : null);
    const message = {
      id: this.currentMessageId++,
      sessionId: insertMessage.sessionId,
      schoolCode,
      schoolId,
      content: insertMessage.content,
      isUser: insertMessage.isUser,
      timestamp: /* @__PURE__ */ new Date(),
      metadata: insertMessage.metadata || null
    };
    const sessionMessages = this.chatMessages.get(insertMessage.sessionId) || [];
    sessionMessages.push(message);
    this.chatMessages.set(insertMessage.sessionId, sessionMessages);
    return message;
  }
  async getChatMessages(sessionId) {
    return this.chatMessages.get(sessionId) || [];
  }
  getAllChatSessions() {
    return Array.from(this.chatSessions.values());
  }
  getAllChatMessages() {
    return Array.from(this.chatMessages.values()).flat();
  }
  getAllChatSessionsBySchool(schoolCode) {
    return Array.from(this.chatSessions.values()).filter((s) => s.schoolCode === schoolCode);
  }
  getAllChatMessagesBySchool(schoolCode) {
    return Array.from(this.chatMessages.values()).flat().filter((m) => m.schoolCode === schoolCode);
  }
};
var storage = new MemStorage();

// server/services/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

// server/services/school-context.ts
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();
var uri = process.env.MONGODB_URI || "";
var client = new MongoClient(uri);
async function getSchoolContext(schoolCode) {
  await client.connect();
  const db = client.db("test");
  const collection = db.collection("school_data");
  const school = await collection.findOne({ schoolCode });
  return school;
}
async function getSchoolAuth(schoolCode) {
  await client.connect();
  const db = client.db("test");
  const collection = db.collection("schools");
  const school = await collection.findOne({ schoolCode });
  return school;
}
async function getAllSessionsBySchool(schoolCode) {
  await client.connect();
  const db = client.db("test");
  const collection = db.collection("chat_sessions");
  return collection.find({ schoolCode }).toArray();
}
async function getMessagesBySession(sessionId, schoolCode) {
  await client.connect();
  const db = client.db("test");
  const collection = db.collection("chat_messages");
  return collection.find({ sessionId, schoolCode }).toArray();
}
async function storeSession(session) {
  await client.connect();
  const db = client.db("test");
  const collection = db.collection("chat_sessions");
  await collection.insertOne(session);
}
async function storeMessage(message) {
  await client.connect();
  const db = client.db("test");
  const collection = db.collection("chat_messages");
  await collection.insertOne(message);
}
async function countMessagesBySession(sessionId, schoolCode) {
  await client.connect();
  const db = client.db("test");
  const collection = db.collection("chat_messages");
  return collection.countDocuments({ sessionId, schoolCode });
}

// server/services/gemini.ts
import dotenv2 from "dotenv";
dotenv2.config();
async function generateResponse(userMessage, sessionId, schoolCode = "SXSBT") {
  try {
    const schoolContext = await getSchoolContext(schoolCode);
    const schoolAuth = await getSchoolAuth(schoolCode);
    if (!schoolAuth || !schoolAuth.geminiApiKey) {
      return "Sorry, this school's Gemini API key is not configured.";
    }
    const systemPrompt = `You are an AI assistant for a School. You help students and parents with enquiries about the school.

School context:
${JSON.stringify(schoolContext, null, 2)}

Be concise, accurate, and helpful.Use proper formatting with emojis and bullet points for better readability.Be clear and concise but compelling in your responses. never use table to give output
`;
    const genAI = new GoogleGenerativeAI(schoolAuth.geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite-preview-06-17" });
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemPrompt }]
        }
      ],
      generationConfig: {
        maxOutputTokens: 2048
      }
    });
    const result = await chat.sendMessage(userMessage);
    return result.response.text();
  } catch (err) {
    console.error("Gemini error:", err);
    return "Sorry, there was an error generating a response.";
  }
}

// server/routes.ts
import { nanoid } from "nanoid";
import { MongoClient as MongoClient3 } from "mongodb";
import requestIp from "request-ip";
import dotenv3 from "dotenv";
import cookieParser from "cookie-parser";

// server/routes/adminSchools.ts
var import_apiKeyService = __toESM(require_apiKeyService(), 1);
import express from "express";
import { MongoClient as MongoClient2 } from "mongodb";
var router = express.Router();
var client2 = new MongoClient2(process.env.MONGODB_URI);
router.post("/schools", async (req, res) => {
  const { code, name, geminiApiKey } = req.body;
  if (!code || !name || !geminiApiKey) {
    return res.status(400).json({ error: "All fields required" });
  }
  await client2.connect();
  const db = client2.db();
  const existing = await db.collection("schools").findOne({ schoolCode: code });
  if (existing) return res.status(409).json({ error: "School code already exists" });
  const schoolDoc = {
    schoolCode: code,
    name,
    geminiApiKey,
    status: "active",
    created_at: /* @__PURE__ */ new Date(),
    updated_at: /* @__PURE__ */ new Date()
  };
  const schoolResult = await db.collection("schools").insertOne(schoolDoc);
  const schoolId = schoolResult.insertedId;
  const { apiKey, apiSecret } = await import_apiKeyService.default.createApiKeyForSchool(schoolId.toString());
  await db.collection("schools").updateOne(
    { _id: schoolId },
    { $set: { api_key: apiKey, api_secret: apiSecret } }
  );
  await db.collection("school_data").insertOne({
    schoolCode: code,
    school: { name }
  });
  res.status(201).json({
    schoolId,
    apiKey,
    embedCode: `<script src="https://yourdomain.com/${code}/inject.js"></script>`
  });
});
router.get("/schools", async (_req, res) => {
  await client2.connect();
  const db = client2.db();
  const schools = await db.collection("schools").find({}).toArray();
  res.json({ schools });
});
var adminSchools_default = router;

// server/routes.ts
dotenv3.config();
var schoolViews = {};
var schoolActiveViewers = {};
function trackView(schoolCode, viewerId) {
  schoolViews[schoolCode] = (schoolViews[schoolCode] || 0) + 1;
  if (!schoolActiveViewers[schoolCode]) schoolActiveViewers[schoolCode] = /* @__PURE__ */ new Set();
  schoolActiveViewers[schoolCode].add(viewerId);
  setTimeout(() => {
    schoolActiveViewers[schoolCode]?.delete(viewerId);
  }, 10 * 60 * 1e3);
}
async function registerRoutes(app2) {
  app2.use(cookieParser());
  app2.post("/api/chat/session", async (req, res) => {
    try {
      const sessionId = nanoid();
      const schoolCode = req.body.schoolCode || "SXSBT";
      const ip = requestIp.getClientIp(req) || req.ip || null;
      const session = await storage.createChatSession({ sessionId, schoolCode });
      await storeSession({ sessionId, schoolCode, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date(), ip });
      res.json({ sessionId: session.sessionId });
    } catch (error) {
      console.error("Error creating chat session:", error);
      res.status(500).json({ error: "Failed to create chat session" });
    }
  });
  app2.post("/api/chat/message", async (req, res) => {
    try {
      const { sessionId, content, schoolCode = "SXSBT" } = req.body;
      if (!sessionId || !content) {
        return res.status(400).json({ error: "Session ID and content are required" });
      }
      const userMessage = await storage.createChatMessage({
        sessionId,
        schoolCode,
        content,
        isUser: true
      });
      await storeMessage({ sessionId, schoolCode, content, isUser: true, timestamp: /* @__PURE__ */ new Date() });
      const aiResponse = await generateResponse(content, sessionId, schoolCode);
      const aiMessage = await storage.createChatMessage({
        sessionId,
        schoolCode,
        content: aiResponse,
        isUser: false
      });
      await storeMessage({ sessionId, schoolCode, content: aiResponse, isUser: false, timestamp: /* @__PURE__ */ new Date() });
      res.json({
        userMessage,
        aiMessage
      });
    } catch (error) {
      console.error("Error processing message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });
  app2.get("/api/chat/history/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const messages = await storage.getChatMessages(sessionId);
      res.json({ messages });
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ error: "Failed to fetch chat history" });
    }
  });
  app2.get("/api/school/:schoolCode", async (req, res) => {
    const { schoolCode } = req.params;
    try {
      const schoolContext = await getSchoolContext(schoolCode);
      if (!schoolContext) return res.status(404).json({ error: "School not found" });
      const uri2 = process.env.MONGODB_URI || "";
      const client3 = new MongoClient3(uri2);
      await client3.connect();
      const db = client3.db("test");
      const schoolAuth = await db.collection("schools").findOne({ schoolCode });
      await client3.close();
      const schoolFields = schoolContext.school || {};
      res.json({
        ...schoolContext,
        ...schoolFields,
        // This brings generalInfo, infrastructure, etc. to the root
        geminiApiKey: schoolAuth?.geminiApiKey || ""
      });
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });
  app2.get("/api/school/:schoolCode/images", async (req, res) => {
    const { schoolCode } = req.params;
    try {
      const school = await getSchoolContext(schoolCode);
      if (!school) return res.status(404).json({ error: "School not found" });
      const images = (school.school?.images || []).map((img) => ({
        url: img.url || img,
        alt: img.alt || img.caption || "School image"
      }));
      res.json({ images });
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });
  app2.get("/api/school/:schoolCode/image-keywords", async (req, res) => {
    const { schoolCode } = req.params;
    try {
      const school = await getSchoolContext(schoolCode);
      if (!school) return res.status(404).json({ error: "School not found" });
      const keywords = (school.school?.images || []).map((img) => img.keyword || img.alt || img.caption || null).filter(Boolean);
      res.json({ keywords });
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });
  app2.get("/api/school/:schoolCode/analytics", async (req, res) => {
    const { schoolCode } = req.params;
    const { timeframe = "hourly" } = req.query;
    const allMessages = storage.getAllChatMessagesBySchool(schoolCode);
    const now = /* @__PURE__ */ new Date();
    let data = [];
    if (timeframe === "hourly") {
      data = Array.from({ length: 24 }, (_, i) => ({ label: `${i}:00`, value: Math.floor(Math.random() * 20) }));
    } else if (timeframe === "daily") {
      data = Array.from({ length: 7 }, (_, i) => ({ label: `Day ${i + 1}`, value: Math.floor(Math.random() * 100) }));
    } else if (timeframe === "weekly") {
      data = Array.from({ length: 4 }, (_, i) => ({ label: `Week ${i + 1}`, value: Math.floor(Math.random() * 200) }));
    } else if (timeframe === "monthly") {
      data = Array.from({ length: 12 }, (_, i) => ({ label: `Month ${i + 1}`, value: Math.floor(Math.random() * 500) }));
    } else if (timeframe === "yearly") {
      data = Array.from({ length: 5 }, (_, i) => ({ label: `${now.getFullYear() - 4 + i}`, value: Math.floor(Math.random() * 1e3) }));
    }
    res.json({ data });
  });
  app2.post("/api/school/:schoolCode/knowledge-base", async (req, res) => {
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
      const uri2 = process.env.MONGODB_URI || "";
      const client3 = new MongoClient3(uri2);
      await client3.connect();
      const db = client3.db("test");
      const collection = db.collection("school_data");
      const updateFields = {};
      if (generalInfo !== void 0) updateFields["school.generalInfo"] = generalInfo;
      if (infrastructure !== void 0) updateFields["school.infrastructure"] = infrastructure;
      if (fees !== void 0) updateFields["school.fees"] = fees;
      if (admissionAndDocuments !== void 0) updateFields["school.admissionAndDocuments"] = admissionAndDocuments;
      if (importantNotes !== void 0) updateFields["school.importantNotes"] = importantNotes;
      if (bus !== void 0) updateFields["school.bus"] = bus;
      if (links !== void 0) updateFields["school.links"] = links;
      if (miscellaneous !== void 0) updateFields["school.miscellaneous"] = miscellaneous;
      const result = await collection.updateOne(
        { schoolCode },
        { $set: updateFields }
      );
      const updatedDoc = await collection.findOne({ schoolCode });
      await client3.close();
      res.json({ success: true, message: `Knowledge base updated for ${schoolCode}`, schoolData: updatedDoc });
    } catch (err) {
      console.error("Knowledge base update error:", err);
      res.status(500).json({ error: "Failed to update knowledge base" });
    }
  });
  app2.get("/api/school/:schoolCode/metrics", async (req, res) => {
    const { schoolCode } = req.params;
    const uri2 = process.env.MONGODB_URI || "";
    const client3 = new MongoClient3(uri2);
    try {
      await client3.connect();
      const db = client3.db("test");
      const sessionsCollection = db.collection("chat_sessions");
      const messagesCollection = db.collection("chat_messages");
      const totalSessions = await sessionsCollection.countDocuments({ schoolCode });
      const totalMessages = await messagesCollection.countDocuments({ schoolCode, isUser: true });
      const userIds = await messagesCollection.distinct("sessionId", { schoolCode, isUser: true });
      const totalUsers = userIds.length;
      const viewerId = req.ip + (req.headers["user-agent"] || "");
      trackView(schoolCode, viewerId);
      const totalViews = schoolViews[schoolCode] || 0;
      const totalActiveViewers = schoolActiveViewers[schoolCode]?.size || 0;
      res.json({ totalMessages, totalSessions, totalUsers, totalViews, totalActiveViewers });
    } catch (err) {
      console.error("Error fetching metrics from DB:", err);
      res.status(500).json({ error: "Failed to fetch metrics" });
    } finally {
      await client3.close();
    }
  });
  app2.get("/api/school/:schoolCode/recent-activity", async (req, res) => {
    const { schoolCode } = req.params;
    const allMessages = storage.getAllChatMessages();
    const recent = allMessages.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
    res.json({ recent });
  });
  app2.get("/api/school/:schoolCode/sessions", async (req, res) => {
    const { schoolCode } = req.params;
    const { startDate, endDate } = req.query;
    let start = void 0;
    let end = void 0;
    if (typeof startDate === "string") start = new Date(startDate);
    if (typeof endDate === "string") end = new Date(endDate);
    let sessions = await getAllSessionsBySchool(schoolCode);
    if (typeof start === "string") start = new Date(start);
    if (typeof end === "string") end = new Date(end);
    if (start && end) {
      const startTime = start.getTime();
      const endTime = end.getTime();
      sessions = sessions.filter((session) => {
        const created = session.createdAt ? new Date(session.createdAt) : null;
        if (!created || isNaN(created.getTime())) return false;
        const createdTime = created.getTime();
        return createdTime >= startTime && createdTime <= endTime;
      });
    }
    const sessionsWithCounts = await Promise.all(sessions.map(async (session) => {
      const totalMessages = await countMessagesBySession(session.sessionId, schoolCode);
      return { ...session, totalMessages };
    }));
    res.json({ sessions: sessionsWithCounts });
  });
  app2.get("/api/school/:schoolCode/session/:sessionId/messages", async (req, res) => {
    const { schoolCode, sessionId } = req.params;
    const messages = await getMessagesBySession(sessionId, schoolCode);
    res.json({ messages });
  });
  app2.get("/:schoolCode/inject.js", (req, res) => {
    const { schoolCode } = req.params;
    res.type("application/javascript").send(`(function() {
      if (window.chatbotInjected) return;
      window.chatbotInjected = true;
      const config = {
        chatbotUrl: 'https://chat.entab.net/${schoolCode}',
        chatbotTitle: 'EnquiryDesk',
        buttonIcon: '\u{1F4AC}',
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
      const chatbotHTML = '<div class="chatbot-container ' + config.position + '"><button class="chatbot-button" id="chatbotToggle">' + config.buttonIcon + '</button><div class="chatbot-widget" id="chatbotWidget"><div class="chatbot-header"><div class="chatbot-title">' + config.chatbotTitle + '</div><button class="chatbot-close" id="chatbotClose">\xD7</button></div><iframe class="chatbot-iframe" src="' + config.chatbotUrl + '" title="AI Chatbot"></iframe></div></div>';
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
  app2.post("/api/school-admin/login", (req, res) => {
    const { username, password } = req.body;
    if (username === "admin" && password === "123") {
      res.cookie("schoolAdmin", "1", { httpOnly: true, sameSite: "lax" });
      return res.json({ success: true });
    }
    res.status(401).json({ success: false, error: "Invalid credentials" });
  });
  app2.get("/api/school-admin/check-auth", (req, res) => {
    if (req.cookies && req.cookies.schoolAdmin === "1") {
      return res.json({ authenticated: true });
    }
    res.json({ authenticated: false });
  });
  app2.get("/api/school-admin/schools", async (req, res) => {
    try {
      const uri2 = process.env.MONGODB_URI || "";
      const client3 = new MongoClient3(uri2);
      await client3.connect();
      const db = client3.db("test");
      const schoolData = await db.collection("school_data").find({}).toArray();
      const schoolsWithData = await Promise.all(schoolData.map(async (doc) => {
        const code = doc.schoolCode;
        const name = doc.school && doc.school.name ? doc.school.name : code;
        const sessionsCollection = db.collection("chat_sessions");
        const messagesCollection = db.collection("chat_messages");
        const totalSessions = await sessionsCollection.countDocuments({ schoolCode: code });
        const totalMessages = await messagesCollection.countDocuments({ schoolCode: code });
        return {
          code,
          name,
          totalSessions,
          totalMessages,
          status: doc.status || "active"
        };
      }));
      schoolsWithData.sort((a, b) => {
        if (b.totalSessions !== a.totalSessions) return b.totalSessions - a.totalSessions;
        return b.totalMessages - a.totalMessages;
      });
      await client3.close();
      res.json({ schools: schoolsWithData });
    } catch (err) {
      console.error("Error fetching schools:", err);
      res.status(500).json({ error: "Failed to fetch schools" });
    }
  });
  app2.get("/api/school-admin/analytics", async (req, res) => {
    try {
      const uri2 = process.env.MONGODB_URI || "";
      const client3 = new MongoClient3(uri2);
      await client3.connect();
      const db = client3.db("test");
      const schoolsCollection = db.collection("schools");
      const sessionsCollection = db.collection("chat_sessions");
      const messagesCollection = db.collection("chat_messages");
      const totalSchools = await schoolsCollection.countDocuments({});
      const totalSessions = await sessionsCollection.countDocuments({});
      const totalMessages = await messagesCollection.countDocuments({});
      const totalUsers = await messagesCollection.distinct("sessionId");
      const totalRevenue = totalSchools * 587.68;
      res.json({
        metrics: {
          totalRevenue: totalRevenue.toFixed(2),
          totalSchools,
          totalSessions,
          totalMessages,
          totalUsers: totalUsers.length
        }
      });
      await client3.close();
    } catch (err) {
      console.error("Error fetching analytics:", err);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });
  app2.get("/api/school-admin/school-data-list", async (req, res) => {
    try {
      const uri2 = process.env.MONGODB_URI || "";
      const client3 = new MongoClient3(uri2);
      await client3.connect();
      const db = client3.db("test");
      const schoolData = await db.collection("school_data").find({}).toArray();
      const result = schoolData.map((doc) => ({
        schoolCode: doc.schoolCode,
        name: doc.school && doc.school.name ? doc.school.name : doc.schoolCode
      }));
      await client3.close();
      res.json({ schools: result });
    } catch (err) {
      console.error("Error fetching school_data list:", err);
      res.status(500).json({ error: "Failed to fetch school_data list" });
    }
  });
  app2.get("/api/school-admin/daily-usage", async (req, res) => {
    try {
      const uri2 = process.env.MONGODB_URI || "";
      const client3 = new MongoClient3(uri2);
      await client3.connect();
      const db = client3.db("test");
      const messagesCollection = db.collection("chat_messages");
      const startDate = /* @__PURE__ */ new Date();
      startDate.setDate(startDate.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
      const pipeline = [
        { $match: { timestamp: { $gte: startDate } } },
        { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          count: { $sum: 1 }
        } },
        { $sort: { _id: 1 } }
      ];
      const results = await messagesCollection.aggregate(pipeline).toArray();
      const usage = [];
      const today = /* @__PURE__ */ new Date();
      for (let i = 0; i < 30; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().slice(0, 10);
        const found = results.find((r) => r._id === dateStr);
        usage.push({ date: dateStr, count: found ? found.count : 0 });
      }
      await client3.close();
      res.json({ usage });
    } catch (err) {
      console.error("Error fetching daily usage:", err);
      res.status(500).json({ error: "Failed to fetch daily usage" });
    }
  });
  app2.get("/api/school/:schoolCode/daily-usage", async (req, res) => {
    const { schoolCode } = req.params;
    try {
      const uri2 = process.env.MONGODB_URI || "";
      const client3 = new MongoClient3(uri2);
      await client3.connect();
      const db = client3.db("test");
      const messagesCollection = db.collection("chat_messages");
      const startDate = /* @__PURE__ */ new Date();
      startDate.setDate(startDate.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
      const pipeline = [
        { $match: { schoolCode, timestamp: { $gte: startDate } } },
        { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          count: { $sum: 1 }
        } },
        { $sort: { _id: 1 } }
      ];
      const results = await messagesCollection.aggregate(pipeline).toArray();
      const usage = [];
      const today = /* @__PURE__ */ new Date();
      for (let i = 0; i < 30; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().slice(0, 10);
        const found = results.find((r) => r._id === dateStr);
        usage.push({ date: dateStr, count: found ? found.count : 0 });
      }
      await client3.close();
      res.json({ usage });
    } catch (err) {
      console.error("Error fetching daily usage for school:", err);
      res.status(500).json({ error: "Failed to fetch daily usage" });
    }
  });
  app2.get("/api/school/:schoolCode/unanswered-messages", async (req, res) => {
    const { schoolCode } = req.params;
    try {
      const uri2 = process.env.MONGODB_URI || "";
      const client3 = new MongoClient3(uri2);
      await client3.connect();
      const db = client3.db("test");
      const messagesCollection = db.collection("chat_messages");
      const phrases = [
        "I don't have",
        "I'm sorry",
        "I cannot provide information",
        "I cannot fulfill this request"
      ];
      const regex = new RegExp(phrases.map((p) => p.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")).join("|"), "i");
      const botMessages = await messagesCollection.find({
        schoolCode,
        isUser: false,
        content: { $regex: regex }
      }).sort({ timestamp: -1 }).toArray();
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
      await client3.close();
      res.json({ messages: results });
    } catch (err) {
      console.error("Error fetching unanswered messages:", err);
      res.status(500).json({ error: "Failed to fetch unanswered messages" });
    }
  });
  app2.patch("/api/school/:schoolCode/gemini-api-key", async (req, res) => {
    const { schoolCode } = req.params;
    const { geminiApiKey } = req.body;
    if (!geminiApiKey) return res.status(400).json({ error: "Gemini API key required" });
    try {
      const uri2 = process.env.MONGODB_URI || "";
      const client3 = new MongoClient3(uri2);
      await client3.connect();
      const db = client3.db("test");
      const result = await db.collection("schools").updateOne(
        { schoolCode },
        { $set: { geminiApiKey } }
      );
      await client3.close();
      if (result.modifiedCount === 1) {
        res.json({ success: true, geminiApiKey });
      } else {
        res.status(404).json({ error: "School not found" });
      }
    } catch (err) {
      res.status(500).json({ error: "Failed to update Gemini API key" });
    }
  });
  app2.use("/api/admin", adminSchools_default);
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import vitePluginCssInjectedByJs from "vite-plugin-css-injected-by-js";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var vite_config_default = defineConfig({
  root: path.resolve(__dirname, "client"),
  plugins: [react(), vitePluginCssInjectedByJs()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets")
    }
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, "client/src/widget.tsx"),
      name: "SchoolChatWidget",
      fileName: () => "chat-widget.js",
      formats: ["iife"]
    },
    minify: true,
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith(".css")) {
            return "static/chat-widget.css";
          }
          return "static/[name][extname]";
        }
      }
    }
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    },
    allowedHosts: true
  }
});

// server/vite.ts
import { nanoid as nanoid2 } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: {
      ...serverOptions,
      allowedHosts: true
    },
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid2()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import path3 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path3.dirname(__filename2);
var app = express3();
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
app.use(express3.static("dist"));
app.use("/static", express3.static(path3.join(__dirname2, "../dist")));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5173;
  server.listen(5173, "127.0.0.1", () => {
    console.log("Server running on http://127.0.0.1:5173");
  });
})();
