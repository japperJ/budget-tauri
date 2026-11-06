import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";

export async function GET() {
  const rows = await db.select().from(schema.categories);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const inserted = (await db
    .insert(schema.categories)
    .values({
      name,
      type: body.type ?? "expense",
      color: body.color ?? "#6366f1",
      icon: body.icon ?? "tag",
    })
    .returning())[0];
  return NextResponse.json(inserted, { status: 201 });
}