import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const updated = (await db
    .update(schema.categories)
    .set({
      name: body.name,
      type: body.type,
      color: body.color,
      icon: body.icon,
    })
    .where(eq(schema.categories.id, Number(id)))
    .returning())[0];
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await db.delete(schema.categories).where(eq(schema.categories.id, Number(id)));
  return NextResponse.json({ ok: true });
}