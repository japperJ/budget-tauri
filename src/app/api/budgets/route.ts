import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const month = url.searchParams.get("month");
  const accountId = url.searchParams.get("accountId");
  let rows = await db.select().from(schema.budgets);
  if (month) {
    rows = rows.filter((b: any) => b.month === month || b.month === null);
  }
  if (accountId) {
    const aid = Number(accountId);
    rows = rows.filter((b: any) => b.accountId === aid || b.accountId === null);
  }
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const categoryId = Number(body.categoryId);
  const amount = Number(body.amount);
  if (!categoryId || isNaN(amount)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const inserted = (await db
    .insert(schema.budgets)
    .values({
      accountId: body.accountId ? Number(body.accountId) : null,
      categoryId,
      amount: Math.abs(amount),
      period: body.period ?? "monthly",
      month: body.month ?? null,
    })
    .returning())[0];
  return NextResponse.json(inserted, { status: 201 });
}