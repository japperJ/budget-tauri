"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatMoney, formatDate } from "@/lib/format";
import { Plus, Search, Trash2, Filter } from "lucide-react";

type Tx = {
  id: number;
  accountId: number;
  date: string;
  amount: number;
  type: "income" | "expense";
  description: string;
  categoryId: number | null;
};
type Cat = { id: number; name: string; color: string; type: string };
type Acc = { id: number; name: string };

import { Suspense } from "react";

function TransactionsPageInner() {
  const searchParams = useSearchParams();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [accs, setAccs] = useState<Acc[]>([]);
  const [month, setMonth] = useState(searchParams.get("month") ?? "");
  const [type, setType] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [accountId, setAccountId] = useState(searchParams.get("accountId") ?? "");
  const [accounts, setAccounts] = useState<{ id: number; name: string }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "amount" | "description">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkCategory, setBulkCategory] = useState("");

  const load = () => {
    const params = new URLSearchParams();
    if (month) params.set("month", month);
    if (type) params.set("type", type);
    if (categoryId) params.set("categoryId", categoryId);
    if (accountId) params.set("accountId", accountId);
    if (search) params.set("search", search);
    fetch(`/api/transactions?${params}`).then((r) => r.json()).then(setTxs);
  };

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then(setCats);
    fetch("/api/accounts").then((r) => r.json()).then((a) => { setAccs(a); setAccounts(a); });
  }, []);

  useEffect(() => { load(); }, [month, type, categoryId, accountId, search]);

  const catMap = new Map(cats.map((c) => [c.id, c]));

  const sortedTxs = [...txs].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "date") cmp = a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    else if (sortBy === "amount") cmp = a.amount - b.amount;
    else if (sortBy === "description") cmp = (a.description || "").localeCompare(b.description || "", "da");
    return sortDir === "asc" ? cmp : -cmp;
  });

  const toggleSort = (col: "date" | "amount" | "description") => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir(col === "amount" ? "desc" : "desc"); }
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selected.size === sortedTxs.length) setSelected(new Set());
    else setSelected(new Set(sortedTxs.map((t) => t.id)));
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Slet ${selected.size} transaktioner?`)) return;
    await fetch("/api/transactions/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected], action: "delete" }),
    });
    setSelected(new Set());
    load();
  };

  const bulkCategoryChange = async () => {
    if (selected.size === 0) return;
    const cid = (bulkCategory === "" || bulkCategory === "__none__") ? null : Number(bulkCategory);
    await fetch("/api/transactions/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected], action: "category", categoryId: cid }),
    });
    setSelected(new Set());
    setBulkCategory("");
    load();
  };

  const updateCategory = async (id: number, cid: string) => {
    await fetch(`/api/transactions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: cid === "" ? null : Number(cid) }),
    });
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("Slet transaktion?")) return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    load();
  };

  const autoCategorize = async () => {
    const res = await fetch("/api/categorize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const data = await res.json();
    alert(`Kategoriserede ${data.updated} af ${data.total} transaktioner.`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Transaktioner</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{txs.length} transaktioner</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={autoCategorize}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50"
          >
            Auto-kategoriser
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> Tilføj transaktion
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm">
        <Filter className="ml-1 h-4 w-4 text-slate-400" />
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">Alle konti</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">Alle typer</option>
          <option value="income">Indtægt</option>
          <option value="expense">Udgift</option>
        </select>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">Alle kategorier</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Søg beskrivelse..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/40 px-4 py-3 shadow-sm">
          <span className="text-sm font-medium text-indigo-700">{selected.size} valgt</span>
          <div className="flex items-center gap-2">
            <select
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Vælg kategori...</option>
              <option value="__none__">Fjern kategori</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button
              onClick={bulkCategoryChange}
              disabled={!bulkCategory}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              Skift kategori
            </button>
          </div>
          <button
            onClick={bulkDelete}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4" /> Slet valgte
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={sortedTxs.length > 0 && selected.size === sortedTxs.length}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="px-4 py-3 cursor-pointer select-none hover:text-slate-700 dark:text-slate-200" onClick={() => toggleSort("date")}>
                Dato {sortBy === "date" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
              <th className="px-4 py-3 cursor-pointer select-none hover:text-slate-700 dark:text-slate-200" onClick={() => toggleSort("description")}>
                Beskrivelse {sortBy === "description" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3 text-right cursor-pointer select-none hover:text-slate-700 dark:text-slate-200" onClick={() => toggleSort("amount")}>
                Beløb {sortBy === "amount" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedTxs.map((t) => {
              const c = t.categoryId ? catMap.get(t.categoryId) : null;
              return (
                <tr key={t.id} className={`transition hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50/60 ${selected.has(t.id) ? "bg-indigo-50 dark:bg-indigo-950/40/40" : ""}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(t.id)}
                      onChange={() => toggleSelect(t.id)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">{formatDate(t.date)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{t.description || "—"}</td>
                  <td className="px-4 py-3">
                    <select
                      value={t.categoryId ?? ""}
                      onChange={(e) => updateCategory(t.id, e.target.value)}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
                      style={c ? { borderLeft: `3px solid ${c.color}` } : undefined}
                    >
                      <option value="">Ukategoriseret</option>
                      {cats.map((cc) => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
                    </select>
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                    {t.type === "income" ? "+" : "−"}{formatMoney(t.amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => remove(t.id)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 dark:hover:bg-red-950/40 dark:bg-red-950/40 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {sortedTxs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Ingen transaktioner fundet.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <AddTransactionModal cats={cats} accs={accs} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

function AddTransactionModal({ cats, accs, onClose, onSaved }: { cats: Cat[]; accs: Acc[]; onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState(accs[0]?.id?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const cents = Math.round(parseFloat(amount.replace(",", ".")) * 100);
    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: Number(accountId),
        date,
        amount: cents,
        type,
        description: desc,
        categoryId: categoryId ? Number(categoryId) : null,
      }),
    });
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Ny transaktion</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Dato
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" required />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Type
            <select value={type} onChange={(e) => setType(e.target.value as "income" | "expense")} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              <option value="expense">Udgift</option>
              <option value="income">Indtægt</option>
            </select>
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Beløb (kr.)
          <input value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="0,00" required />
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Beskrivelse
          <input value={desc} onChange={(e) => setDesc(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Konto
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
            {accs.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Kategori
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
            <option value="">Ukategoriseret</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800">Annuller</button>
          <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50">
            Gem
          </button>
        </div>
      </form>
    </div>
  );
}
export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 dark:text-slate-400">Indlæser...</div>}>
      <TransactionsPageInner />
    </Suspense>
  );
}
