import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import { BAR_SECONDS, candlesQuery, type Bar, type Candle, type OrderBook } from "@/lib/market";
import { priceDecimals } from "@/lib/format";
import { usePrefs } from "@/lib/store";
import { cn } from "@/lib/utils";
import { DepthChart } from "./DepthChart";

const BARS: Bar[] = ["1m", "5m", "15m", "1H", "4H", "1D", "1W"];

/** Resolve a CSS custom property (oklch etc.) into an rgba() string the chart lib understands. */
function cssColor(varName: string, alpha = 1): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || "#888";
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d");
  if (!ctx) return raw;
  ctx.fillStyle = raw;
  ctx.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0, a = 255] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgba(${r},${g},${b},${((a / 255) * alpha).toFixed(3)})`;
}

export function PriceChart({
  instId,
  lastPrice,
  book,
}: {
  instId: string;
  lastPrice?: number | undefined;
  book: OrderBook | null;
}) {
  const [bar, setBar] = useState<Bar>("15m");
  const [view, setView] = useState<"candles" | "line" | "depth">("candles");
  const { theme } = usePrefs();
  const { data: candles } = useQuery(candlesQuery(instId, bar));
  const el = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lineRef = useRef<ISeriesApi<"Area"> | null>(null);
  const volRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const lastBar = useRef<Candle | null>(null);
  const [hover, setHover] = useState<Candle | null>(null);

  // Create chart (client only).
  useEffect(() => {
    if (view === "depth" || !el.current) return;
    let disposed = false;
    let chart: IChartApi | null = null;
    import("lightweight-charts").then(
      ({
        createChart,
        CandlestickSeries,
        HistogramSeries,
        AreaSeries,
        ColorType,
        CrosshairMode,
      }) => {
        if (disposed || !el.current) return;
        const fg = cssColor("--muted-foreground");
        const border = cssColor("--border");
        const up = cssColor("--up");
        const down = cssColor("--down");
        chart = createChart(el.current, {
          autoSize: true,
          layout: {
            background: { type: ColorType.Solid, color: "transparent" },
            textColor: fg,
            fontFamily: "Geist Mono, monospace",
            fontSize: 11,
            attributionLogo: false,
          },
          grid: { vertLines: { color: border }, horzLines: { color: border } },
          rightPriceScale: { borderColor: border },
          timeScale: { borderColor: border, timeVisible: true, secondsVisible: false },
          crosshair: { mode: CrosshairMode.Normal },
        });
        chartRef.current = chart;
        if (view === "candles") {
          candleRef.current = chart.addSeries(CandlestickSeries, {
            upColor: up,
            downColor: down,
            borderVisible: false,
            wickUpColor: up,
            wickDownColor: down,
          });
        } else {
          const fgc = cssColor("--foreground");
          lineRef.current = chart.addSeries(AreaSeries, {
            lineColor: fgc,
            topColor: cssColor("--foreground", 0.25),
            bottomColor: cssColor("--foreground", 0),
            lineWidth: 2,
          });
        }
        volRef.current = chart.addSeries(HistogramSeries, {
          priceFormat: { type: "volume" },
          priceScaleId: "vol",
          lastValueVisible: false,
          priceLineVisible: false,
        });
        chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
        chart.subscribeCrosshairMove((p) => {
          const s = candleRef.current ?? lineRef.current;
          if (!p.time || !s) return setHover(null);
          const d = p.seriesData.get(s) as
            | { open?: number; high?: number; low?: number; close?: number; value?: number }
            | undefined;
          if (!d) return setHover(null);
          setHover({
            time: p.time as number,
            open: d.open ?? d.value ?? 0,
            high: d.high ?? d.value ?? 0,
            low: d.low ?? d.value ?? 0,
            close: d.close ?? d.value ?? 0,
            volume: 0,
          });
        });
        // Push data if already loaded.
        setData(candlesRef.current);
      },
    );
    return () => {
      disposed = true;
      chart?.remove();
      chartRef.current = null;
      candleRef.current = null;
      lineRef.current = null;
      volRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, theme, instId]);

  const candlesRef = useRef<Candle[] | undefined>(undefined);
  candlesRef.current = candles;

  function setData(list: Candle[] | undefined) {
    if (!list?.length) return;
    const up = cssColor("--up", 0.5);
    const down = cssColor("--down", 0.5);
    const lastC = list[list.length - 1]!;
    const d = priceDecimals(lastC.close);
    const fmt = { type: "price" as const, precision: d, minMove: Math.pow(10, -d) };
    candleRef.current?.applyOptions({ priceFormat: fmt });
    lineRef.current?.applyOptions({ priceFormat: fmt });
    candleRef.current?.setData(
      list.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );
    lineRef.current?.setData(list.map((c) => ({ time: c.time as UTCTimestamp, value: c.close })));
    volRef.current?.setData(
      list.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume,
        color: c.close >= c.open ? up : down,
      })),
    );
    lastBar.current = { ...lastC };
    chartRef.current?.timeScale().scrollToRealTime();
  }

  useEffect(() => {
    setData(candles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles]);

  // Live-update the last candle from the streaming price.
  useEffect(() => {
    if (!lastPrice || !lastBar.current) return;
    const step = BAR_SECONDS[bar];
    const now = Math.floor(Date.now() / 1000 / step) * step;
    let b = lastBar.current;
    if (now > b.time)
      b = {
        time: now,
        open: b.close,
        high: lastPrice,
        low: lastPrice,
        close: lastPrice,
        volume: 0,
      };
    else
      b = {
        ...b,
        close: lastPrice,
        high: Math.max(b.high, lastPrice),
        low: Math.min(b.low, lastPrice),
      };
    lastBar.current = b;
    const t = b.time as UTCTimestamp;
    candleRef.current?.update({ time: t, open: b.open, high: b.high, low: b.low, close: b.close });
    lineRef.current?.update({ time: t, value: b.close });
  }, [lastPrice, bar]);

  const info = hover ?? lastBar.current;

  return (
    <div className="flex h-full min-h-[420px] flex-col">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-3 py-1.5 text-xs">
        <div className="flex items-center gap-0.5">
          {BARS.map((b) => (
            <button
              key={b}
              onClick={() => setBar(b)}
              className={cn(
                "rounded px-2 py-1",
                bar === b
                  ? "bg-accent font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {b}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-0.5">
          {(["candles", "line", "depth"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded px-2 py-1 capitalize",
                view === v
                  ? "bg-accent font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v === "candles" ? "Candles" : v === "line" ? "Line" : "Depth"}
            </button>
          ))}
        </div>
      </div>
      {view !== "depth" && info && (
        <div className="tabular flex flex-wrap gap-x-3 px-3 pt-2 text-[11px] text-muted-foreground">
          <span>
            O <span className="text-foreground">{info.open.toFixed(priceDecimals(info.open))}</span>
          </span>
          <span>
            H <span className="text-foreground">{info.high.toFixed(priceDecimals(info.high))}</span>
          </span>
          <span>
            L <span className="text-foreground">{info.low.toFixed(priceDecimals(info.low))}</span>
          </span>
          <span>
            C{" "}
            <span className={info.close >= info.open ? "text-up" : "text-down"}>
              {info.close.toFixed(priceDecimals(info.close))}
            </span>
          </span>
        </div>
      )}
      <div className="relative flex-1">
        {view === "depth" ? (
          <DepthChart book={book} />
        ) : (
          <div ref={el} className="absolute inset-0" />
        )}
        {view !== "depth" && !candles && (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
            Loading chart…
          </div>
        )}
      </div>
    </div>
  );
}
