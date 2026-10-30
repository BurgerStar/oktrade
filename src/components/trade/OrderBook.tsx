import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { BookLevel, OrderBook as Book, Trade } from "@/lib/market";
import { formatNumber, formatPrice, formatTime, priceDecimals } from "@/lib/format";
import { LineTabs } from "@/components/site/primitives";
import { cn } from "@/lib/utils";

type Mode = "both" | "bids" | "asks";

function group(levels: BookLevel[], step: number, side: "ask" | "bid"): BookLevel[] {
  if (step <= 0) return levels;
  const m = new Map<number, number>();
  for (const l of levels) {
    const k = side === "ask" ? Math.ceil(l.px / step) * step : Math.floor(l.px / step) * step;
    const key = +k.toFixed(10);
    m.set(key, (m.get(key) ?? 0) + l.sz);
  }
  const arr = [...m.entries()].map(([px, sz]) => ({ px, sz }));
  return side === "ask" ? arr.sort((a, b) => a.px - b.px) : arr.sort((a, b) => b.px - a.px);
}

export function BookAndTrades({
  book,
  trades,
  last,
  prevLast,
  base,
  quote,
  sizeLabel,
  onPrice,
}: {
  book: Book | null;
  trades: Trade[];
  last?: number | undefined;
  prevLast?: number | undefined;
  base: string;
  quote: string;
  sizeLabel?: string | undefined;
  onPrice: (px: number) => void;
}) {
  const [tab, setTab] = useState<"book" | "trades">("book");
  const [mode, setMode] = useState<Mode>("both");
  const d = priceDecimals(last ?? 1);
  const tick = Math.pow(10, -d);
  const steps = [tick, tick * 10, tick * 100, tick * 1000];
  const [stepIdx, setStepIdx] = useState(0);
  const step = steps[stepIdx] ?? tick;
  const stepDecimals = Math.max(0, d - stepIdx);
  const rowsEach = mode === "both" ? 12 : 24;

  const { asks, bids, max } = useMemo(() => {
    if (!book) return { asks: [], bids: [], max: 1 };
    const a = group(book.asks, stepIdx ? step : 0, "ask").slice(0, rowsEach);
    const b = group(book.bids, stepIdx ? step : 0, "bid").slice(0, rowsEach);
    let ca = 0;
    let cb = 0;
    const ac = a.map((l) => ({ ...l, total: (ca += l.sz) }));
    const bc = b.map((l) => ({ ...l, total: (cb += l.sz) }));
    return { asks: ac, bids: bc, max: Math.max(ca, cb, 1e-9) };
  }, [book, step, stepIdx, rowsEach]);

  const bidVol = bids.reduce((s, b) => s + b.sz, 0);
  const askVol = asks.reduce((s, a) => s + a.sz, 0);
  const bidPct = bidVol + askVol ? (bidVol / (bidVol + askVol)) * 100 : 50;
  const up = (last ?? 0) >= (prevLast ?? last ?? 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3">
        <LineTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "book", label: "Order book" },
            { value: "trades", label: "Trades" },
          ]}
        />
      </div>
      {tab === "book" ? (
        <div className="flex flex-1 flex-col text-xs">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex gap-1">
              {(["both", "bids", "asks"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  aria-label={
                    m === "both"
                      ? "Show bids and asks"
                      : m === "bids"
                        ? "Show bids only"
                        : "Show asks only"
                  }
                  className={cn(
                    "grid size-6 place-items-center rounded border",
                    mode === m ? "border-foreground" : "border-border opacity-60 hover:opacity-100",
                  )}
                >
                  <span className="flex h-3 w-3 flex-col gap-px">
                    {m !== "bids" && <span className="flex-1 rounded-[1px] bg-down" />}
                    {m !== "asks" && <span className="flex-1 rounded-[1px] bg-up" />}
                  </span>
                </button>
              ))}
            </div>
            <select
              value={stepIdx}
              onChange={(e) => setStepIdx(+e.target.value)}
              className="tabular rounded border border-border bg-background px-1.5 py-0.5 text-xs"
              aria-label="Price grouping"
            >
              {steps.map((s, i) => (
                <option key={i} value={i}>
                  {s.toFixed(Math.max(0, d - i))}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 px-3 pb-1 text-[11px] text-muted-foreground">
            <span>Price ({quote})</span>
            <span className="text-right">{sizeLabel ?? `Amount (${base})`}</span>
            <span className="text-right">Total</span>
          </div>
          {mode !== "bids" && (
            <div
              className={cn(
                "flex flex-col-reverse",
                mode === "both" && "min-h-[264px] justify-start",
              )}
            >
              {asks.length === 0 && <Skeleton rows={rowsEach} />}
              {asks.map((l) => (
                <Row
                  key={l.px}
                  l={l}
                  max={max}
                  side="ask"
                  decimals={stepDecimals}
                  onClick={() => onPrice(l.px)}
                />
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 border-y border-border px-3 py-2">
            <span className={cn("tabular text-lg font-semibold", up ? "text-up" : "text-down")}>
              {formatPrice(last, d)}
            </span>
            {up ? (
              <ArrowUp className="size-4 text-up" />
            ) : (
              <ArrowDown className="size-4 text-down" />
            )}
            {book && book.asks[0] && book.bids[0] && (
              <span className="tabular ml-auto text-[11px] text-muted-foreground">
                Spread{" "}
                {formatNumber(((book.asks[0].px - book.bids[0].px) / book.asks[0].px) * 100, 3)}%
              </span>
            )}
          </div>
          {mode !== "asks" && (
            <div className="flex flex-col">
              {bids.length === 0 && <Skeleton rows={rowsEach} />}
              {bids.map((l) => (
                <Row
                  key={l.px}
                  l={l}
                  max={max}
                  side="bid"
                  decimals={stepDecimals}
                  onClick={() => onPrice(l.px)}
                />
              ))}
            </div>
          )}
          <div className="mt-auto flex items-center gap-2 px-3 py-2 text-[11px]">
            <span className="text-up">B {bidPct.toFixed(0)}%</span>
            <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-down">
              <div className="bg-up" style={{ width: `${bidPct}%` }} />
            </div>
            <span className="text-down">{(100 - bidPct).toFixed(0)}% S</span>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden text-xs">
          <div className="grid grid-cols-3 px-3 py-2 text-[11px] text-muted-foreground">
            <span>Price ({quote})</span>
            <span className="text-right">{sizeLabel ?? `Amount (${base})`}</span>
            <span className="text-right">Time</span>
          </div>
          {trades.length === 0 && <Skeleton rows={24} />}
          {trades.slice(0, 40).map((t) => (
            <button
              key={t.id}
              onClick={() => onPrice(t.px)}
              className="grid w-full grid-cols-3 px-3 py-[3px] text-left hover:bg-accent"
            >
              <span className={cn("tabular", t.side === "buy" ? "text-up" : "text-down")}>
                {formatPrice(t.px, d)}
              </span>
              <span className="tabular text-right">{formatNumber(t.sz, t.sz >= 100 ? 2 : 5)}</span>
              <span className="tabular text-right text-muted-foreground">{formatTime(t.ts)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({
  l,
  max,
  side,
  decimals,
  onClick,
}: {
  l: BookLevel & { total: number };
  max: number;
  side: "ask" | "bid";
  decimals: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative grid h-[22px] w-full grid-cols-3 items-center px-3 text-left hover:bg-accent"
    >
      <span
        className={cn(
          "absolute inset-y-0 right-0",
          side === "ask" ? "bg-down-muted" : "bg-up-muted",
        )}
        style={{ width: `${(l.total / max) * 100}%` }}
      />
      <span className={cn("tabular relative", side === "ask" ? "text-down" : "text-up")}>
        {l.px.toFixed(decimals)}
      </span>
      <span className="tabular relative text-right">
        {formatNumber(l.sz, l.sz >= 1000 ? 0 : l.sz >= 1 ? 3 : 5)}
      </span>
      <span className="tabular relative text-right text-muted-foreground">
        {formatNumber(l.total, l.total >= 1000 ? 0 : 3)}
      </span>
    </button>
  );
}

function Skeleton({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="mx-3 my-[5px] h-3 animate-pulse rounded bg-muted" />
      ))}
    </>
  );
}
