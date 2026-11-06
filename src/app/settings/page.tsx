"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, Wallet, Tag } from "lucide-react";

type Acc = { id: number; name: string; type: string; currency: string };
type Cat = { id: number; name: string; type: string; color: string; icon: string | null };

export default function SettingsPage() {
  const [accs, setAccs] = useState<Acc[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [newAcc, setNewAcc] = useState("");
  const [newCat, setNewCat] = useState("");
  const [newCatType, setNewCatType] = useState<"income" | "expense">("expense");
  const [newCatColor, setNewCatColor] = useState("#6366f1");

  const load = async () => {
    try {
      const [aRes, cRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/categories"),
      ]);
      const a = await aRes.json();
      const c = await cRes.json();
      if (Array.isArray(a)) setAccs(a);
      if (Array.isArray(c)) setCats(c);
    } catch (e) {
      console.error("load failed:", e);
    }
  };
  useEffect(() => { load(); }, []);

  const addAcc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAcc.trim()) return;
    await fetch("/api/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newAcc }) });
    setNewAcc("");
    load();
  };
  const delAcc = async (id: number) => {
    if (!confirm("Slet konto? Transaktioner slettes også.")) return;
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    load();
  };

  const addCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCat, type: newCatType, color: newCatColor }) });
    setNewCat("");
    load();
  };
  const delCat = async (id: number) => {
    if (!confirm("Slet kategori?")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Indstillinger</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Administrer konti og kategorier</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Konti</h2>
          </div>
          <form onSubmit={addAcc} className="mb-4 flex gap-2">
            <input
              value={newAcc}
              onChange={(e) => setNewAcc(e.target.value)}
              placeholder="Ny konto"
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> Tilføj
            </button>
          </form>
          <ul className="divide-y divide-slate-100">
            {accs.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3 text-sm">
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {a.name} <span className="font-normal text-slate-400">({a.type}, {a.currency})</span>
                </span>
                <button
                  onClick={() => delAcc(a.id)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 dark:hover:bg-red-950/40 dark:bg-red-950/40 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
            {accs.length === 0 && <li className="py-3 text-slate-500 dark:text-slate-400">Ingen konti.</li>}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Tag className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Kategorier</h2>
          </div>
          <form onSubmit={addCat} className="mb-4 flex flex-wrap gap-2">
            <input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              placeholder="Ny kategori"
              className="min-w-[140px] flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <select
              value={newCatType}
              onChange={(e) => setNewCatType(e.target.value as "income" | "expense")}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="expense">Udgift</option>
              <option value="income">Indtægt</option>
            </select>
            <input
              type="color"
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
              className="h-10 w-12 cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800"
            />
            <button className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> Tilføj
            </button>
          </form>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {cats.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 transition hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ background: c.color }} />
                  <span className="font-medium text-slate-800 dark:text-slate-100">{c.name}</span>
                  <span className="text-xs text-slate-400">({c.type})</span>
                </span>
                <button
                  onClick={() => delCat(c.id)}
                  className="rounded-lg p-1 text-slate-400 transition hover:bg-red-50 dark:hover:bg-red-950/40 dark:bg-red-950/40 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}