import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LockKeyhole, Wallet } from "lucide-react";
import { useAccount } from "@/lib/store";
export const accountMeta = (title: string) => ({
  meta: [
    { title: `${title} — OK Trade` },
    {
      name: "description",
      content: `Manage your ${title.toLowerCase()} securely on OK Trade.`,
    },
    { property: "og:title", content: `${title} — OK Trade` },
    { property: "og:description", content: `Your OK Trade ${title.toLowerCase()}, all in one place.` },
  ],
});
export function AccountShell({ title, children }: { title: string; children: ReactNode }) {
  const account = useAccount();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const links = [
    ["Overview", "/assets"],
    ["Deposit", "/assets/deposit"],
    ["Withdraw", "/assets/withdraw"],
    ["History", "/assets/history"],
    ["Order center", "/orders"],
    ["Profile", "/account"],
    ["Security", "/account/security"],
    ["Verification", "/account/verification"],
    ["Preferences", "/account/preferences"],
  ] as const;
  if (!account)
    return (
      <main className="flex min-h-[65vh] items-center justify-center px-5">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-10 text-center">
          <LockKeyhole className="mx-auto mb-6 size-10" />
          <h1 className="text-2xl font-bold tracking-tight">Log in to view your assets</h1>
          <p className="my-4 text-sm text-muted-foreground">
            Your portfolio, transactions and security settings in one place.
          </p>
          <div className="mt-7 flex justify-center gap-3">
            <Link className={primary} to="/login" search={{ redirect: path }}>
              Log in
            </Link>
            <Link className={secondary} to="/signup" search={{}}>
              Sign up
            </Link>
          </div>
        </div>
      </main>
    );
  return (
    <main className="mx-auto grid min-h-[78vh] max-w-[1440px] md:grid-cols-[220px_1fr]">
      <aside className="border-b border-border p-5 md:border-b-0 md:border-r">
        <div className="mb-7 flex items-center gap-3 px-3 font-semibold">
          <Wallet size={19} /> My OK Trade
        </div>
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {links.map(([name, to], i) => (
            <Link
              key={to}
              to={to}
              className={`shrink-0 rounded-lg px-4 py-3 text-sm ${path === to ? "bg-accent font-semibold" : "text-muted-foreground hover:bg-surface"} ${i === 5 ? "md:mt-6" : ""}`}
            >
              {name}
            </Link>
          ))}
        </nav>
      </aside>
      <section className="min-w-0 px-5 py-9 lg:px-12">
        <div className="mb-9 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <span className="text-[11px] text-muted-foreground">Practice</span>
        </div>
        {children}
      </section>
    </main>
  );
}
export const primary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40";
export const secondary =
  "inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-40";
export const field =
  "w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring";
export const panel = "rounded-2xl border border-border bg-card p-6";
