import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid, unique, primaryKey, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  schoolId: uuid("school_id").references(() => schools.id),
});

export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  schoolCode: text("school_code").notNull(),
  schoolId: uuid("school_id").references(() => schools.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  schoolCode: text("school_code").notNull(),
  schoolId: uuid("school_id").references(() => schools.id),
  content: text("content").notNull(),
  isUser: boolean("is_user").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  metadata: jsonb("metadata"),
});

export const schoolStatusEnum = pgEnum('school_status', ['active', 'inactive', 'suspended']);
export const subscriptionTierEnum = pgEnum('subscription_tier', ['basic', 'premium', 'enterprise']);
export const adminRoleEnum = pgEnum('admin_role', ['super_admin', 'admin', 'moderator']);

export const schools = pgTable("schools", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  domain: text("domain").unique(),
  apiKey: text("api_key").unique().notNull(),
  apiSecret: text("api_secret").notNull(),
  status: schoolStatusEnum("status").default('active'),
  subscriptionTier: subscriptionTierEnum("subscription_tier").default('basic'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const schoolAdmins = pgTable("school_admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: 'cascade' }),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }),
  role: adminRoleEnum("role").default('admin'),
  permissions: jsonb("permissions"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatWidgets = pgTable("chat_widgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: 'cascade' }),
  widgetKey: text("widget_key").unique().notNull(),
  name: text("name").notNull(),
  themeSettings: jsonb("theme_settings"),
  positionSettings: jsonb("position_settings"),
  behaviorSettings: jsonb("behavior_settings"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).pick({
  sessionId: true,
  schoolCode: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  sessionId: true,
  schoolCode: true,
  content: true,
  isUser: true,
  metadata: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type ChatSession = typeof chatSessions.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
