// Tauri SQLite data layer (replaces Next.js API routes)
import Database from "@tauri-apps/plugin-sql";

let dbPromise: Promise<Database> | null = null;

export function getDb() {
  if (!dbPromise) dbPromise = Database.load("sqlite:budget.db");
  return dbPromise;
}

export async function initDb() {
  const db = await getDb();
  // schema is created by the Rust side / migrations; ensure tables exist
  await db.execute(`CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'checking',
    currency TEXT NOT NULL DEFAULT 'DKK',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'expense',
    color TEXT NOT NULL DEFAULT '#6366f1',
    icon TEXT DEFAULT 'tag',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT 'expense',
    description TEXT NOT NULL DEFAULT '',
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    period TEXT NOT NULL DEFAULT 'monthly',
    month TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS uniq_tx ON transactions (account_id, date, amount, type, description)`);
}

// ---- Accounts ----
export async function getAccounts() {
  const db = await getDb();
  return db.select<any[]>("SELECT * FROM accounts ORDER BY id", []);
}

export async function addAccount(name: string, type = "checking", currency = "DKK") {
  const db = await getDb();
  await db.execute("INSERT INTO accounts (name, type, currency) VALUES ($1, $2, $3)", [name, type, currency]);
  const rows = await db.select<any[]>("SELECT * FROM accounts ORDER BY id DESC LIMIT 1", []);
  return rows[0];
}

export async function deleteAccount(id: number) {
  const db = await getDb();
  await db.execute("DELETE FROM accounts WHERE id = $1", [id]);
}

// ---- Categories ----
export async function getCategories() {
  const db = await getDb();
  return db.select<any[]>("SELECT * FROM categories ORDER BY id", []);
}

export async function addCategory(name: string, type = "expense", color = "#6366f1", icon = "tag") {
  const db = await getDb();
  await db.execute("INSERT INTO categories (name, type, color, icon) VALUES ($1, $2, $3, $4)", [name, type, color, icon]);
  const rows = await db.select<any[]>("SELECT * FROM categories ORDER BY id DESC LIMIT 1", []);
  return rows[0];
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  await db.execute("DELETE FROM categories WHERE id = $1", [id]);
}

// ---- Transactions ----
export interface Tx {
  id: number;
  account_id: number;
  date: string;
  amount: number;
  type: "income" | "expense";
  description: string;
  category_id: number | null;
}

export async function getTransactions(filters: { month?: string; type?: string; categoryId?: string; accountId?: string; search?: string } = {}) {
  const db = await getDb();
  let sql = "SELECT * FROM transactions WHERE 1=1";
  const params: any[] = [];
  let i = 1;
  if (filters.month) { sql += ` AND date LIKE $${i++}`; params.push(filters.month + "%"); }
  if (filters.type) { sql += ` AND type = $${i++}`; params.push(filters.type); }
  if (filters.categoryId) { sql += ` AND category_id = $${i++}`; params.push(Number(filters.categoryId)); }
  if (filters.accountId) { sql += ` AND account_id = $${i++}`; params.push(Number(filters.accountId)); }
  if (filters.search) { sql += ` AND description LIKE $${i++}`; params.push("%" + filters.search + "%"); }
  sql += " ORDER BY date DESC, id DESC";
  const rows = await db.select<any[]>(sql, params);
  return rows.map((r: any) => ({
    id: r.id,
    accountId: r.account_id,
    date: r.date,
    amount: r.amount,
    type: r.type,
    description: r.description,
    categoryId: r.category_id,
  }));
}

export async function addTransaction(t: { accountId: number; date: string; amount: number; type: string; description: string; categoryId: number | null }) {
  const db = await getDb();
  await db.execute(
    "INSERT INTO transactions (account_id, date, amount, type, description, category_id) VALUES ($1, $2, $3, $4, $5, $6)",
    [t.accountId, t.date, Math.abs(t.amount), t.type, t.description, t.categoryId]
  );
}

