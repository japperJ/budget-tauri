import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, inArray } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const ids: number[] = (body.ids || []).map(Number).filter((n: number) => !isNaN(n));
  if (!ids.length) return NextResponse.json({ error: "no ids" }, { status: 400 });

  if (body.action === "delete") {
    await db.delete(schema.transactions).where(inArray(schema.transactions.id, ids));
    return NextResponse.json({ ok: true, affected: ids.length });
  }

  if (body.action === "category") {
    const categoryId = body.categoryId === null ? null : Number(body.categoryId);
    await db
      .update(schema.transactions)
      .set({ categoryId })
      .where(inArray(schema.transactions.id, ids));
    return NextResponse.json({ ok: true, affected: ids.length });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}