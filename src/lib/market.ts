/**
 * Live market data from the public OKX v5 REST + WebSocket API.
 * Every fetcher falls back to locally simulated data so the UI never
 * breaks when the API is unreachable (offline, geo-blocked, rate limited).
 */
import { queryOptions } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { COINS, coinMeta } from "./coins";

const API = "https://www.okx.com/api/v5";
const WS_PUBLIC = "wss://ws.okx.com:8443/ws/v5/public";

export type InstType = "SPOT" | "SWAP";

export interface Ticker {
  instId: string;
  instType: InstType;
  base: string;
  quote: string;
  last: number;
  open24h: number;
  high24h: number;
  low24h: number;
  /** Base-currency volume. */
  vol24h: number;
  /** Quote-currency volume (≈ USD for USDT pairs). */
  volQuote24h: number;
  change24h: number;
  bid: number;
  ask: number;
  ts: number;
  simulated?: boolean;
}

export interface Candle {
  time: number; // seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BookLevel {
  px: number;
  sz: number;
}
export interface OrderBook {
  asks: BookLevel[]; // ascending price
  bids: BookLevel[]; // descending price
  ts: number;
}

export interface Trade {
  id: string;
  px: number;
  sz: number;
  side: "buy" | "sell";
  ts: number;
}

export type Bar = "1m" | "5m" | "15m" | "1H" | "4H" | "1D" | "1W";
export const BAR_SECONDS: Record<Bar, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1H": 3600,
  "4H": 14400,
  "1D": 86400,
  "1W": 604800,
};

