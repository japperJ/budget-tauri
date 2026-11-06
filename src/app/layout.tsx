import type { Metadata } from "next";
import "./globals.css";
import { Shell } from "@/components/shell";
import { SeedRunner } from "@/components/seed-runner";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Budget – banktransaktioner",
  description: "Bank transaction budget app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <ThemeProvider>
          <SeedRunner />
          <Shell>{children}</Shell>
        </ThemeProvider>
      </body>
    </html>
  );
}