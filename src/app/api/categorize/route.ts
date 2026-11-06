import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { suggestCategoryId } from "@/lib/categorize";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const force = body?.force === true;
  const txs = await db.select().from(schema.transactions);
  const cats = await db.select().from(schema.categories);
  const examples = txs.filter((t: any) => t.categoryId).map((t: any) => ({ description: t.description, categoryId: t.categoryId }));
  let updated = 0;
  for (const t of txs) {
    if (!force && t.categoryId) continue;
    const suggested = suggestCategoryId(t.description, cats as any, examples);
    if (suggested && suggested !== t.categoryId) {
      await db.update(schema.transactions).set({ categoryId: suggested }).where(eq(schema.transactions.id, t.id));
      updated++;
    }
  }
  // need eq import
  return NextResponse.json({ updated, total: txs.length });
}