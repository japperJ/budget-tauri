import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const accountId = url.searchParams.get("accountId");

  let txs = await db.select().from(schema.transactions);
  if (accountId) txs = txs.filter((t: any) => t.accountId === Number(accountId));

  let budgetsAll = await db.select().from(schema.budgets);
  if (accountId) {
    const aid = Number(accountId);
    // prefer account-specific, fallback to global
    const specific = budgetsAll.filter((b: any) => b.accountId === aid);
    const global = budgetsAll.filter((b: any) => b.accountId === null);
    const specificCats = new Set(specific.map((b: any) => b.categoryId));
    budgetsAll = [...specific, ...global.filter((b: any) => !specificCats.has(b.categoryId))];
  }
  const cats = await db.select().from(schema.categories);
  const monthTxs = txs.filter((t: any) => t.date.startsWith(month));
  const income = monthTxs.filter((t: any) => t.type === "income").reduce((s: any, t: any) => s + t.amount, 0);
  const expense = monthTxs.filter((t: any) => t.type === "expense").reduce((s: any, t: any) => s + t.amount, 0);

  // by category spending (expenses)
  const spentByCat = new Map<number, number>();
  for (const t of monthTxs) {
    if (t.type === "expense" && t.categoryId) {
      spentByCat.set(t.categoryId, (spentByCat.get(t.categoryId) ?? 0) + t.amount);
    }
  }
  const byCategory = cats
    .filter((c: any) => c.type === "expense")
    .map((c: any) => {
      const spent = spentByCat.get(c.id) ?? 0;
      const bud = budgetsAll.find((b: any) => b.categoryId === c.id && (b.month === month || b.month === null));
      return {
        categoryId: c.id,
        name: c.name,
        color: c.color,
        spent,
        budget: bud ? bud.amount : null,
      };
    })
    .sort((a: any, b: any) => b.spent - a.spent);

  // cashflow last 12 months
  const months: string[] = [];
  const now = new Date(month + "-01");
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const cashflow = months.map((m: string) => {
    const mt = txs.filter((t: any) => t.date.startsWith(m));
    return {
      month: m,
      income: mt.filter((t: any) => t.type === "income").reduce((s: any, t: any) => s + t.amount, 0),
      expense: mt.filter((t: any) => t.type === "expense").reduce((s: any, t: any) => s + t.amount, 0),
    };
  });

  const income12 = cashflow.reduce((s, c) => s + c.income, 0);
  const expense12 = cashflow.reduce((s, c) => s + c.expense, 0);

  // uncategorized count
  const uncategorized = monthTxs.filter((t: any) => !t.categoryId).length;

  // spending by category over 12 months
  const spentByCat12 = new Map<number, number>();
  for (const t of txs) {
    if (t.type === "expense" && t.categoryId && t.date >= months[0]) {
      spentByCat12.set(t.categoryId, (spentByCat12.get(t.categoryId) ?? 0) + t.amount);
    }
  }
  const byCategory12 = cats
    .filter((c: any) => c.type === "expense")
    .map((c: any) => ({
      categoryId: c.id,
      name: c.name,
      color: c.color,
      spent: spentByCat12.get(c.id) ?? 0,
    }))
    .filter((c: any) => c.spent > 0)
    .sort((a: any, b: any) => b.spent - a.spent);

  // top expenses by description (merchant)
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

  return NextResponse.json({
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
    uncategorized,
    transactionCount: monthTxs.length,
    topMerchants,
  });
}