import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { suggestCategoryId } from "@/lib/categorize";
// no drizzle operators needed (filtering done in JS)

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const month = url.searchParams.get("month"); // YYYY-MM
  const type = url.searchParams.get("type");
  const categoryId = url.searchParams.get("categoryId");
  const search = url.searchParams.get("search");
  const accountId = url.searchParams.get("accountId");

  let rows = await db.select().from(schema.transactions);

  if (month) {
    rows = rows.filter((t: any) => t.date.startsWith(month));
  }
  if (type) rows = rows.filter((t: any) => t.type === type);
  if (categoryId) rows = rows.filter((t: any) => t.categoryId === Number(categoryId));
  if (accountId) rows = rows.filter((t: any) => t.accountId === Number(accountId));
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter((t: any) => t.description.toLowerCase().includes(q));
  }
  rows.sort((a: any, b: any) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const date = String(body.date ?? "").trim();
  const description = String(body.description ?? "").trim();
  const amount = Number(body.amount); // cents
  const type = body.type === "income" ? "income" : "expense";
  const accountId = Number(body.accountId);
  let categoryId: number | null = body.categoryId ? Number(body.categoryId) : null;
  if (categoryId === null) {
    const cats = await db.select().from(schema.categories);
    const existingTxs = await db.select().from(schema.transactions);
    const examples = existingTxs.filter((t: any) => t.categoryId).map((t: any) => ({ description: t.description, categoryId: t.categoryId }));
    categoryId = suggestCategoryId(description, cats as any, examples);
  }
  if (!date || !accountId || isNaN(amount)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const inserted = (await db
    .insert(schema.transactions)
    .values({ accountId, date, amount: Math.abs(amount), type, description, categoryId })
    .returning())[0];
  return NextResponse.json(inserted, { status: 201 });
}