async function getJson<T>(path: string): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${API}${path}`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { code: string; data: T; msg?: string };
    if (json.code !== "0") throw new Error(json.msg || `OKX code ${json.code}`);
    return json.data;
  } finally {
    clearTimeout(t);
  }
}

export function splitInstId(instId: string): { base: string; quote: string } {
  const [base = "", quote = "USDT"] = instId.split("-");
  return { base, quote };
}

/* ----------------------------- simulation ----------------------------- */

function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h) + 1;
}

function simulatedPrice(base: string): number {
  const meta = coinMeta(base);
  const p = meta?.fallbackPrice ?? 1;
  const wobble = Math.sin(Date.now() / 60000 + hash(base)) * 0.004;
  return p * (1 + wobble);
}

function simulatedTickers(instType: InstType): Ticker[] {
  return COINS.filter((c) => c.symbol !== "USDT").map((c) => {
    const rnd = seeded(hash(c.symbol) + Math.floor(Date.now() / 86400000));
    const last = simulatedPrice(c.symbol);
    const change = (rnd() - 0.45) * 14;
    const open = last / (1 + change / 100);
    const vol = (rnd() * 900 + 20) * 1e6 * (c.symbol === "BTC" ? 8 : c.symbol === "ETH" ? 5 : 1);
    return {
      instId: instType === "SWAP" ? `${c.symbol}-USDT-SWAP` : `${c.symbol}-USDT`,
      instType,
      base: c.symbol,
      quote: "USDT",
      last,
      open24h: open,
      high24h: Math.max(open, last) * (1 + rnd() * 0.03),
      low24h: Math.min(open, last) * (1 - rnd() * 0.03),
      vol24h: vol / last,
      volQuote24h: vol,
      change24h: change,
      bid: last * 0.9999,
      ask: last * 1.0001,
      ts: Date.now(),
      simulated: true,
    };
  });
}

export function simulatedCandles(instId: string, bar: Bar, limit = 300): Candle[] {
  const { base } = splitInstId(instId);
  const step = BAR_SECONDS[bar];
  const now = Math.floor(Date.now() / 1000 / step) * step;
  const rnd = seeded(hash(instId + bar));
  const vol = step >= 86400 ? 0.035 : step >= 3600 ? 0.008 : 0.002;
  let price = simulatedPrice(base);
  const out: Candle[] = [];
  for (let i = 0; i < limit; i++) {
    const close = price;
    const open = close / (1 + (rnd() - 0.5) * vol * 2);
    const high = Math.max(open, close) * (1 + rnd() * vol);
    const low = Math.min(open, close) * (1 - rnd() * vol);
    out.push({ time: now - i * step, open, high, low, close, volume: rnd() * 500 + 20 });
    price = open;
  }
  return out.reverse();
}

export function simulatedBook(mid: number, depth = 20): OrderBook {
  const tick = mid * 0.00005;
  const asks: BookLevel[] = [];
  const bids: BookLevel[] = [];
  for (let i = 1; i <= depth; i++) {
    asks.push({ px: mid + tick * i, sz: Math.random() * 3 * (1 + i / 5) });
    bids.push({ px: mid - tick * i, sz: Math.random() * 3 * (1 + i / 5) });
  }
  return { asks, bids, ts: Date.now() };
}

/* ------------------------------- REST ---------------------------------- */

type Lvl = [string, string, ...string[]];

type RawTicker = {
  instId: string;
  last: string;
  open24h: string;
  high24h: string;
  low24h: string;
  vol24h: string;
  volCcy24h: string;
  bidPx: string;
  askPx: string;
  ts: string;
};

function mapTicker(r: RawTicker, instType: InstType): Ticker {
  const { base, quote } = splitInstId(r.instId);
  const last = +r.last;
  const open = +r.open24h;
  // For SWAP, volCcy24h is in base currency; approximate quote volume.
  const volQuote = instType === "SWAP" ? +r.volCcy24h * last : +r.volCcy24h;
  return {
    instId: r.instId,
    instType,
    base,
    quote,
    last,
    open24h: open,
    high24h: +r.high24h,
    low24h: +r.low24h,
    vol24h: instType === "SWAP" ? +r.volCcy24h : +r.vol24h,
    volQuote24h: volQuote,
    change24h: open ? ((last - open) / open) * 100 : 0,
    bid: +r.bidPx,
    ask: +r.askPx,
    ts: +r.ts,
  };
}

export async function fetchTickers(instType: InstType): Promise<Ticker[]> {
  try {
    const raw = await getJson<RawTicker[]>(`/market/tickers?instType=${instType}`);
    return raw
      .map((r) => mapTicker(r, instType))
      .filter((t) => (instType === "SWAP" ? t.instId.endsWith("-USDT-SWAP") : t.quote === "USDT"))
      .filter((t) => t.last > 0)
      .sort((a, b) => b.volQuote24h - a.volQuote24h);
  } catch {
    return simulatedTickers(instType);
  }
}

export async function fetchTicker(instId: string): Promise<Ticker> {
  const instType: InstType = instId.endsWith("-SWAP") ? "SWAP" : "SPOT";
  try {
    const [raw] = await getJson<RawTicker[]>(`/market/ticker?instId=${instId}`);
    if (!raw) throw new Error("empty");
    return mapTicker(raw, instType);
  } catch {
    const { base } = splitInstId(instId);
    const t = simulatedTickers(instType).find((x) => x.base === base);
    if (t) return t;
    return simulatedTickers(instType)[0]!;
  }
}

export async function fetchCandles(instId: string, bar: Bar, limit = 300): Promise<Candle[]> {
  try {
    const raw = await getJson<[string, string, string, string, string, string, ...string[]][]>(
      `/market/candles?instId=${instId}&bar=${bar}&limit=${limit}`,
    );
    if (!raw.length) throw new Error("empty");
    return raw
      .map((r) => ({
        time: Math.floor(+r[0] / 1000),
        open: +r[1],
        high: +r[2],
        low: +r[3],
        close: +r[4],
        volume: +r[5],
      }))
      .reverse();
  } catch {
    return simulatedCandles(instId, bar, limit);
  }
}

export async function fetchBook(instId: string, sz = 25): Promise<OrderBook> {
  try {
    const [raw] = await getJson<{ asks: Lvl[]; bids: Lvl[]; ts: string }[]>(
      `/market/books?instId=${instId}&sz=${sz}`,
    );
    if (!raw) throw new Error("empty");
    return {
      asks: raw.asks.map((a) => ({ px: +a[0], sz: +a[1] })),
      bids: raw.bids.map((b) => ({ px: +b[0], sz: +b[1] })),
      ts: +raw.ts,
    };
  } catch {
    const t = await fetchTicker(instId);
    return simulatedBook(t.last, sz);
  }
}

export async function fetchTrades(instId: string, limit = 50): Promise<Trade[]> {
  try {
    const raw = await getJson<
      { tradeId: string; px: string; sz: string; side: "buy" | "sell"; ts: string }[]
    >(`/market/trades?instId=${instId}&limit=${limit}`);
    return raw.map((r) => ({ id: r.tradeId, px: +r.px, sz: +r.sz, side: r.side, ts: +r.ts }));
  } catch {
    const t = await fetchTicker(instId);
    return Array.from({ length: limit }, (_, i) => ({
      id: `sim-${i}`,
      px: t.last * (1 + (Math.random() - 0.5) * 0.0006),
      sz: Math.random() * 0.8,
      side: Math.random() > 0.5 ? "buy" : "sell",
      ts: Date.now() - i * 1500,
    }));
  }
}

export interface FundingInfo {
  fundingRate: number;
  nextFundingTime: number;
}
export async function fetchFunding(instId: string): Promise<FundingInfo> {
  try {
    const [raw] = await getJson<{ fundingRate: string; fundingTime: string }[]>(
      `/public/funding-rate?instId=${instId}`,
    );
    if (!raw) throw new Error("empty");
    return { fundingRate: +raw.fundingRate, nextFundingTime: +raw.fundingTime };
  } catch {
    const next = Math.ceil(Date.now() / 28800000) * 28800000;
    return { fundingRate: 0.0001, nextFundingTime: next };
  }
}

/* --------------------------- query options ----------------------------- */

export const tickersQuery = (instType: InstType = "SPOT") =>
  queryOptions({
    queryKey: ["tickers", instType],
    queryFn: () => fetchTickers(instType),
    refetchInterval: 5000,
    staleTime: 3000,
  });

export const tickerQuery = (instId: string) =>
  queryOptions({
    queryKey: ["ticker", instId],
    queryFn: () => fetchTicker(instId),
    refetchInterval: 3000,
    staleTime: 1500,
  });

export const candlesQuery = (instId: string, bar: Bar, limit = 300) =>
  queryOptions({
    queryKey: ["candles", instId, bar, limit],
    queryFn: () => fetchCandles(instId, bar, limit),
    staleTime: 30_000,
  });

export const fundingQuery = (instId: string) =>
  queryOptions({
    queryKey: ["funding", instId],
    queryFn: () => fetchFunding(instId),
    refetchInterval: 60_000,
  });

/** Map of base symbol → USDT price, from spot tickers. */
export function priceMap(tickers: Ticker[] | undefined): Record<string, number> {
  const m: Record<string, number> = { USDT: 1, USDC: 1, USD: 1 };
  tickers?.forEach((t) => {
    if (t.quote === "USDT") m[t.base] = t.last;
  });
  return m;
}

/* ----------------------------- WebSocket ------------------------------- */

export interface LiveMarket {
  ticker: Ticker | null;
  book: OrderBook | null;
  trades: Trade[];
  connected: boolean;
}

/**
 * Streams ticker, full order book (incremental) and trades for one instrument.
 * Falls back to REST polling (and then simulation) if the socket can't connect.
 */
export function useLiveMarket(instId: string): LiveMarket {
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [book, setBook] = useState<OrderBook | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [connected, setConnected] = useState(false);
  const bookRef = useRef<{ asks: Map<number, number>; bids: Map<number, number> }>({
    asks: new Map(),
    bids: new Map(),
  });

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let ping: ReturnType<typeof setInterval> | null = null;
    let flush: ReturnType<typeof setInterval> | null = null;
    let dirty = false;
    const instType: InstType = instId.endsWith("-SWAP") ? "SWAP" : "SPOT";

    setTicker(null);
    setBook(null);
    setTrades([]);
    bookRef.current = { asks: new Map(), bids: new Map() };

    // Seed with REST immediately so the screen fills in fast.
    fetchTicker(instId).then((t) => !cancelled && setTicker((cur) => cur ?? t));
    fetchBook(instId, 25).then((b) => !cancelled && setBook((cur) => cur ?? b));
    fetchTrades(instId, 50).then((tr) => !cancelled && setTrades((cur) => (cur.length ? cur : tr)));

    const startPolling = () => {
      if (poll || cancelled) return;
      setConnected(false);
      poll = setInterval(async () => {
        const [t, b, tr] = await Promise.all([
          fetchTicker(instId),
          fetchBook(instId, 25),
          fetchTrades(instId, 50),
        ]);
        if (cancelled) return;
        setTicker(t);
        setBook(b);
        setTrades(tr);
      }, 2000);
    };

    const emitBook = () => {
      if (!dirty) return;
      dirty = false;
      const asks = [...bookRef.current.asks.entries()]
        .sort((a, b) => a[0] - b[0])
        .slice(0, 50)
        .map(([px, sz]) => ({ px, sz }));
      const bids = [...bookRef.current.bids.entries()]
        .sort((a, b) => b[0] - a[0])
        .slice(0, 50)
        .map(([px, sz]) => ({ px, sz }));
      setBook({ asks, bids, ts: Date.now() });
    };

    try {
      ws = new WebSocket(WS_PUBLIC);
      const failTimer = setTimeout(() => {
        if (ws && ws.readyState !== WebSocket.OPEN) {
          ws.close();
          startPolling();
        }
      }, 6000);
      ws.onopen = () => {
        clearTimeout(failTimer);
        if (cancelled) return;
        setConnected(true);
        ws?.send(
          JSON.stringify({
            op: "subscribe",
            args: [
              { channel: "tickers", instId },
              { channel: "books", instId },
              { channel: "trades", instId },
            ],
          }),
        );
        ping = setInterval(() => ws?.readyState === WebSocket.OPEN && ws.send("ping"), 20000);
        flush = setInterval(emitBook, 200);
      };
      ws.onmessage = (ev) => {
        if (cancelled || ev.data === "pong") return;
        let msg: { arg?: { channel: string }; action?: string; data?: unknown[] };
        try {
          msg = JSON.parse(ev.data as string);
        } catch {
          return;
        }
        if (!msg.arg || !msg.data) return;
        const ch = msg.arg.channel;
        if (ch === "tickers") {
          setTicker(mapTicker(msg.data[0] as RawTicker, instType));
        } else if (ch === "books") {
          const d = msg.data[0] as { asks: Lvl[]; bids: Lvl[] };
          if (msg.action === "snapshot") bookRef.current = { asks: new Map(), bids: new Map() };
          for (const [px, sz] of d.asks) {
            if (+sz === 0) bookRef.current.asks.delete(+px);
            else bookRef.current.asks.set(+px, +sz);
          }
          for (const [px, sz] of d.bids) {
            if (+sz === 0) bookRef.current.bids.delete(+px);
            else bookRef.current.bids.set(+px, +sz);
          }
          dirty = true;
        } else if (ch === "trades") {
          const rows = (
            msg.data as {
              tradeId: string;
              px: string;
              sz: string;
              side: "buy" | "sell";
              ts: string;
            }[]
          ).map((r) => ({ id: r.tradeId, px: +r.px, sz: +r.sz, side: r.side, ts: +r.ts }));
          setTrades((cur) => [...rows, ...cur].slice(0, 60));
        }
      };
      ws.onerror = () => startPolling();
      ws.onclose = () => {
        if (!cancelled) startPolling();
      };
    } catch {
      startPolling();
    }

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      if (ping) clearInterval(ping);
      if (flush) clearInterval(flush);
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      }
    };
  }, [instId]);

  return { ticker, book, trades, connected };
}
