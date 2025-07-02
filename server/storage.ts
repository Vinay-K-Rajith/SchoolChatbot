import { users, chatSessions, chatMessages, type User, type InsertUser, type ChatSession, type ChatMessage, type InsertChatSession, type InsertChatMessage } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(sessionId: string): Promise<ChatMessage[]>;
  getAllChatSessions(): ChatSession[];
  getAllChatMessages(): ChatMessage[];
  getAllChatSessionsBySchool(schoolCode: string): ChatSession[];
  getAllChatMessagesBySchool(schoolCode: string): ChatMessage[];
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private chatSessions: Map<string, ChatSession>;
  private chatMessages: Map<string, ChatMessage[]>;
  private currentUserId: number;
  private currentMessageId: number;

  constructor() {
    this.users = new Map();
    this.chatSessions = new Map();
    this.chatMessages = new Map();
    this.currentUserId = 1;
    this.currentMessageId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const session: ChatSession = {
      id: Date.now(),
      sessionId: insertSession.sessionId,
      schoolCode: insertSession.schoolCode,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.chatSessions.set(session.sessionId, session);
    this.chatMessages.set(session.sessionId, []);
    return session;
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const session = this.chatSessions.get(insertMessage.sessionId);
    const schoolCode = insertMessage.schoolCode || (session ? session.schoolCode : "");
    const message: ChatMessage = {
      id: this.currentMessageId++,
      sessionId: insertMessage.sessionId,
      schoolCode,
      content: insertMessage.content,
      isUser: insertMessage.isUser,
      timestamp: new Date(),
      metadata: insertMessage.metadata || null,
    };
    const sessionMessages = this.chatMessages.get(insertMessage.sessionId) || [];
    sessionMessages.push(message);
    this.chatMessages.set(insertMessage.sessionId, sessionMessages);
    return message;
  }

  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    return this.chatMessages.get(sessionId) || [];
  }

  getAllChatSessions(): ChatSession[] {
    return Array.from(this.chatSessions.values());
  }

  getAllChatMessages(): ChatMessage[] {
    return Array.from(this.chatMessages.values()).flat();
  }

  getAllChatSessionsBySchool(schoolCode: string): ChatSession[] {
    return Array.from(this.chatSessions.values()).filter(s => s.schoolCode === schoolCode);
  }

  getAllChatMessagesBySchool(schoolCode: string): ChatMessage[] {
    return Array.from(this.chatMessages.values()).flat().filter(m => m.schoolCode === schoolCode);
  }
}

export const storage = new MemStorage();
