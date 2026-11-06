"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, formatMonth } from "@/lib/format";
import {
  TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, PieChart as PieChartIcon,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from "recharts";

type Summary = {
  month: string;
  income: number;
  expense: number;
  net: number;
  income12: number;
  expense12: number;
  net12: number;
  byCategory: { categoryId: number; name: string; color: string; spent: number; budget: number | null }[];
  byCategory12: { categoryId: number; name: string; color: string; spent: number }[];
  cashflow: { month: string; income: number; expense: number }[];
  uncategorized: number;
  transactionCount: number;
  topMerchants: { name: string; amount: number }[];
};

export default function Dashboard() {
  const router = useRouter();
  const [month, setMonth] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<{ id: number; name: string }[]>([]);
  const [data, setData] = useState<Summary | null>(null);
  const hoveredMonthRef = useRef<string | null>(null);

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then(setAccounts);
  }, []);

  const handleBarClick = (d: any) => {
    const m = d?.activePayload?.[0]?.payload?.month;
    if (m) router.push(`/transactions?month=${m}`);
  };

  useEffect(() => {
    if (!month) setMonth(new Date().toISOString().slice(0, 7));
  }, []);
  useEffect(() => {
    if (!month) return;
    const params = new URLSearchParams({ month });
    if (accountId) params.set("accountId", accountId);
    fetch(`/api/summary?${params}`).then((r) => r.json()).then(setData);
  }, [month, accountId]);

  const cfData = data?.cashflow.map((c) => ({
    month: c.month,
    name: formatMonth(c.month).slice(0, 3),
    Indtægt: c.income / 100,
    Udgifter: c.expense / 100,
  })) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 dark:text-slate-100">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Overblik over din økonomi</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">Konto</span>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Alle konti</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">Måned</span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      </div>

      {!data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-700/60" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              title="Indtægter (1 år)"
              value={formatMoney(data.income12)}
              icon={ArrowUpRight}
              tone="green"
              subtitle={`${data.transactionCount} transaktioner denne måned`}
            />
            <StatCard
              title="Udgifter (1 år)"
              value={formatMoney(data.expense12)}
              icon={ArrowDownRight}
              tone="red"
              subtitle={data.uncategorized > 0 ? `${data.uncategorized} ukategoriserede denne måned` : "Alle kategoriseret"}
            />
            <StatCard
              title="Netto (1 år)"
              value={formatMoney(data.net12)}
              icon={Wallet}
              tone={data.net12 >= 0 ? "green" : "red"}
              subtitle={data.net12 >= 0 ? "Positivt cashflow" : "Negativt cashflow"}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard
              title="Gns. indtægt pr. måned"
              value={formatMoney(Math.round(data.income12 / 12))}
              icon={ArrowUpRight}
              tone="green"
              subtitle="Over 12 måneder"
            />
            <StatCard
              title="Gns. udgift pr. måned"
              value={formatMoney(Math.round(data.expense12 / 12))}
              icon={ArrowDownRight}
              tone="red"
              subtitle="Over 12 måneder"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Cashflow</h2>
                <span className="text-xs text-slate-500 dark:text-slate-400">Sidste 12 måneder</span>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={cfData}
                    barGap={4}
                    onMouseMove={(d: any) => {
                      if (d && d.activePayload && d.activePayload[0]) {
                        hoveredMonthRef.current = d.activePayload[0].payload?.month ?? null;
                      }
                    }}
                    onMouseLeave={() => { hoveredMonthRef.current = null; }}
                    onClick={() => {
                      const m = hoveredMonthRef.current;
                      if (m) {
                        const params = new URLSearchParams({ month: m });
                        if (accountId) params.set("accountId", accountId);
                        router.push(`/transactions?${params}`);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: "#f1f5f9" }}
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,.05)" }}
                      formatter={(v) => Number(v).toLocaleString("da-DK", { minimumFractionDigits: 2 }) + " kr."}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Indtægt" fill="#22c55e" shape={(props: any) => {
                      const { x, y, width, height } = props;
                      const month = props.payload?.month;
                      return (
                        <rect
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill="#22c55e"
                          rx={4}
                          ry={4}
                          style={{ cursor: "pointer" }}
                          onClick={(e: any) => { e.stopPropagation(); if (month) { const params = new URLSearchParams({ month }); if (accountId) params.set("accountId", accountId); router.push(`/transactions?${params}`); } }}
                          onMouseDown={(e: any) => { e.stopPropagation(); if (month) { const params = new URLSearchParams({ month }); if (accountId) params.set("accountId", accountId); router.push(`/transactions?${params}`); } }}
                        />
                      );
                    }} />
                    <Bar dataKey="Udgifter" fill="#ef4444" shape={(props: any) => {
                      const { x, y, width, height } = props;
                      const month = props.payload?.month;
                      return (
                        <rect
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill="#ef4444"
                          rx={4}
                          ry={4}
                          style={{ cursor: "pointer" }}
                          onClick={(e: any) => { e.stopPropagation(); if (month) { const params = new URLSearchParams({ month }); if (accountId) params.set("accountId", accountId); router.push(`/transactions?${params}`); } }}
                          onMouseDown={(e: any) => { e.stopPropagation(); if (month) { const params = new URLSearchParams({ month }); if (accountId) params.set("accountId", accountId); router.push(`/transactions?${params}`); } }}
                        />
                      );
                    }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {data.cashflow.map((c) => (
                  <button
                    key={c.month}
                    onClick={() => {
                      const params = new URLSearchParams({ month: c.month });
                      if (accountId) params.set("accountId", accountId);
                      router.push(`/transactions?${params}`);
                    }}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 transition hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 dark:bg-indigo-950/40 hover:text-indigo-700"
                  >
                    {formatMonth(c.month).slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Udgifter pr. kategori</h2>
                <PieChartIcon className="h-4 w-4 text-slate-400" />
              </div>
              <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                {data.byCategory.filter((c) => c.spent > 0).map((c) => {
                  const pct = c.budget ? Math.min(100, (c.spent / c.budget) * 100) : null;
                  const over = c.budget ? c.spent > c.budget : false;
                  return (
                    <div key={c.categoryId}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                          {c.name}
                        </span>
                        <span className="text-slate-600 dark:text-slate-300">
                          {formatMoney(c.spent)}{c.budget ? <span className="text-slate-400"> / {formatMoney(c.budget)}</span> : null}
                        </span>
                      </div>
                      {c.budget && (
                        <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`h-2 rounded-full transition-all ${over ? "bg-red-500" : "bg-indigo-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                {data.byCategory.filter((c) => c.spent > 0).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <TrendingDown className="h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Ingen udgifter denne måned.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {data.byCategory12 && data.byCategory12.length > 0 && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Udgifter pr. kategori (1 år)</h2>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Procent</span>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.byCategory12}
                        dataKey="spent"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {data.byCategory12.map((c, i) => (
                          <Cell key={i} fill={c.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatMoney(Number(v))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {data.topMerchants && data.topMerchants.length > 0 && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Største udgifter</h2>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Denne måned</span>
                </div>
              <div className="space-y-3">
                {data.topMerchants.map((m, i) => {
                  const max = data.topMerchants[0].amount;
                  const pct = max > 0 ? (m.amount / max) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate font-medium text-slate-700 dark:text-slate-200">{m.name}</span>
                        <span className="ml-2 shrink-0 text-slate-600 dark:text-slate-300">{formatMoney(m.amount)}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-1.5 rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, tone, subtitle }: {
  title: string; value: string; icon: any; tone: "green" | "red"; subtitle: string;
}) {
  const toneClasses = tone === "green"
    ? "bg-green-50 dark:bg-green-950/40 text-green-600"
    : "bg-red-50 dark:bg-red-950/40 text-red-600";
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</span>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClasses}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{value}</div>
      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</div>
    </div>
  );
}