import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { db, schema } from "@/db";
import { suggestCategoryId } from "@/lib/categorize";

function norm(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function findHeader(headers: string[], candidates: string[]) {
  for (const h of headers) {
    const n = norm(h);
    for (const c of candidates) {
      if (n.includes(c)) return h;
    }
  }
  return null;
}

function parseDate(raw: string): string | null {
  const v = raw.trim();
  // ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const m = v.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})/);
  if (m) {
    return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  // YYYYMMDD
  if (/^\d{8}$/.test(v)) {
    return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
  }
  const d = new Date(v);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function parseAmount(raw: string): number {
  let s = raw.trim().replace(/\s/g, "");
  // Danish: 1.234,56 -> 1234.56
  if (s.includes(",") && s.includes(".")) {
    // decide which is decimal
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : Math.round(n * 100);
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const accountId = Number(form.get("accountId"));
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });
  if (!accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });

  const text = await file.text();
  const cats = await db.select().from(schema.categories);
  const existingTxs = await db.select().from(schema.transactions);
  const examples = existingTxs.filter((t: any) => t.categoryId).map((t: any) => ({ description: t.description, categoryId: t.categoryId }));
  // Track existing keys for duplicate detection (avoid O(n²) reloads per row).
  const seenKeys = new Set(
    existingTxs.map((e: any) => `${e.accountId}|${e.date}|${e.amount}|${e.type}|${e.description}`)
  );
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter: "", // auto
  });

  if (parsed.errors.length && !parsed.data.length) {
    return NextResponse.json({ error: "parse error", details: parsed.errors }, { status: 400 });
  }

  const headers = parsed.meta.fields ?? [];
  const dateH = findHeader(headers, ["dato", "date", "valør", "valordato", "posting", "bogføringsdato", "bogforingsdato", "rentedato", "valørdato"]);
  const amtH = findHeader(headers, ["beløb", "belob", "amount", "sum"]);
  const debitH = findHeader(headers, ["træk", "debit", "debet", "udbetaling", "ud"]);
  const creditH = findHeader(headers, ["indbetaling", "credit", "kredit", "ind"]);
  const descH = findHeader(headers, ["tekst", "posteringstekst", "beskrivelse", "description", "merchant", "modtager", "afsender", "title", "navn", "reference", "ref", "postering", "kontobevægelse", "kontobevaegelse"]);

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  for (const row of parsed.data) {
    try {
      const date = dateH ? parseDate(row[dateH] ?? "") : null;
      if (!date) { errors.push("missing date: " + JSON.stringify(row)); continue; }

      let amountCents = 0;
      let type: "income" | "expense" = "expense";
      if (amtH) {
        const raw = row[amtH] ?? "";
        const cents = parseAmount(raw);
        if (cents < 0) { type = "expense"; amountCents = Math.abs(cents); }
        else if (cents > 0) { type = "income"; amountCents = cents; }
        else { amountCents = 0; }
      } else if (debitH || creditH) {
        const d = debitH ? parseAmount(row[debitH] ?? "") : 0;
        const c = creditH ? parseAmount(row[creditH] ?? "") : 0;
        if (d > 0) { type = "expense"; amountCents = d; }
        else if (c > 0) { type = "income"; amountCents = c; }
      }
      if (amountCents === 0) { /* still import zero? skip */ }

      const description = descH ? String(row[descH] ?? "").trim() : "";
      const suggested = suggestCategoryId(description, cats as any, examples);

      // duplicate check: same account, date, amount, type, description
      const key = `${accountId}|${date}|${amountCents}|${type}|${description}`;
      if (seenKeys.has(key)) { skipped++; continue; }

      try {
        await db.insert(schema.transactions).values({
          accountId,
          date,
          amount: amountCents,
          type,
          description,
          categoryId: suggested,
        });
        seenKeys.add(key);
        imported++;
      } catch (e: any) {
        if (String(e?.message || "").toLowerCase().includes("unique")) {
          skipped++;
          continue;
        }
        throw e;
      }
    } catch (e: any) {
      errors.push(e?.message ?? String(e));
    }
  }

  return NextResponse.json({ imported, skipped, errors: errors.slice(0, 20), total: parsed.data.length });
}