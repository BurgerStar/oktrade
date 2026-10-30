import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { OrderBook } from "@/lib/market";
import { formatPrice } from "@/lib/format";

export function DepthChart({ book }: { book: OrderBook | null }) {
  if (!book || !book.bids.length || !book.asks.length)
    return (
      <div className="grid h-full place-items-center text-sm text-muted-foreground">
        Loading depth…
      </div>
    );
  let cum = 0;
  const bids = [...book.bids]
    .slice(0, 40)
    .map((b) => ({ px: b.px, bid: (cum += b.sz) }))
    .reverse();
  cum = 0;
  const asks = book.asks.slice(0, 40).map((a) => ({ px: a.px, ask: (cum += a.sz) }));
  const data = [...bids, ...asks];
  return (
    <div className="absolute inset-0 p-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="px"
            tickFormatter={(v) => formatPrice(v)}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            stroke="var(--border)"
            minTickGap={40}
          />
          <YAxis
            orientation="right"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            stroke="var(--border)"
            width={50}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelFormatter={(v) => `Price ${formatPrice(Number(v))}`}
            formatter={(v: number, n: string) => [v.toFixed(4), n === "bid" ? "Bids" : "Asks"]}
          />
          <Area
            type="step"
            dataKey="bid"
            stroke="var(--up)"
            fill="var(--up-muted)"
            strokeWidth={2}
            isAnimationActive={false}
          />
          <Area
            type="step"
            dataKey="ask"
            stroke="var(--down)"
            fill="var(--down-muted)"
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
