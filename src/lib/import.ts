import Papa from "papaparse";
import { getAccounts, getCategories, addTransaction, getTransactions } from "./db";
import { suggestCategoryId } from "./categorize";

function norm(s: string) { return s.toLowerCase().replace(/\s+/g, " ").trim(); }
function findHeader(headers: string[], candidates: string[]) {
  for (const h of headers) {
    const n = norm(h);
    for (const c of candidates) if (n.includes(c)) return h;
  }
  return null;
}
function parseDate(raw: string): string | null {
  const v = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const m = v.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  if (/^\d{8}$/.test(v)) return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
  const d = new Date(v);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}
function parseAmount(raw: string): number {
  let s = raw.trim().replace(/\s/g, "");
  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (s.includes(",")) s = s.replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : Math.round(n * 100);
}

export async function importCsv(file: File, accountId: number): Promise<{ imported: number; skipped: number; skippedRows: { date: string; description: string; amount: number }[]; errors: string[]; total: number }> {
  const text = await file.text();
  return importCsvText(text, accountId);
}

export async function importCsvText(text: string, accountId: number): Promise<{ imported: number; skipped: number; skippedRows: { date: string; description: string; amount: number }[]; errors: string[]; total: number }> {
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  const headers = parsed.meta.fields ?? [];
  const dateH = findHeader(headers, ["dato", "date", "valør", "valordato", "posting", "bogføringsdato", "bogforingsdato", "rentedato", "valørdato"]);
  const amtH = findHeader(headers, ["beløb", "belob", "amount", "sum"]);
  const debitH = findHeader(headers, ["træk", "debit", "debet", "udbetaling", "ud"]);
  const creditH = findHeader(headers, ["indbetaling", "credit", "kredit", "ind"]);
  const descH = findHeader(headers, ["tekst", "posteringstekst", "beskrivelse", "description", "merchant", "modtager", "afsender", "title", "navn", "reference", "ref", "postering"]);

  const cats = await getCategories();
  const existing = await getTransactions({ accountId: String(accountId) });
  const balanceH = findHeader(headers, ["saldo", "balance", "delsaldo"]);
  const catH = findHeader(headers, ["hovedkategori", "kategori", "category"]);
  const commentH = findHeader(headers, ["kommentar", "comment", "note"]);

  const seenKeys = new Set<string>();
  for (const e of existing) {
    seenKeys.add(`${accountId}|${e.date}|${e.amount}|${e.type}|${e.description}|`);
  }

  let imported = 0, skipped = 0;
  const skippedRows: { date: string; description: string; amount: number }[] = [];
  const errors: string[] = [];

  for (const row of parsed.data) {
    try {
      const date = dateH ? parseDate(row[dateH] ?? "") : null;
      if (!date) { errors.push("missing date"); continue; }

      let amountCents = 0;
      let type: "income" | "expense" = "expense";
      if (amtH) {
        const cents = parseAmount(row[amtH] ?? "");
        if (cents < 0) { type = "expense"; amountCents = Math.abs(cents); }
        else if (cents > 0) { type = "income"; amountCents = cents; }
      } else if (debitH || creditH) {
        const d = debitH ? parseAmount(row[debitH] ?? "") : 0;
        const c = creditH ? parseAmount(row[creditH] ?? "") : 0;
        if (d > 0) { type = "expense"; amountCents = d; }
        else if (c > 0) { type = "income"; amountCents = c; }
      }

      let description = descH ? String(row[descH] ?? "").trim() : "";
      if (commentH) {
        const cmt = String(row[commentH] ?? "").trim();
        if (cmt) description = description ? `${description} (${cmt})` : cmt;
      }

      const balancePart = balanceH ? String(row[balanceH] ?? "").trim() : "";
      const key = `${accountId}|${date}|${amountCents}|${type}|${description}|${balancePart}`;
      const keyNoBalance = `${accountId}|${date}|${amountCents}|${type}|${description}|`;
      if (seenKeys.has(key) || seenKeys.has(keyNoBalance)) {
        skipped++;
        skippedRows.push({ date, description, amount: amountCents });
        continue;
      }

      let suggested = suggestCategoryId(description, cats as any, existing.map((t: any) => ({ description: t.description, categoryId: t.category_id })));
      if (catH) {
        const catName = String(row[catH] ?? "").trim().toLowerCase();
        if (catName) {
          const matched = (cats as any[]).find((c: any) => c.name.toLowerCase() === catName || c.name.toLowerCase().includes(catName));
          if (matched) suggested = matched.id;
        }
      }

      await addTransaction({ accountId, date, amount: amountCents, type, description, categoryId: suggested });
      seenKeys.add(key);
      seenKeys.add(keyNoBalance);
      imported++;
    } catch (e: any) {
      errors.push(e?.message ?? String(e));
    }
  }

  return { imported, skipped, skippedRows, errors: errors.slice(0, 20), total: parsed.data.length };
}