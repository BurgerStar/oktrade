import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState, LineTabs } from "@/components/site/primitives";
import { usePrices } from "@/components/site/hooks";
import {
  cancelOrder,
  closePosition,
  liquidationPrice,
  positionPnl,
  positionRoe,
  type AccountState,
} from "@/lib/account";
import { formatAmount, formatDateTime, formatNumber, formatPrice } from "@/lib/format";
import { run, useAccount } from "@/lib/store";
import { cn } from "@/lib/utils";

type Tab = "open" | "history" | "positions" | "posHistory" | "assets";

export function OrdersPanel({
  instId,
  kind,
  mark,
}: {
  instId: string;
  kind: "spot" | "futures";
  mark?: number | undefined;
}) {
  const account = useAccount();
  const href = useRouterState({ select: (s) => s.location.href });
  const [tab, setTab] = useState<Tab>(kind === "futures" ? "positions" : "open");
  const [onlyThis, setOnlyThis] = useState(false);

  const tabs: { value: Tab; label: string }[] =
    kind === "futures"
      ? [
          { value: "positions", label: `Positions (${account?.positions.length ?? 0})` },
          { value: "posHistory", label: "Position history" },
          { value: "assets", label: "Assets" },
        ]
      : [
          {
            value: "open",
            label: `Open orders (${account?.orders.filter((o) => o.status === "open").length ?? 0})`,
          },
          { value: "history", label: "Order history" },
          { value: "assets", label: "Assets" },
        ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-border px-4">
        <LineTabs value={tab} onChange={setTab} tabs={tabs} />
        <div className="flex shrink-0 items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox checked={onlyThis} onCheckedChange={(v) => setOnlyThis(!!v)} /> Current pair
            only
          </label>
          <Link to="/orders" className="text-xs text-muted-foreground hover:text-foreground">
            All orders
          </Link>
        </div>
      </div>
      <div className="flex-1 overflow-auto scrollbar-thin">
        {!account ? (
          <EmptyState
            title="Log in to view your orders"
            action={
              <div className="flex gap-2">
                <Button asChild size="sm" className="rounded-full">
                  <Link to="/login" search={{ redirect: href }}>
                    Log in
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-full">
                  <Link to="/signup" search={{ redirect: href }}>
                    Sign up
                  </Link>
                </Button>
              </div>
            }
          />
        ) : tab === "open" || tab === "history" ? (
          <SpotOrders account={account} tab={tab} filter={onlyThis ? instId : undefined} />
        ) : tab === "positions" ? (
          <Positions
            account={account}
            filter={onlyThis ? instId : undefined}
            instId={instId}
            mark={mark}
          />
        ) : tab === "posHistory" ? (
          <PositionHistory account={account} filter={onlyThis ? instId : undefined} />
        ) : (
          <Assets account={account} />
        )}
      </div>
    </div>
  );
}

const th = "px-4 py-2 text-left text-[11px] font-normal text-muted-foreground whitespace-nowrap";
const td = "px-4 py-2.5 whitespace-nowrap tabular";

