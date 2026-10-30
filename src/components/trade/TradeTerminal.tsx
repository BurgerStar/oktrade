import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { checkLiquidations, matchOrders } from "@/lib/account";
import { fundingQuery, useLiveMarket } from "@/lib/market";
import { formatPrice } from "@/lib/format";
import { getAccount, update } from "@/lib/store";
import { Stat } from "@/components/site/primitives";
import { cn } from "@/lib/utils";
import { PairHeader } from "./PairHeader";
import { PriceChart } from "./PriceChart";
import { BookAndTrades } from "./OrderBook";
import { SpotOrderForm } from "./SpotOrderForm";
import { FuturesOrderForm } from "./FuturesOrderForm";
import { OrdersPanel } from "./OrdersPanel";

export function TradeTerminal({ instId, kind }: { instId: string; kind: "spot" | "futures" }) {
  const { ticker, book, trades, connected } = useLiveMarket(instId);
  const [base = "", quote = "USDT"] = instId.split("-");
  const [preset, setPreset] = useState<{ px: number; n: number }>();
  const [mobileTab, setMobileTab] = useState<"chart" | "book" | "trade">("chart");
  const prevLast = useRef<number | undefined>(undefined);
  const [prev, setPrev] = useState<number>();
  const last = ticker?.last;

  useEffect(() => {
    setPrev(prevLast.current);
    prevLast.current = last;
  }, [last]);

  // Live title like real exchanges.
  useEffect(() => {
    if (last)
      document.title = `${formatPrice(last)} | ${base}${quote}${kind === "futures" ? " Perp" : ""} | OK Trade`;
  }, [last, base, quote, kind]);

  // Match resting orders / check liquidations on each tick.
  useEffect(() => {
    if (!last) return;
    const acct = getAccount();
    if (!acct) return;
    if (kind === "spot" && acct.orders.some((o) => o.status === "open" && o.instId === instId))
      update((s) => matchOrders(s, instId, last));
    if (kind === "futures" && acct.positions.some((p) => p.instId === instId))
      update((s) => checkLiquidations(s, instId, last));
  }, [last, instId, kind]);

  const onPrice = (px: number) => {
    setPreset({ px, n: Date.now() });
    setMobileTab("trade");
  };

  return (
    <div className="flex flex-col">
      <PairHeader
        instId={instId}
        ticker={ticker}
        kind={kind}
        extra={kind === "futures" ? <FundingStats instId={instId} mark={last} /> : undefined}
      />
      <div className="flex border-b border-border lg:hidden">
        {(["chart", "book", "trade"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setMobileTab(t)}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium capitalize",
              mobileTab === t ? "border-b-2 border-foreground" : "text-muted-foreground",
            )}
          >
            {t === "book" ? "Order book" : t}
          </button>
        ))}
      </div>
      <div className="grid lg:h-[640px] lg:grid-cols-[minmax(0,1fr)_300px_330px]">
        <div
          className={cn(
            "h-[480px] border-b border-border lg:h-auto lg:border-b-0 lg:border-r",
            mobileTab !== "chart" && "hidden lg:block",
          )}
        >
          <PriceChart instId={instId} lastPrice={last} book={book} />
        </div>
        <div
          className={cn(
            "min-h-[560px] overflow-hidden border-b border-border lg:min-h-0 lg:border-b-0 lg:border-r",
            mobileTab !== "book" && "hidden lg:block",
          )}
        >
          <BookAndTrades
            book={book}
            trades={trades}
            last={last}
            prevLast={prev}
            base={base}
            quote={quote}
            sizeLabel={kind === "futures" ? "Size (Cont)" : undefined}
            onPrice={onPrice}
          />
        </div>
        <div
          className={cn(
            "overflow-y-auto scrollbar-thin",
            mobileTab !== "trade" && "hidden lg:block",
          )}
        >
          {kind === "spot" ? (
            <SpotOrderForm instId={instId} last={last} presetPrice={preset} />
          ) : (
            <FuturesOrderForm instId={instId} mark={last} />
          )}
        </div>
      </div>
      <div className="h-[340px] border-t border-border">
        <OrdersPanel instId={instId} kind={kind} mark={last} />
      </div>
      <div className="flex items-center gap-2 border-t border-border px-4 py-1.5 text-[11px] text-muted-foreground">
        <span
          className={cn("size-1.5 rounded-full", connected ? "bg-up" : "bg-muted-foreground")}
        />
        {connected ? "Live stream connected" : "Live data (polling)"}
        <span className="ml-auto opacity-70">Balances</span>
      </div>
    </div>
  );
}

function FundingStats({ instId, mark }: { instId: string; mark?: number | undefined }) {
  const { data } = useQuery(fundingQuery(instId));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, (data?.nextFundingTime ?? now) - now);
  const hh = String(Math.floor(left / 3600000)).padStart(2, "0");
  const mm = String(Math.floor((left % 3600000) / 60000)).padStart(2, "0");
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
  return (
    <>
      <Stat className="shrink-0" label="Mark price" value={formatPrice(mark)} />
      <Stat
        className="shrink-0"
        label="Funding / Countdown"
        value={
          <span>
            <span className={(data?.fundingRate ?? 0) >= 0 ? "text-up" : "text-down"}>
              {((data?.fundingRate ?? 0) * 100).toFixed(4)}%
            </span>{" "}
            / {hh}:{mm}:{ss}
          </span>
        }
      />
    </>
  );
}
