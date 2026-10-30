import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { tickersQuery } from "@/lib/market";
import { useAccount } from "@/lib/store";
import {
  cancelOrder,
  closePosition,
  positionPnl,
  positionRoe,
  liquidationPrice,
} from "@/lib/account";
import { useAction } from "@/components/site/hooks";
import { AccountShell, accountMeta, secondary, field } from "@/components/account/AccountShell";
export const Route = createFileRoute("/orders")({
  head: () => accountMeta("Order center"),
  component: Page,
});
function Page() {
  return (
    <AccountShell title="Order center">
      <Orders />
    </AccountShell>
  );
}
function Orders() {
  const a = useAccount();
  const act = useAction();
  const marks = useQuery(tickersQuery("SWAP"));
  const [tab, setTab] = useState("Open orders");
  const [inst, setInst] = useState("");
  const [side, setSide] = useState("All");
  if (!a) return null;
  const match = (p: { instId: string; side: string }) =>
    p.instId.toLowerCase().includes(inst.toLowerCase()) && (side === "All" || p.side === side);
  const orders = a.orders.filter(
    (o) => match(o) && (tab === "Open orders" ? o.status === "open" : o.status !== "open"),
  );
  const positions = a.positions.filter(match);
  const closed = a.closedPositions.filter(match);
  return (
    <div>
      <div className="mb-6 flex gap-6 overflow-x-auto border-b border-border">
        {["Open orders", "Order history", "Positions", "Position history"].map((t) => (
          <button
            className={`whitespace-nowrap border-b-2 py-4 text-sm ${t === tab ? "border-foreground font-semibold" : "border-transparent text-muted-foreground"}`}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
            {t === "Open orders" ? ` (${a.orders.filter((o) => o.status === "open").length})` : ""}
          </button>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap gap-3">
        <input
          className={`${field} max-w-xs`}
          placeholder="Filter by instrument"
          aria-label="Instrument"
          value={inst}
          onChange={(e) => setInst(e.target.value)}
        />
        <select
          className={`${field} max-w-40`}
          aria-label="Side"
          value={side}
          onChange={(e) => setSide(e.target.value)}
        >
          {["All", "buy", "sell", "long", "short"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {tab === "Open orders" && (
          <button
            disabled={!orders.length}
            className={`${secondary} ml-auto`}
            onClick={() =>
              act((s) => {
                let next = s;
                for (const o of orders) {
                  const r = cancelOrder(next, o.id);
                  if (r.ok) next = r.state;
                }
                return { ok: true, state: next, message: "Filtered open orders canceled" };
              })
            }
          >
            Cancel all
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              {(tab === "Positions"
                ? [
                    "Instrument",
                    "Side",
                    "Size",
                    "Entry / Mark",
                    "PnL / ROE",
                    "Liq. price",
                    "Action",
                  ]
                : tab === "Position history"
                  ? ["Instrument", "Side", "Size", "Entry", "Close", "Realized PnL", "Closed"]
                  : ["Instrument", "Side", "Size", "Price / Avg. price", "Fee", "Status", "Action"]
              ).map((h) => (
                <th className="p-3 font-normal" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(tab === "Open orders" || tab === "Order history") &&
              orders.map((o) => (
                <tr className="border-t border-border" key={o.id}>
                  <td className="p-4">
                    <Link to="/trade/$instId" params={{ instId: o.instId }}>
                      {o.instId}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleString()}
                    </p>
                  </td>
                  <td className={o.side === "buy" ? "text-up" : "text-down"}>{o.side}</td>
                  <td className="tabular p-3">{o.size}</td>
                  <td className="tabular p-3">
                    {o.price} / {o.avgPx || "—"}
                  </td>
                  <td className="tabular p-3">
                    {o.fee} {o.feeCcy}
                  </td>
                  <td className="p-3">{o.status}</td>
                  <td className="p-3">
                    {o.status === "open" && (
                      <button
                        className={secondary}
                        onClick={() => act((s) => cancelOrder(s, o.id))}
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            {tab === "Positions" &&
              positions.map((p) => {
                const mark = marks.data?.find((t) => t.instId === p.instId)?.last ?? p.entryPx;
                const pnl = positionPnl(p, mark);
                return (
                  <tr className="border-t border-border" key={p.id}>
                    <td className="p-4">
                      <Link to="/futures/$instId" params={{ instId: p.instId }}>
                        {p.instId}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {p.marginMode} · {p.leverage}×
                      </p>
                    </td>
                    <td className={p.side === "long" ? "text-up" : "text-down"}>{p.side}</td>
                    <td className="tabular p-3">{p.size}</td>
                    <td className="tabular p-3">
                      {p.entryPx} / {mark}
                    </td>
                    <td className={`tabular p-3 ${pnl >= 0 ? "text-up" : "text-down"}`}>
                      {pnl.toFixed(2)} USDT / {positionRoe(p, mark).toFixed(2)}%
                    </td>
                    <td className="tabular p-3">{liquidationPrice(p).toFixed(2)}</td>
                    <td>
                      <button
                        className={secondary}
                        onClick={() => act((s) => closePosition(s, p.id, mark))}
                      >
                        Close
                      </button>
                    </td>
                  </tr>
                );
              })}
            {tab === "Position history" &&
              closed.map((p) => (
                <tr className="border-t border-border" key={p.id}>
                  <td className="p-4">{p.instId}</td>
                  <td>{p.side}</td>
                  <td className="tabular p-3">{p.size}</td>
                  <td className="tabular p-3">{p.entryPx}</td>
                  <td className="tabular p-3">{p.closePx}</td>
                  <td className={`tabular p-3 ${p.realizedPnl >= 0 ? "text-up" : "text-down"}`}>
                    {p.realizedPnl.toFixed(2)} USDT
                  </td>
                  <td className="p-3">
                    {new Date(p.closedAt).toLocaleString()} · {p.reason}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!(tab === "Positions"
          ? positions.length
          : tab === "Position history"
            ? closed.length
            : orders.length) && (
          <div className="py-20 text-center">
            <h3 className="font-medium">No {tab.toLowerCase()}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Matching orders and positions will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
