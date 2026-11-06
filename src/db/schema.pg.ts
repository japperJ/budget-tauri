// PostgreSQL (Neon) variant of the schema for future Vercel deployment.
// To migrate: install @neondatabase/serverless, point db client at DATABASE_URL,
// and swap imports from ./schema to ./schema.pg.
import { pgTable, serial, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("checking"),
  currency: text("currency").notNull().default("DKK"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("expense"),
  color: text("color").notNull().default("#6366f1"),
  icon: text("icon").default("tag"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  amount: integer("amount").notNull(),
  type: text("type").notNull().default("expense"),
  description: text("description").notNull().default(""),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  uniqTx: uniqueIndex("uniq_tx").on(t.accountId, t.date, t.amount, t.type, t.description),
}));

export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  period: text("period").notNull().default("monthly"),
  month: text("month"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});