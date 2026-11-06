"use client";
import { useEffect, useState } from "react";
import { UploadCloud, FileText } from "lucide-react";

type Acc = { id: number; name: string };

export default function ImportPage() {
  const [accs, setAccs] = useState<Acc[]>([]);
  const [accountId, setAccountId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((a) => {
      setAccs(a);
      if (a.length) setAccountId(String(a[0].id));
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("accountId", accountId);
    const res = await fetch("/api/import", { method: "POST", body: form });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Import CSV</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Importer banktransaktioner fra en CSV-fil</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Konto
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {accs.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              CSV-fil
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 dark:bg-indigo-950/40 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
                required
              />
              {file && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Valgt: {file.name}</p>}
            </label>

            <button
              type="submit"
              disabled={loading || !file}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              <UploadCloud className="h-4 w-4" />
              {loading ? "Importerer..." : "Importér"}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          {result && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Resultat</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Importeret: <strong className="text-slate-900 dark:text-slate-100">{result.imported}</strong> af {result.total} rækker.
                {result.skipped > 0 && <span className="ml-2 text-amber-600 dark:text-amber-400">({result.skipped} duplikater sprunget over)</span>}
              </p>
              {result.errors?.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-red-600">Fejl ({result.errors.length}):</p>
                  <ul className="mt-1 list-disc pl-5 text-xs text-slate-600 dark:text-slate-300">
                    {result.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <p className="font-medium text-slate-700 dark:text-slate-200">Understøttede formater</p>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
              <li><strong>Danske Bank:</strong> Dato, Tekst, Beløb (signed), Saldo</li>
              <li><strong>Nordea:</strong> Bogføringsdato/Valørdato, Tekst/Posteringstekst, Beløb eller separate Debet/Kredit, Saldo</li>
              <li><strong>Jyske Bank:</strong> Dato, Tekst/Beskrivelse, Beløb (signed), Saldo (Bankdata CSV-format, semikolon-separeret)</li>
              <li>Datoformater: DD-MM-YYYY, DD.MM.YYYY, DD/MM/YYYY</li>
              <li>Talformater: 1.234,56 (dansk) og 1234.56</li>
              <li>Kolonner genkendes automatisk (dato, beløb, beskrivelse, træk/indbetaling, debet/kredit)</li>
            </ul>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Semikolon- eller kommasepareret CSV. UTF-8 understøttes.</p>
          </div>
        </div>
      </div>
    </div>
  );
}