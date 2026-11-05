import { useEffect, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LockKeyhole, Wallet } from "lucide-react";
import { getIsAdmin, getMyApprovedDepositBalances } from "@/lib/deposits";
import { reconcileApprovedDepositBalances } from "@/lib/account";
import { listMyAccountTransactionRequests } from "@/lib/transaction-approvals";
import { update, useAccount } from "@/lib/store";
export const accountMeta = (title: string) => ({
  meta: [
    { title: `${title} — OK Trade` },
    {
      name: "description",
      content: `Manage your ${title.toLowerCase()} securely on OK Trade.`,
    },
    { property: "og:title", content: `${title} — OK Trade` },
    {
      property: "og:description",
      content: `Your OK Trade ${title.toLowerCase()}, all in one place.`,
    },
  ],
});
export function AccountShell({ title, children }: { title: string; children: ReactNode }) {
  const account = useAccount();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const admin = useQuery({
    queryKey: ["viewer-is-admin", account?.user.uid],
    queryFn: getIsAdmin,
    enabled: !!account,
    retry: false,
    staleTime: 300_000,
  });
  const approvedDeposits = useQuery({
    queryKey: ["my-approved-deposit-balances", account?.user.uid],
    queryFn: getMyApprovedDepositBalances,
    enabled: !!account,
    retry: false,
    refetchInterval: 30_000,
  });
  const transactions = useQuery({
    queryKey: ["my-account-transactions", account?.user.uid],
    queryFn: listMyAccountTransactionRequests,
    enabled: !!account,
    retry: false,
    refetchInterval: 15_000,
  });
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
  useEffect(() => {
    const balances = approvedDeposits.data;
    if (!account || !balances) return;
    update((state) =>
      state.user.uid === account.user.uid
        ? reconcileApprovedDepositBalances(state, balances)
        : state,
    );
  }, [account, approvedDeposits.data]);
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
    <main className="mx-auto grid min-h-[78vh] max-w-[1480px] md:grid-cols-[244px_minmax(0,1fr)]">
      <aside className="border-b border-border bg-surface/40 p-4 sm:p-5 md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:overflow-y-auto md:border-b-0 md:border-r">
        <div className="mb-6 flex items-center gap-3 px-3 py-2 font-semibold">
          <span className="flex size-9 items-center justify-center rounded-xl border border-border bg-background">
            <Wallet size={17} />
          </span>
          <span>
            <span className="block text-sm">My OK Trade</span>
            <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
              Account workspace
            </span>
          </span>
        </div>
        <nav
          aria-label="Account navigation"
          className="flex gap-1 overflow-x-auto pb-1 md:flex-col"
        >
          <p className="hidden px-4 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground md:block">
            Account
          </p>
          {links.map(([name, to], i) => (
            <Link
              key={to}
              to={to}
              aria-current={path === to ? "page" : undefined}
              className={`shrink-0 rounded-xl px-4 py-3 text-sm transition-colors ${path === to ? "border border-border bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground"} ${i === 5 ? "md:mt-5" : ""}`}
            >
              {name}
            </Link>
          ))}
          {admin.data && (
            <>
              <p className="hidden px-4 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground md:block">
                Administration
              </p>
              <Link
                to="/admin"
                aria-current={path === "/admin" ? "page" : undefined}
                className={`shrink-0 rounded-xl px-4 py-3 text-sm transition-colors ${path === "/admin" ? "border border-border bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}
              >
                Admin control center
              </Link>
              <Link
                to="/admin/deposits"
                aria-current={path === "/admin/deposits" ? "page" : undefined}
                className={`shrink-0 rounded-xl px-4 py-3 text-sm transition-colors ${path === "/admin/deposits" ? "border border-border bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}
              >
                Deposit approvals
              </Link>
            </>
          )}
        </nav>
      </aside>
      <section className="min-w-0 px-4 py-7 sm:px-7 lg:px-10 lg:py-10 xl:px-12">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Workspace
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          </div>
          <span className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground">
            Demo account
          </span>
        </div>
        {transactions.isError ? (
          <p
            className="mb-6 rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground"
            role="status"
          >
            Approval history could not be refreshed. Transaction changes remain subject to server
            approval.
          </p>
        ) : transactions.data?.length ? (
          <div className="mb-6 rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">Recent transaction approvals</p>
              <span className="text-xs text-muted-foreground">
                {transactions.data.length} recent
              </span>
            </div>
            <ul className="mt-4 divide-y divide-border">
              {transactions.data.slice(0, 5).map((request) => (
                <li
                  key={request.id}
                  className="flex flex-wrap items-start gap-x-3 gap-y-1 py-3 text-sm first:pt-0 last:pb-0"
                >
                  <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[11px] capitalize">
                    {request.status}
                  </span>
                  <span className="min-w-0 flex-1 text-muted-foreground">
                    {request.summary}
                    <span className="ml-2 text-xs">
                      {new Date(request.created_at).toLocaleString()}
                    </span>
                    {request.review_note && <span className="ml-2">· {request.review_note}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {children}
      </section>
    </main>
  );
}
export const primary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40";
export const secondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40";
export const field =
  "w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";
export const panel = "rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6";
