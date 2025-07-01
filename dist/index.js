// server/index.ts
import express2 from "express";

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
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  async createChatSession(insertSession) {
    const session = {
      id: Date.now(),
      sessionId: insertSession.sessionId,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.chatSessions.set(session.sessionId, session);
    this.chatMessages.set(session.sessionId, []);
    return session;
  }
  async createChatMessage(insertMessage) {
    const message = {
      id: this.currentMessageId++,
      sessionId: insertMessage.sessionId,
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
};
var storage = new MemStorage();

// server/services/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

// server/services/school-context.ts
import { MongoClient } from "mongodb";
var uri = "mongodb+srv://vaishakhp11:PiPa7LUEZ5ufQo8z@cluster0.toscmfj.mongodb.net/";
var client = new MongoClient(uri);
async function getSchoolData(schoolCode) {
  await client.connect();
  const db = client.db("test");
  const collection = db.collection("school_data");
  const school = await collection.findOne({ schoolCode });
  return school;
}

// server/services/gemini.ts
var genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_API_KEY || "AIzaSyD2u1YsYP5eWNhzREAHc3hsnLtvD0ImVKI"
);
async function generateResponse(userMessage, sessionId, schoolCode = "SXSBT") {
  try {
    const schoolContext = await getSchoolData(schoolCode);
    const systemPrompt = `You are an AI assistant for a School. You help students and parents with enquiries about the school.

School context:
${JSON.stringify(schoolContext, null, 2)}

Be concise, accurate, and helpful.Use proper formatting with emojis and bullet points for better readability.Be clear and concise but compelling in your responses. never use table to give output
`;
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
async function registerRoutes(app2) {
  app2.post("/api/chat/session", async (req, res) => {
    try {
      const sessionId = nanoid();
      const session = await storage.createChatSession({ sessionId });
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
        content,
        isUser: true
      });
      const aiResponse = await generateResponse(content, sessionId, schoolCode);
      const aiMessage = await storage.createChatMessage({
        sessionId,
        content: aiResponse,
        isUser: false
      });
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
      const school = await getSchoolData(schoolCode);
      if (!school) return res.status(404).json({ error: "School not found" });
      res.json(school);
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });
  app2.get("/api/school/:schoolCode/images", async (req, res) => {
    const { schoolCode } = req.params;
    try {
      const school = await getSchoolData(schoolCode);
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
      const school = await getSchoolData(schoolCode);
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
    const { text, image } = req.body;
    res.json({ success: true, message: `Knowledge base updated for ${schoolCode}` });
  });
  app2.get("/api/school/:schoolCode/metrics", async (req, res) => {
    const { schoolCode } = req.params;
    const allSessions = storage.getAllChatSessions();
    const allMessages = storage.getAllChatMessages();
    const totalSessions = allSessions.length;
    const totalMessages = allMessages.filter((m) => m.isUser).length;
    const userIds = new Set(allMessages.filter((m) => m.isUser).map((m) => m.sessionId));
    const totalUsers = userIds.size;
    res.json({ totalMessages, totalSessions, totalUsers });
  });
  app2.get("/api/school/:schoolCode/recent-activity", async (req, res) => {
    const { schoolCode } = req.params;
    const allMessages = storage.getAllChatMessages();
    const recent = allMessages.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
    res.json({ recent });
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        widget: path.resolve(__dirname, "client/widget.html")
      }
    }
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
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
    server: serverOptions,
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
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use(express2.static("dist"));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
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