export async function updateTransaction(id: number, patch: any) {
  const db = await getDb();
  const sets: string[] = [];
  const params: any[] = [];
  let i = 1;
  if (patch.accountId !== undefined) { sets.push(`account_id = $${i++}`); params.push(Number(patch.accountId)); }
  if (patch.date !== undefined) { sets.push(`date = $${i++}`); params.push(patch.date); }
  if (patch.amount !== undefined) { sets.push(`amount = $${i++}`); params.push(Math.abs(Number(patch.amount))); }
  if (patch.type !== undefined) { sets.push(`type = $${i++}`); params.push(patch.type); }
  if (patch.description !== undefined) { sets.push(`description = $${i++}`); params.push(patch.description); }
  if (patch.categoryId !== undefined) { sets.push(`category_id = $${i++}`); params.push(patch.categoryId === null ? null : Number(patch.categoryId)); }
  if (!sets.length) return;
  params.push(id);
  await db.execute(`UPDATE transactions SET ${sets.join(", ")} WHERE id = $${i}`, params);
}

export async function deleteTransaction(id: number) {
  const db = await getDb();
  await db.execute("DELETE FROM transactions WHERE id = $1", [id]);
}

export async function deleteTransactions(ids: number[]) {
  const db = await getDb();
  if (!ids.length) return;
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
  await db.execute(`DELETE FROM transactions WHERE id IN (${placeholders})`, ids);
}

export async function updateTransactionsCategory(ids: number[], categoryId: number | null) {
  const db = await getDb();
  if (!ids.length) return;
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
  await db.execute(`UPDATE transactions SET category_id = $${ids.length + 1} WHERE id IN (${placeholders})`, [...ids, categoryId]);
}

// ---- Budgets ----
export async function getBudgets(accountId?: string) {
  const db = await getDb();
  let sql = "SELECT * FROM budgets WHERE 1=1";
  const params: any[] = [];
  if (accountId) { sql += " AND (account_id = $1 OR account_id IS NULL)"; params.push(Number(accountId)); }
  const rows = await db.select<any[]>(sql, params);
  return rows.map((r: any) => ({
    id: r.id,
    accountId: r.account_id,
    categoryId: r.category_id,
    amount: r.amount,
    period: r.period,
    month: r.month,
  }));
}

export async function addBudget(categoryId: number, amount: number, period = "monthly", month: string | null = null, accountId: number | null = null) {
  const db = await getDb();
  await db.execute("INSERT INTO budgets (account_id, category_id, amount, period, month) VALUES ($1, $2, $3, $4, $5)", [accountId, categoryId, Math.abs(amount), period, month]);
}

export async function updateBudget(id: number, patch: any) {
  const db = await getDb();
  const sets: string[] = [];
  const params: any[] = [];
  let i = 1;
  if (patch.amount !== undefined) { sets.push(`amount = $${i++}`); params.push(Math.abs(Number(patch.amount))); }
  if (patch.period !== undefined) { sets.push(`period = $${i++}`); params.push(patch.period); }
  if (patch.month !== undefined) { sets.push(`month = $${i++}`); params.push(patch.month); }
  if (patch.categoryId !== undefined) { sets.push(`category_id = $${i++}`); params.push(Number(patch.categoryId)); }
  if (!sets.length) return;
  params.push(id);
  await db.execute(`UPDATE budgets SET ${sets.join(", ")} WHERE id = $${i}`, params);
}

export async function deleteBudget(id: number) {
  const db = await getDb();
  await db.execute("DELETE FROM budgets WHERE id = $1", [id]);
}

