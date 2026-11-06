"use client";
import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";
import { Target, TrendingUp } from "lucide-react";

type Budget = { id: number; accountId: number | null; categoryId: number; amount: number; period: string; month: string | null };
type Cat = { id: number; name: string; color: string; type: string };
type SummaryCat = { categoryId: number; name: string; color: string; spent: number; budget: number | null };

export default function BudgetPage() {
  const [month, setMonth] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<{ id: number; name: string }[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<{ byCategory: SummaryCat[] } | null>(null);
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [calculating, setCalculating] = useState(false);

  const load = async () => {
    const m = month || new Date().toISOString().slice(0, 7);
    const params = new URLSearchParams();
    if (accountId) params.set("accountId", accountId);
    const budgetParams = new URLSearchParams(params);
    const summaryParams = new URLSearchParams(params);
    summaryParams.set("month", m);
    const [accs, c, b, s] = await Promise.all([
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
      fetch(`/api/budgets?${budgetParams}`).then((r) => r.json()),
      fetch(`/api/summary?${summaryParams}`).then((r) => r.json()),
    ]);
    setAccounts(accs);
    setCats(c);
    setBudgets(b);
    setSummary(s);
    const init: Record<number, string> = {};
    for (const cat of c.filter((x: Cat) => x.type === "expense")) {
      const bud = b.find((x: Budget) => x.categoryId === cat.id && (x.month === null || x.month === month));
      init[cat.id] = bud ? (bud.amount / 100).toFixed(2).replace(".", ",") : "";
    }
    setInputs(init);
  };

  useEffect(() => { if (!month) setMonth(new Date().toISOString().slice(0, 7)); }, []);
  useEffect(() => { if (month) load(); }, [month, accountId]);

  const saveBudget = async (categoryId: number) => {
    const val = inputs[categoryId];
    const cents = Math.round(parseFloat((val || "0").replace(",", ".")) * 100);
    const existing = budgets.find((b) => b.categoryId === categoryId && (b.accountId === (accountId ? Number(accountId) : null) || b.accountId === null) && (b.month === null || b.month === month));
    if (existing) {
      if (cents === 0) {
        await fetch(`/api/budgets/${existing.id}`, { method: "DELETE" });
      } else {
        await fetch(`/api/budgets/${existing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: cents }),
        });
      }
    } else if (cents > 0) {
      await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, amount: cents, period: "monthly", month: null, accountId: accountId ? Number(accountId) : null }),
      });
    }
    load();
  };

  const expenseCats = cats.filter((c) => c.type === "expense");
  const spentMap = new Map(summary?.byCategory.map((c) => [c.categoryId, c]) ?? []);

  const totalBudget = expenseCats.reduce((s, c) => {
    const v = parseFloat((inputs[c.id] || "0").replace(",", "."));
    return s + (isNaN(v) ? 0 : v);
  }, 0);
  const totalSpent = summary?.byCategory.reduce((s, c) => s + c.spent, 0) ?? 0;
  const remaining = Math.round(totalBudget * 100) - totalSpent;

  const calculateFromHistory = async () => {
    setCalculating(true);
    try {
      const txParams = new URLSearchParams();
      if (accountId) txParams.set("accountId", accountId);
      const txs = await fetch(`/api/transactions?${txParams}`).then((r) => r.json());
      // last 12 months
      const now = new Date();
      const months: string[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      }
      const monthSet = new Set(months);
      const totals: Record<number, number> = {};
      for (const t of txs) {
        if (t.type !== "expense" || !t.categoryId) continue;
        if (!monthSet.has(String(t.date).slice(0, 7))) continue;
        totals[t.categoryId] = (totals[t.categoryId] ?? 0) + t.amount;
      }
      const newInputs: Record<number, string> = { ...inputs };
      for (const cat of expenseCats) {
        const total = totals[cat.id] ?? 0;
        const avg = Math.round(total / 12);
        newInputs[cat.id] = avg > 0 ? (avg / 100).toFixed(2).replace(".", ",") : "";
      }
      setInputs(newInputs);
      // auto-save
      for (const cat of expenseCats) {
        const val = newInputs[cat.id];
        const cents = Math.round(parseFloat((val || "0").replace(",", ".")) * 100);
        const existing = budgets.find((b) => b.categoryId === cat.id && (b.month === null || b.month === month));
        if (existing) {
          if (cents === 0) await fetch(`/api/budgets/${existing.id}`, { method: "DELETE" });
          else await fetch(`/api/budgets/${existing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: cents }) });
        } else if (cents > 0) {
          await fetch("/api/budgets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categoryId: cat.id, amount: cents, period: "monthly", month: null, accountId: accountId ? Number(accountId) : null }) });
        }
      }
      await load();
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Budget</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Månedlige grænser pr. kategori</p>
        </div>
        <div className="flex gap-2">
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">Alle konti</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <button
            onClick={calculateFromHistory}
            disabled={calculating}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50 disabled:opacity-50"
          >
            {calculating ? "Beregner..." : "Beregn budget fra historik (1 år)"}
          </button>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Budget i alt" value={formatMoney(Math.round(totalBudget * 100))} icon={Target} tone="indigo" />
        <StatCard title="Brugt" value={formatMoney(totalSpent)} icon={TrendingUp} tone="red" />
        <StatCard
          title="Resterende"
          value={formatMoney(remaining)}
          icon={Target}
          tone={remaining >= 0 ? "green" : "red"}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3 text-right">Budget (kr./md.)</th>
              <th className="px-4 py-3 text-right">Brugt</th>
              <th className="px-4 py-3 text-right">Resterende</th>
              <th className="px-4 py-3">Fremdrift</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {expenseCats.map((c) => {
              const info = spentMap.get(c.id);
              const spent = info?.spent ?? 0;
              const budgetCents = Math.round(parseFloat((inputs[c.id] || "0").replace(",", ".")) * 100) || 0;
              const rem = budgetCents - spent;
              const pct = budgetCents > 0 ? Math.min(100, (spent / budgetCents) * 100) : 0;
              const over = budgetCents > 0 && spent > budgetCents;
              return (
                <tr key={c.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50/60">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      value={inputs[c.id] ?? ""}
                      onChange={(e) => setInputs((p) => ({ ...p, [c.id]: e.target.value }))}
                      onBlur={() => saveBudget(c.id)}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      placeholder="0,00"
                      className="w-24 rounded-lg border border-slate-200 dark:border-slate-800 px-2 py-1 text-right text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{formatMoney(spent)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${rem < 0 ? "text-red-600" : "text-green-600"}`}>
                    {budgetCents > 0 ? formatMoney(rem) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {budgetCents > 0 && (
                      <div className="h-2 w-32 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className={`h-2 rounded-full transition-all ${over ? "bg-red-500" : "bg-indigo-500"}`} style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">Budget gemmes automatisk når du forlader feltet. Beløb er per måned.</p>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, tone }: { title: string; value: string; icon: any; tone: "indigo" | "red" | "green" }) {
  const toneClasses = tone === "indigo" ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600" : tone === "red" ? "bg-red-50 dark:bg-red-950/40 text-red-600" : "bg-green-50 dark:bg-green-950/40 text-green-600";
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</span>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClasses}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}