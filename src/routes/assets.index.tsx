import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAccount, usePrefs, setPrefs } from "@/lib/store";
import { totalEquityUsd, positionPnl } from "@/lib/account";
import { usePrices, useFiat, useSpotTickers } from "@/components/site/hooks";
import { CoinIcon } from "@/components/site/primitives";
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
    <AccountShell title="Assets overview">
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
  return (
    <div className="space-y-8">
      <section className={panel}>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          Est. total value{" "}
          <button
            aria-label="Toggle balance visibility"
            onClick={() => setPrefs({ hideBalances: !prefs.hideBalances })}
          >
            {prefs.hideBalances ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        <p className="tabular mt-3 text-5xl font-semibold tracking-tight">{money(total)}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          Today's PnL estimate{" "}
          <span className={pnl >= 0 ? "text-up" : "text-down"}>
            {pnl >= 0 ? "+" : "-"}
            {money(Math.abs(pnl))}
          </span>
          <span className="ml-2 text-xs">Based on current holdings · not realized profit</span>
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/assets/deposit" search={{ ccy: "USDT" }} className={primary}>
            Deposit
          </Link>
          <Link to="/assets/withdraw" search={{ ccy: "USDT" }} className={secondary}>
            Withdraw
          </Link>
          <Modal label="Transfer" title="Transfer between accounts">
            <p className="text-sm text-muted-foreground">
              OK Trade uses a unified account. Funding and Trading share the same available balance; no
              transfer is needed.
            </p>
            <label className="text-sm">
              From
              <select className={field} value={from} onChange={(e) => setFrom(e.target.value)}>
                <option>Funding</option>
                <option>Trading</option>
              </select>
            </label>
            <p className="text-sm">To: {from === "Funding" ? "Trading" : "Funding"}</p>
            <button
              className={primary}
              onClick={() => toast.success("Your funds are already available in both accounts")}
            >
              Got it
            </button>
          </Modal>
          <Link className={secondary} to="/buy-crypto">
            Buy crypto
          </Link>
          <Link className={secondary} to="/convert">
            Convert
          </Link>
        </div>
      </section>
      <div className={panel}>
        <div className="mb-4 flex justify-between">
          <h2 className="font-semibold">Asset allocation</h2>
          <span className="text-xs text-muted-foreground">By wallet value</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
          {Object.entries(a.balances).map(([c, b], i) => {
            const v = (b.available + b.frozen) * (prices[c] ?? 0);
            const wallet = Object.entries(a.balances).reduce(
              (s, [x, b]) => s + (b.available + b.frozen) * (prices[x] ?? 0),
              0,
            );
            return (
              <div
                key={c}
                title={`${c}: ${money(v)}`}
                className="bg-foreground"
                style={{
                  width: `${wallet ? (v / wallet) * 100 : 0}%`,
                  opacity: Math.max(0.2, 1 - i * 0.15),
                }}
              />
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-5 text-xs text-muted-foreground">
          {Object.keys(a.balances).map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
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
