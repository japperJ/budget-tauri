import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const updated = (await db
    .update(schema.budgets)
    .set({
      amount: body.amount !== undefined ? Math.abs(Number(body.amount)) : undefined,
      period: body.period,
      month: body.month,
      categoryId: body.categoryId !== undefined ? Number(body.categoryId) : undefined,
    })
    .where(eq(schema.budgets.id, Number(id)))
    .returning())[0];
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await db.delete(schema.budgets).where(eq(schema.budgets.id, Number(id)));
  return NextResponse.json({ ok: true });
}