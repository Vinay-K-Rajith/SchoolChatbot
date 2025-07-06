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
// If you get a 'Cannot find module \"dotenv\"' error, run: npm install dotenv
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { marked } from "marked";
import cookieParser from "cookie-parser";
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
      const uri = process.env.MONGODB_URI || "";
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

  // Serve dynamic inject.js for embeddable widget (loader only, loads static widget JS)
  app.get('/:schoolCode/inject.js', (req: any, res: any) => {
    const { schoolCode } = req.params;
    res.type('application/javascript').send(`
      (function() {
        if (window.__schoolChatWidgetLoaded) return;
        window.__schoolChatWidgetLoaded = true;
        var script = document.createElement('script');
        script.src = 'http://127.0.0.1:5173/static/school-chat-widget.js?schoolCode=' + encodeURIComponent('${schoolCode}');
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
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "AIzaSyD2u1YsYP5eWNhzREAHc3hsnLtvD0ImVKI");
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      // Improved prompt: ask Gemini to start directly with the school name and info, and include all available fields
      const prompt = `Format the following school context as a knowledge base for display to users.\n\n- Start directly with the school name and its information, do not include any introduction or summary line.\n- Present all available information and fields from the database.\n- Use clear sections, bullet points, and emojis where appropriate.\n- Do not use tables.\n\nSchool Context:\n${JSON.stringify(school, null, 2)}`;
      const chat = model.startChat({
        history: [
          { role: "user", parts: [{ text: prompt }] },
        ],
        generationConfig: { maxOutputTokens: 2048 },
      });
      const result = await chat.sendMessage("Format the knowledge base for display.");
      let formatted = result.response.text();
      // Remove any generic intro lines (e.g., lines before the first heading or bullet point)
      formatted = formatted.replace(/^[\s\S]*?(?=^#|^\*|^\d+\.|^\-|^\u2022|^\u25CF|^\u25A0|^\u25B6|^\u25C6|^\u25CB|^\u25A1|^\u25B2|^\u25BC|^\u25C7|^\u25C8|^\u25C9|^\u25CA|^\u25CC|^\u25CD|^\u25CE|^\u25CF|^\u25D0|^\u25D1|^\u25D2|^\u25D3|^\u25D4|^\u25D5|^\u25D6|^\u25D7|^\u25D8|^\u25D9|^\u25DA|^\u25DB|^\u25DC|^\u25DD|^\u25DE|^\u25DF|^\u25E0|^\u25E1|^\u25E2|^\u25E3|^\u25E4|^\u25E5|^\u25E6|^\u25E7|^\u25E8|^\u25E9|^\u25EA|^\u25EB|^\u25EC|^\u25ED|^\u25EE|^\u25EF|^\u25F0|^\u25F1|^\u25F2|^\u25F3|^\u25F4|^\u25F5|^\u25F6|^\u25F7|^\u25F8|^\u25F9|^\u25FA|^\u25FB|^\u25FC|^\u25FD|^\u25FE|^\u25FF|^\u2605|^\u2606|^\u2607|^\u2608|^\u2609|^\u260A|^\u260B|^\u260C|^\u260D|^\u260E|^\u260F|^\u2610|^\u2611|^\u2612|^\u2613|^\u2614|^\u2615|^\u2616|^\u2617|^\u2618|^\u2619|^\u261A|^\u261B|^\u261C|^\u261D|^\u261E|^\u261F|^\u2620|^\u2621|^\u2622|^\u2623|^\u2624|^\u2625|^\u2626|^\u2627|^\u2628|^\u2629|^\u262A|^\u262B|^\u262C|^\u262D|^\u262E|^\u262F|^\u2630|^\u2631|^\u2632|^\u2633|^\u2634|^\u2635|^\u2636|^\u2637|^\u2638|^\u2639|^\u263A|^\u263B|^\u263C|^\u263D|^\u263E|^\u263F|^\u2640|^\u2641|^\u2642|^\u2643|^\u2644|^\u2645|^\u2646|^\u2647|^\u2648|^\u2649|^\u264A|^\u264B|^\u264C|^\u264D|^\u264E|^\u264F|^\u2650|^\u2651|^\u2652|^\u2653|^\u2654|^\u2655|^\u2656|^\u2657|^\u2658|^\u2659|^\u265A|^\u265B|^\u265C|^\u265D|^\u265E|^\u265F|^\u2660|^\u2661|^\u2662|^\u2663|^\u2664|^\u2665|^\u2666|^\u2667|^\u2668|^\u2669|^\u266A|^\u266B|^\u266C|^\u266D|^\u266E|^\u266F|^\u2670|^\u2671|^\u2672|^\u2673|^\u2674|^\u2675|^\u2676|^\u2677|^\u2678|^\u2679|^\u267A|^\u267B|^\u267C|^\u267D|^\u267E|^\u267F|^\u2680|^\u2681|^\u2682|^\u2683|^\u2684|^\u2685|^\u2686|^\u2687|^\u2688|^\u2689|^\u268A|^\u268B|^\u268C|^\u268D|^\u268E|^\u268F|^\u2690|^\u2691|^\u2692|^\u2693|^\u2694|^\u2695|^\u2696|^\u2697|^\u2698|^\u2699|^\u269A|^\u269B|^\u269C|^\u269D|^\u269E|^\u269F|^\u26A0|^\u26A1|^\u26A2|^\u26A3|^\u26A4|^\u26A5|^\u26A6|^\u26A7|^\u26A8|^\u26A9|^\u26AA|^\u26AB|^\u26AC|^\u26AD|^\u26AE|^\u26AF|^\u26B0|^\u26B1|^\u26B2|^\u26B3|^\u26B4|^\u26B5|^\u26B6|^\u26B7|^\u26B8|^\u26B9|^\u26BA|^\u26BB|^\u26BC|^\u26BD|^\u26BE|^\u26BF|^\u26C0|^\u26C1|^\u26C2|^\u26C3|^\u26C4|^\u26C5|^\u26C6|^\u26C7|^\u26C8|^\u26C9|^\u26CA|^\u26CB|^\u26CC|^\u26CD|^\u26CE|^\u26CF|^\u26D0|^\u26D1|^\u26D2|^\u26D3|^\u26D4|^\u26D5|^\u26D6|^\u26D7|^\u26D8|^\u26D9|^\u26DA|^\u26DB|^\u26DC|^\u26DD|^\u26DE|^\u26DF|^\u26E0|^\u26E1|^\u26E2|^\u26E3|^\u26E4|^\u26E5|^\u26E6|^\u26E7|^\u26E8|^\u26E9|^\u26EA|^\u26EB|^\u26EC|^\u26ED|^\u26EE|^\u26EF|^\u26F0|^\u26F1|^\u26F2|^\u26F3|^\u26F4|^\u26F5|^\u26F6|^\u26F7|^\u26F8|^\u26F9|^\u26FA|^\u26FB|^\u26FC|^\u26FD|^\u26FE|^\u26FF|^\u2702|^\u2705|^\u2708|^\u2709|^\u270A|^\u270B|^\u270C|^\u270D|^\u270F|^\u2712|^\u2714|^\u2716|^\u2721|^\u2728|^\u2733|^\u2734|^\u2744|^\u2747|^\u274C|^\u274E|^\u2753|^\u2754|^\u2755|^\u2757|^\u2764|^\u2795|^\u2796|^\u2797|^\u27A1|^\u27B0|^\u27BF|^\u2934|^\u2935|^\u2B05|^\u2B06|^\u2B07|^\u2B1B|^\u2B1C|^\u2B50|^\u2B55|^\u3030|^\u303D|^\u3297|^\u3299|^\uD83C[\uDF00-\uDFFF]|^\uD83D[\uDC00-\uDE4F]|^\uD83D[\uDE80-\uDEFF]|^\uD83E[\uDD00-\uDDFF])/m, "");
      const html = marked(formatted);
      res.json({ formatted: html });
    } catch (err) {
      console.error("Error formatting knowledge base:", err);
      res.status(500).json({ error: "Failed to format knowledge base" });
    }
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

  const httpServer = createServer(app);
  return httpServer;
}