// ---- Seed ----
// ---- Summary (dashboard) ----
export async function computeSummary(month: string, accountId?: string) {
  const db = await getDb();
  let txs = await db.select<any[]>("SELECT * FROM transactions", []);
  if (accountId) txs = txs.filter((t: any) => t.account_id === Number(accountId));
  const cats = await db.select<any[]>("SELECT * FROM categories", []);
  let budgets = await db.select<any[]>("SELECT * FROM budgets", []);
  if (accountId) {
    const aid = Number(accountId);
    const specific = budgets.filter((b: any) => b.account_id === aid);
    const global = budgets.filter((b: any) => b.account_id === null);
    const specificCats = new Set(specific.map((b: any) => b.category_id));
    budgets = [...specific, ...global.filter((b: any) => !specificCats.has(b.category_id))];
  }
  const catMap = new Map(cats.map((c: any) => [c.id, c]));

  const monthTxs = txs.filter((t: any) => String(t.date).startsWith(month));
  const income = monthTxs.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + t.amount, 0);
  const expense = monthTxs.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + t.amount, 0);

  const spentByCat = new Map<number, number>();
  for (const t of monthTxs) {
    if (t.type === "expense" && t.category_id) {
      spentByCat.set(t.category_id, (spentByCat.get(t.category_id) ?? 0) + t.amount);
    }
  }
  const byCategory = cats
    .filter((c: any) => c.type === "expense")
    .map((c: any) => {
      const spent = spentByCat.get(c.id) ?? 0;
      const bud = budgets.find((b: any) => b.category_id === c.id && (b.month === month || b.month === null));
      return { categoryId: c.id, name: c.name, color: c.color, spent, budget: bud ? bud.amount : null };
    })
    .sort((a: any, b: any) => b.spent - a.spent);

  const months: string[] = [];
  const now = new Date(month + "-01");
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const cashflow = months.map((m) => {
    const mt = txs.filter((t: any) => String(t.date).startsWith(m));
    return {
      month: m,
      income: mt.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + t.amount, 0),
      expense: mt.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + t.amount, 0),
    };
  });

  const income12 = cashflow.reduce((s, c) => s + c.income, 0);
  const expense12 = cashflow.reduce((s, c) => s + c.expense, 0);

  const spentByCat12 = new Map<number, number>();
  for (const t of txs) {
    if (t.type === "expense" && t.category_id && t.date >= months[0]) {
      spentByCat12.set(t.category_id, (spentByCat12.get(t.category_id) ?? 0) + t.amount);
    }
  }
  const byCategory12 = cats
    .filter((c: any) => c.type === "expense")
    .map((c: any) => ({ categoryId: c.id, name: c.name, color: c.color, spent: spentByCat12.get(c.id) ?? 0 }))
    .filter((c: any) => c.spent > 0)
    .sort((a: any, b: any) => b.spent - a.spent);

  const byDesc = new Map<string, number>();
  for (const t of monthTxs) {
    if (t.type === "expense") {
      const key = (t.description || "Ukendt").trim();
      byDesc.set(key, (byDesc.get(key) ?? 0) + t.amount);
    }
  }
  const topMerchants = [...byDesc.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, amount]) => ({ name, amount }));

  return {
    month,
    income,
    expense,
    net: income - expense,
    income12,
    expense12,
    net12: income12 - expense12,
    byCategory,
    byCategory12,
    cashflow,
    uncategorized: monthTxs.filter((t: any) => !t.category_id).length,
    transactionCount: monthTxs.length,
    topMerchants,
  };
}

export async function seedDefaults() {
  const db = await getDb();
  const cats = await db.select<any[]>("SELECT COUNT(*) as c FROM categories", []);
  if ((cats[0]?.c ?? 0) === 0) {
    const defaults = [
      ["Løn", "income", "#22c55e", "banknote"],
      ["Andre indtægter", "income", "#10b981", "plus"],
      ["Bolig", "expense", "#ef4444", "home"],
      ["Mad & dagligvarer", "expense", "#f97316", "shopping-cart"],
      ["Transport", "expense", "#eab308", "car"],
      ["Forsyning", "expense", "#3b82f6", "zap"],
      ["Forsikring", "expense", "#8b5cf6", "shield"],
      ["Underholdning", "expense", "#a855f7", "film"],
      ["Sundhed", "expense", "#ec4899", "heart"],
      ["Tøj", "expense", "#14b8a6", "shirt"],
      ["Hjem & have", "expense", "#f59e0b", "hammer"],
      ["Opsparing", "expense", "#6366f1", "piggy-bank"],
      ["Andet", "expense", "#6b7280", "more-horizontal"],
    ];
    for (const c of defaults) {
      await db.execute("INSERT INTO categories (name, type, color, icon) VALUES ($1, $2, $3, $4)", c);
    }
  }
  const accs = await db.select<any[]>("SELECT COUNT(*) as c FROM accounts", []);
  if ((accs[0]?.c ?? 0) === 0) {
    await db.execute("INSERT INTO accounts (name, type, currency) VALUES ($1, $2, $3)", ["Hovedkonto", "checking", "DKK"]);
  }
}