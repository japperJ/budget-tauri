import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(schema.accounts);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const inserted = (await db
    .insert(schema.accounts)
    .values({ name, type: body.type ?? "checking", currency: body.currency ?? "DKK" })
    .returning())[0];
  return NextResponse.json(inserted, { status: 201 });
}