function SpotOrders({
  account,
  tab,
  filter,
}: {
  account: AccountState;
  tab: "open" | "history";
  filter?: string | undefined;
}) {
  const rows = account.orders.filter(
    (o) =>
      (tab === "open" ? o.status === "open" : o.status !== "open") &&
      (!filter || o.instId === filter),
  );
  if (!rows.length)
    return <EmptyState title={tab === "open" ? "No open orders" : "No order history"} />;
  return (
    <table className="w-full text-xs">
      <thead className="sticky top-0 bg-background">
        <tr>
          <th className={th}>Time</th>
          <th className={th}>Pair</th>
          <th className={th}>Type</th>
          <th className={th}>Side</th>
          <th className={th}>Price</th>
          <th className={th}>Amount</th>
          {tab === "history" && <th className={th}>Avg. fill</th>}
          {tab === "history" && <th className={th}>Fee</th>}
          <th className={th}>{tab === "open" ? "Total" : "Status"}</th>
          {tab === "open" && (
            <th className={cn(th, "text-right")}>
              <button
                className="text-foreground hover:underline"
                onClick={() => {
                  rows.forEach((o) => run((s) => cancelOrder(s, o.id)));
                  toast.success("All orders canceled");
                }}
              >
                Cancel all
              </button>
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((o) => (
          <tr key={o.id} className="border-t border-border">
            <td className={cn(td, "text-muted-foreground")}>{formatDateTime(o.createdAt)}</td>
            <td className={td}>{o.instId.replace("-", "/")}</td>
            <td className={cn(td, "capitalize")}>{o.type}</td>
            <td className={cn(td, "capitalize", o.side === "buy" ? "text-up" : "text-down")}>
              {o.side}
            </td>
            <td className={td}>
              {o.type === "market" && o.status === "open" ? "Market" : formatPrice(o.price)}
            </td>
            <td className={td}>{formatAmount(o.size)}</td>
            {tab === "history" && <td className={td}>{o.avgPx ? formatPrice(o.avgPx) : "--"}</td>}
            {tab === "history" && (
              <td className={td}>{o.fee ? formatAmount(o.fee, o.feeCcy) : "--"}</td>
            )}
            <td className={cn(td, tab === "history" && "capitalize")}>
              {tab === "open" ? formatNumber(o.price * o.size, 2) : o.status}
            </td>
            {tab === "open" && (
              <td className={cn(td, "text-right")}>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-full text-[11px]"
                  onClick={() => {
                    const r = run((s) => cancelOrder(s, o.id));
                    r.ok ? toast.success("Order canceled") : toast.error(r.error);
                  }}
                >
                  Cancel
                </Button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Positions({
  account,
  filter,
  instId,
  mark,
}: {
  account: AccountState;
  filter?: string | undefined;
  instId: string;
  mark?: number | undefined;
}) {
  const prices = usePrices();
  const rows = account.positions.filter((p) => !filter || p.instId === filter);
  if (!rows.length)
    return (
      <EmptyState title="No open positions" body="Open a long or short position to see it here." />
    );
  const markOf = (id: string) =>
    id === instId && mark ? mark : (prices[id.split("-")[0] ?? ""] ?? 0);
  return (
    <table className="w-full text-xs">
      <thead className="sticky top-0 bg-background">
        <tr>
          {[
            "Instrument",
            "Size",
            "Entry price",
            "Mark price",
            "Liq. price",
            "Margin",
            "PnL (ROE)",
            "",
          ].map((h) => (
            <th key={h} className={th}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => {
          const m = markOf(p.instId);
          const pnl = positionPnl(p, m);
          return (
            <tr key={p.id} className="border-t border-border">
              <td className={td}>
                <span className="font-medium">{p.instId.replace("-USDT-SWAP", "USDT")}</span>{" "}
                <span
                  className={cn(
                    "rounded px-1 py-0.5 text-[10px]",
                    p.side === "long" ? "bg-up-muted text-up" : "bg-down-muted text-down",
                  )}
                >
                  {p.side === "long" ? "Long" : "Short"} {p.leverage}x
                </span>{" "}
                <span className="text-[10px] capitalize text-muted-foreground">{p.marginMode}</span>
              </td>
              <td className={td}>{formatAmount(p.size, p.instId.split("-")[0])}</td>
              <td className={td}>{formatPrice(p.entryPx)}</td>
              <td className={td}>{formatPrice(m)}</td>
              <td className={cn(td, "text-down")}>{formatPrice(liquidationPrice(p))}</td>
              <td className={td}>{formatNumber(p.margin, 2)} USDT</td>
              <td className={cn(td, pnl >= 0 ? "text-up" : "text-down")}>
                {pnl >= 0 ? "+" : ""}
                {formatNumber(pnl, 2)} USDT ({positionRoe(p, m).toFixed(2)}%)
              </td>
              <td className={cn(td, "text-right")}>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-full text-[11px]"
                  onClick={() => {
                    const r = run((s) => closePosition(s, p.id, m));
                    r.ok
                      ? toast.success(`Closed at ${formatPrice(m)}`, {
                          description: `Realized PnL ${formatNumber(pnl, 2)} USDT`,
                        })
                      : toast.error(r.error);
                  }}
                >
                  Market close
                </Button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function PositionHistory({
  account,
  filter,
}: {
  account: AccountState;
  filter?: string | undefined;
}) {
  const rows = account.closedPositions.filter((p) => !filter || p.instId === filter);
  if (!rows.length) return <EmptyState title="No position history" />;
  return (
    <table className="w-full text-xs">
      <thead className="sticky top-0 bg-background">
        <tr>
          {["Closed", "Instrument", "Side", "Entry", "Close", "Realized PnL", "Status"].map((h) => (
            <th key={h} className={th}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.id + p.closedAt} className="border-t border-border">
            <td className={cn(td, "text-muted-foreground")}>{formatDateTime(p.closedAt)}</td>
            <td className={td}>{p.instId.replace("-USDT-SWAP", "USDT Perp")}</td>
            <td className={cn(td, p.side === "long" ? "text-up" : "text-down")}>
              {p.side === "long" ? "Long" : "Short"} {p.leverage}x
            </td>
            <td className={td}>{formatPrice(p.entryPx)}</td>
            <td className={td}>{formatPrice(p.closePx)}</td>
            <td className={cn(td, p.realizedPnl >= 0 ? "text-up" : "text-down")}>
              {formatNumber(p.realizedPnl, 2)} USDT
            </td>
            <td className={cn(td, "capitalize")}>{p.reason}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Assets({ account }: { account: AccountState }) {
  const prices = usePrices();
  const rows = Object.entries(account.balances).filter(([, b]) => b.available + b.frozen > 0);
  if (!rows.length) return <EmptyState title="No assets" />;
  return (
    <table className="w-full text-xs">
      <thead className="sticky top-0 bg-background">
        <tr>
          {["Coin", "Total", "Available", "In orders", "Value (USD)"].map((h) => (
            <th key={h} className={th}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(([c, b]) => (
          <tr key={c} className="border-t border-border">
            <td className={cn(td, "font-medium")}>{c}</td>
            <td className={td}>{formatAmount(b.available + b.frozen)}</td>
            <td className={td}>{formatAmount(b.available)}</td>
            <td className={td}>{formatAmount(b.frozen)}</td>
            <td className={td}>${formatNumber((b.available + b.frozen) * (prices[c] ?? 0), 2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
