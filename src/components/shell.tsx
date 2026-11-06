"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import {
  LayoutDashboard, Receipt, Wallet, Upload, Settings as SettingsIcon, PiggyBank,
} from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transaktioner", icon: Receipt },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/import", label: "Import", icon: Upload },
  { href: "/settings", label: "Indstillinger", icon: SettingsIcon },
];

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {theme === "dark" ? "Lys tilstand" : "Mørk tilstand"}
    </button>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-16 items-center gap-2 px-6 border-b border-slate-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <PiggyBank className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">Budget</div>
            <div className="text-xs text-slate-500">banktransaktioner</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map((l) => {
            const active = pathname === l.href;
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-indigo-600" : "text-slate-400"}`} />
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <ThemeToggle />
          <div className="text-xs text-slate-400 dark:text-slate-500">DKK · da-DK</div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-white border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <PiggyBank className="h-4 w-4" />
            </div>
            <span className="font-bold text-slate-900">Budget</span>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2">
          {links.map((l) => {
            const active = pathname === l.href;
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                  active ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700" : "text-slate-600"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="flex-1 md:ml-64 min-w-0 bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8 mt-24 md:mt-0">
          {children}
        </div>
      </main>
    </div>
  );
}