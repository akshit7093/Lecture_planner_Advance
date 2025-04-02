import { pgTable, text, serial, integer, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Learning Pathway schema
export const pathways = pgTable("pathways", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  timespan: text("timespan").notNull(), // daily, weekly, monthly, custom
  customDays: integer("custom_days"), // Only used if timespan is 'custom'
  complexity: text("complexity").notNull(), // beginner, intermediate, advanced
  createdAt: timestamp("created_at").defaultNow(),
});

// Node schema to store the elements in the learning path
export const nodes = pgTable("nodes", {
  id: serial("id").primaryKey(),
  pathwayId: integer("pathway_id").notNull(), // Foreign key to pathway
  nodeId: text("node_id").notNull(), // The ReactFlow node ID
  parentId: text("parent_id"), // Parent node ID (if any)
  title: text("title").notNull(),
  description: text("description"),
  position: json("position").notNull(), // {x: number, y: number}
  nodeType: text("node_type").default("default"), // type of node (default, input, etc.)
  topics: json("topics").$type<string[]>(), // Array of key topics
  questions: json("questions").$type<string[]>(), // Array of previous year questions
  resources: json("resources").$type<{title: string, url: string}[]>(), // Array of resources
  equations: json("equations").$type<string[]>(), // Array of mathematical equations
  codeExamples: json("code_examples").$type<string[]>(), // Array of code examples
  metadata: json("metadata"), // Additional metadata
});

// Edge schema to store connections between nodes
export const edges = pgTable("edges", {
  id: serial("id").primaryKey(),
  pathwayId: integer("pathway_id").notNull(), // Foreign key to pathway
  edgeId: text("edge_id").notNull(), // The ReactFlow edge ID
  source: text("source").notNull(), // Source node ID
  target: text("target").notNull(), // Target node ID
  label: text("label"), // Optional edge label
  animated: integer("animated").default(0), // 0 for false, 1 for true
});

// Insert schemas using drizzle-zod
export const insertPathwaySchema = createInsertSchema(pathways).omit({ 
  id: true,
  createdAt: true  
});

export const insertNodeSchema = createInsertSchema(nodes).omit({ 
  id: true 
});

export const insertEdgeSchema = createInsertSchema(edges).omit({ 
  id: true 
});

// Types for TypeScript
export type Pathway = typeof pathways.$inferSelect;
export type InsertPathway = z.infer<typeof insertPathwaySchema>;

export type Node = typeof nodes.$inferSelect;
export type InsertNode = z.infer<typeof insertNodeSchema>;

export type Edge = typeof edges.$inferSelect;
export type InsertEdge = z.infer<typeof insertEdgeSchema>;

// OpenRouter API types
export const openRouterRequestSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  timespan: z.enum(["daily", "weekly", "monthly", "custom"]),
  customDays: z.number().optional(),
  complexity: z.enum(["beginner", "intermediate", "advanced"]),
});

export type OpenRouterRequest = z.infer<typeof openRouterRequestSchema>;

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
