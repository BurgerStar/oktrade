import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Eye,
  EyeOff,
  ShoppingCart,
} from "lucide-react";
import { useAccount, usePrefs, setPrefs } from "@/lib/store";
import { totalEquityUsd, positionPnl } from "@/lib/account";
import { usePrices, useFiat, useSpotTickers } from "@/components/site/hooks";
import { CoinIcon, PctChange } from "@/components/site/primitives";
import { coinName } from "@/lib/coins";
import {
  AccountShell,
  accountMeta,
  primary,
  secondary,
  panel,
  field,
} from "@/components/account/AccountShell";
import { ActivityTable, Modal } from "@/components/account/Shared";
import { toast } from "sonner";
export const Route = createFileRoute("/assets/")({
  head: () => accountMeta("Assets overview"),
  component: Page,
});
function Page() {
  return (
    <AccountShell title="Portfolio">
      <Overview />
    </AccountShell>
  );
}
function Overview() {
  const a = useAccount();
  const prices = usePrices();
  const tickers = useSpotTickers();
  const fiat = useFiat();
  const prefs = usePrefs();
  const [tab, setTab] = useState("Crypto balances");
  const [q, setQ] = useState("");
  const [small, setSmall] = useState(false);
  const [from, setFrom] = useState("Funding");
  if (!a) return null;
  const total = totalEquityUsd(a, prices);
  const pnl = Object.entries(a.balances).reduce((sum, [c, b]) => {
    const t = tickers.data?.find((t) => t.base === c);
    return sum + (t ? (b.available + b.frozen) * (t.last - t.open24h) : 0);
  }, 0);
  const money = (n: number) => fiat.format(n, { mask: true });
  const balanceRows = Object.entries(a.balances)
    .map(([currency, balance]) => ({
      currency,
      balance,
      value: (balance.available + balance.frozen) * (prices[currency] ?? 0),
      availableValue: balance.available * (prices[currency] ?? 0),
    }))
    .sort((left, right) => right.value - left.value);
  const walletValue = balanceRows.reduce((sum, row) => sum + row.value, 0);
  const availableValue = balanceRows.reduce((sum, row) => sum + row.availableValue, 0);
  const inOrdersValue = balanceRows.reduce(
    (sum, row) => sum + row.balance.frozen * (prices[row.currency] ?? 0),
    0,
  );
  const activeInvestmentCount = a.earn.length + a.positions.length + a.copy.length + a.bots.length;
  const watchlist = a.favorites.slice(0, 4).map((instId) => {
    const base = instId.split("-")[0] ?? instId;
    return { instId, base, ticker: tickers.data?.find((item) => item.instId === instId) };
  });
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Account overview
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Welcome back, {a.user.nickname}
          </h2>
        </div>
        <Link to="/assets/history" className="text-sm text-muted-foreground hover:text-foreground">
          View transaction history <span aria-hidden="true">→</span>
        </Link>
      </header>
      <section className={`${panel} overflow-hidden`}>
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              Total portfolio value
              <button
                aria-label={prefs.hideBalances ? "Show balances" : "Hide balances"}
                aria-pressed={prefs.hideBalances}
                className="rounded-md p-1 hover:bg-accent"
                onClick={() => setPrefs({ hideBalances: !prefs.hideBalances })}
              >
                {prefs.hideBalances ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            <p className="tabular mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              {money(total)}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="text-muted-foreground">24h estimated change</span>
              <span className={`tabular font-medium ${pnl >= 0 ? "text-up" : "text-down"}`}>
                {pnl >= 0 ? "+" : "-"}
                {money(Math.abs(pnl))}
              </span>
              <span className="text-xs text-muted-foreground">Based on current spot holdings</span>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-y-5 border-t border-border pt-5 sm:grid-cols-3 sm:gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Available balance</p>
                <p className="tabular mt-2 text-base font-medium">{money(availableValue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">In open orders</p>
                <p className="tabular mt-2 text-base font-medium">{money(inOrdersValue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active investments</p>
                <p className="tabular mt-2 text-base font-medium">{activeInvestmentCount}</p>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
            <h3 className="text-sm font-semibold">Quick actions</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link to="/assets/deposit" search={{ ccy: "USDT" }} className={primary}>
                <ArrowDownToLine size={16} /> Deposit
              </Link>
              <Link to="/assets/withdraw" search={{ ccy: "USDT" }} className={secondary}>
                <ArrowUpFromLine size={16} /> Withdraw
              </Link>
              <Link className={secondary} to="/buy-crypto">
                <ShoppingCart size={16} /> Buy crypto
              </Link>
              <Link className={secondary} to="/convert">
                <ArrowLeftRight size={16} /> Convert
              </Link>
            </div>
            <div className="mt-3">
              <Modal label="Transfer" title="Transfer between accounts">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Funding and Trading share the same available balance; no transfer is needed.
                  </p>
                  <label className="block text-sm">
                    From
                    <select
                      className={field}
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                    >
                      <option>Funding</option>
                      <option>Trading</option>
                    </select>
                  </label>
                  <p className="text-sm">To: {from === "Funding" ? "Trading" : "Funding"}</p>
                  <button
                    className={primary}
                    onClick={() =>
                      toast.success("Your funds are already available in both accounts")
                    }
                  >
                    Got it
                  </button>
                </div>
              </Modal>
            </div>
          </div>
        </div>
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className={panel}>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold">Asset allocation</h2>
              <p className="mt-1 text-xs text-muted-foreground">Spot wallet value by asset</p>
            </div>
            <span className="tabular text-sm text-muted-foreground">{money(walletValue)}</span>
          </div>
          {walletValue > 0 ? (
            <>
              <div
                className="flex h-2 overflow-hidden rounded-full bg-surface-2"
                aria-label="Asset allocation by spot wallet value"
              >
                {balanceRows
                  .filter((row) => row.value > 0)
                  .map((row, index) => (
                    <div
                      key={row.currency}
                      title={`${row.currency}: ${money(row.value)}`}
                      className="bg-foreground"
                      style={{
                        width: `${(row.value / walletValue) * 100}%`,
                        opacity: Math.max(0.2, 1 - index * 0.15),
                      }}
                    />
                  ))}
              </div>
              <div className="mt-5 space-y-3">
                {balanceRows
                  .filter((row) => row.value > 0)
                  .slice(0, 4)
                  .map((row) => (
                    <div key={row.currency} className="flex items-center gap-3 text-sm">
                      <CoinIcon symbol={row.currency} size={22} />
                      <span className="min-w-0 flex-1 truncate">{coinName(row.currency)}</span>
                      <span className="tabular text-muted-foreground">
                        {((row.value / walletValue) * 100).toFixed(1)}%
                      </span>
                      <span className="tabular w-24 text-right">{money(row.value)}</span>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <div className="border-t border-border py-8">
              <p className="font-medium">Your portfolio is ready to get started</p>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Deposit or buy crypto to see your asset mix here.
              </p>
              <Link to="/assets/deposit" search={{ ccy: "USDT" }} className={`${primary} mt-5`}>
                <ArrowDownToLine size={16} /> Deposit crypto
              </Link>
            </div>
          )}
        </section>
        <section className={panel}>
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold">Market watch</h2>
              <p className="mt-1 text-xs text-muted-foreground">Your favorite spot markets</p>
            </div>
            <Link to="/markets" className="text-sm text-muted-foreground hover:text-foreground">
              All markets
            </Link>
          </div>
          {watchlist.length ? (
            <div>
              {watchlist.map(({ instId, base, ticker }) => (
                <Link
                  key={instId}
                  to="/trade/$instId"
                  params={{ instId }}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-border py-3 last:border-0"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <CoinIcon symbol={base} size={28} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{base}/USDT</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {coinName(base)}
                      </span>
                    </span>
                  </span>
                  <span className="tabular text-right text-sm">
                    {ticker ? money(ticker.last) : "—"}
                  </span>
                  {ticker ? (
                    <PctChange value={ticker.change24h} pill />
                  ) : (
                    <span className="w-16 text-right text-xs text-muted-foreground">—</span>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p className="border-t border-border py-8 text-sm text-muted-foreground">
              No favorite markets yet. Add markets to keep them close at hand.
            </p>
          )}
        </section>
      </div>
      <div>
        <div className="flex gap-6 overflow-x-auto border-b border-border">
          {["Crypto balances", "Earn holdings", "Futures positions", "Copy & Bots"].map((t) => (
            <button
              key={t}
              className={`whitespace-nowrap border-b-2 py-4 text-sm ${tab === t ? "border-foreground font-semibold" : "border-transparent text-muted-foreground"}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === "Crypto balances" ? (
          <>
            <div className="my-5 flex flex-wrap items-center justify-between gap-4">
              <input
                className={`${field} max-w-xs`}
                placeholder="Search assets"
                aria-label="Search assets"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={small}
                  onChange={(e) => setSmall(e.target.checked)}
                />
                Hide small balances (&lt;1 USD)
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    {[
                      "Asset",
                      "Total",
                      "Available",
                      "Frozen / in orders",
                      "USD value",
                      "Actions",
                    ].map((h) => (
                      <th key={h} className="p-3 font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(a.balances)
                    .filter(
                      ([c, b]) =>
                        `${c} ${coinName(c)}`.toLowerCase().includes(q.toLowerCase()) &&
                        (!small || (b.available + b.frozen) * (prices[c] ?? 0) >= 1),
                    )
                    .map(([c, b]) => (
                      <tr key={c} className="border-t border-border">
                        <td className="flex items-center gap-3 p-4">
                          <CoinIcon symbol={c} />
                          <div className="font-medium">
                            {c}
                            <p className="text-xs font-normal text-muted-foreground">
                              {coinName(c)}
                            </p>
                          </div>
                        </td>
                        {[b.available + b.frozen, b.available, b.frozen].map((n, i) => (
                          <td key={i} className="tabular p-3">
                            {prefs.hideBalances
                              ? "******"
                              : n.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                          </td>
                        ))}
                        <td className="tabular p-3">
                          {money((b.available + b.frozen) * (prices[c] ?? 0))}
                        </td>
                        <td className="space-x-4 p-3">
                          <Link
                            to="/trade/$instId"
                            params={{ instId: `${c === "USDT" ? "BTC" : c}-USDT` }}
                          >
                            Trade
                          </Link>
                          <Link to="/assets/deposit" search={{ ccy: c }}>
                            Deposit
                          </Link>
                          <Link to="/assets/withdraw" search={{ ccy: c }}>
                            Withdraw
                          </Link>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        ) : tab === "Earn holdings" ? (
          <div className="space-y-3 py-6">
            {a.earn.map((e) => (
              <div className={panel} key={e.id}>
                {e.product} · {prefs.hideBalances ? "******" : e.amount} {e.ccy}
                <p className="mt-2 text-sm text-muted-foreground">
                  {(e.apr * 100).toFixed(2)}% APR · {e.termDays ? `${e.termDays} days` : "Flexible"}
                </p>
              </div>
            ))}
            {!a.earn.length && (
              <p className="py-8 text-center text-muted-foreground">
                No Earn holdings.{" "}
                <Link to="/earn" className="text-foreground underline">
                  Explore Simple Earn
                </Link>
              </p>
            )}
          </div>
        ) : tab === "Futures positions" ? (
          <div className="py-6">
            {a.positions.map((p) => (
              <div className="flex justify-between border-b border-border py-4" key={p.id}>
                <Link to="/futures/$instId" params={{ instId: p.instId }}>
                  {p.instId} · {p.side} {p.leverage}×
                </Link>
                <span>
                  {money(positionPnl(p, prices[p.instId.split("-")[0] ?? ""] ?? p.entryPx))}
                </span>
              </div>
            ))}
            {!a.positions.length && (
              <p className="py-8 text-center text-muted-foreground">No open futures positions.</p>
            )}
          </div>
        ) : (
          <div className="grid gap-4 py-6 sm:grid-cols-2">
            <div className={panel}>
              <h3 className="font-semibold">Copy trading · {a.copy.length}</h3>
              {a.copy.map((c) => (
                <p className="mt-3" key={c.id}>
                  {c.traderName} · {money(c.amount)}
                </p>
              ))}
              <Link className="mt-4 inline-block text-sm underline" to="/copy-trading">
                Explore traders
              </Link>
            </div>
            <div className={panel}>
              <h3 className="font-semibold">Trading bots · {a.bots.length}</h3>
              {a.bots.map((b) => (
                <p className="mt-3" key={b.id}>
                  {b.instId} · {money(b.investment)}
                </p>
              ))}
              <Link className="mt-4 inline-block text-sm underline" to="/trading-bots">
                Explore bots
              </Link>
            </div>
          </div>
        )}
      </div>
      <section>
        <div className="mb-4 flex justify-between">
          <h2 className="text-xl font-semibold">Recent activity</h2>
          <Link className="text-sm underline" to="/assets/history">
            View all
          </Link>
        </div>
        <ActivityTable items={a.activity.slice(0, 5)} />
      </section>
    </div>
  );
}
