import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull().default("checking"), // checking | savings | credit
  currency: text("currency").notNull().default("DKK"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull().default("expense"), // income | expense
  color: text("color").notNull().default("#6366f1"),
  icon: text("icon").default("tag"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // ISO date YYYY-MM-DD
  amount: integer("amount").notNull(), // cents, signed? store absolute with type
  type: text("type").notNull().default("expense"), // income | expense
  description: text("description").notNull().default(""),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  uniqTx: uniqueIndex("uniq_tx").on(t.accountId, t.date, t.amount, t.type, t.description),
}));

export const budgets = sqliteTable("budgets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }), // null = all accounts
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(), // cents monthly limit
  period: text("period").notNull().default("monthly"), // monthly | yearly
  month: text("month"), // YYYY-MM for monthly; null for recurring template
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});