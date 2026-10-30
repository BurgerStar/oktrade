/** Number formatting helpers shared across the exchange UI. */

export function priceDecimals(n: number): number {
  const a = Math.abs(n);
  if (!isFinite(a) || a === 0) return 2;
  if (a >= 1000) return 2;
  if (a >= 100) return 2;
  if (a >= 1) return 4;
  if (a >= 0.01) return 5;
  if (a >= 0.0001) return 6;
  return 8;
}

export function formatPrice(n: number | undefined | null, decimals?: number): string {
  if (n == null || !isFinite(n)) return "--";
  const d = decimals ?? priceDecimals(n);
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function formatNumber(n: number | undefined | null, decimals = 2): string {
  if (n == null || !isFinite(n)) return "--";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCompact(n: number | undefined | null, prefix = ""): string {
  if (n == null || !isFinite(n)) return "--";
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (a >= 1e12) return `${sign}${prefix}${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${sign}${prefix}${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${sign}${prefix}${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${sign}${prefix}${(a / 1e3).toFixed(2)}K`;
  return `${sign}${prefix}${a.toFixed(2)}`;
}

export function formatUsd(n: number | undefined | null): string {
  if (n == null || !isFinite(n)) return "--";
  return `$${formatPrice(n, n >= 1 ? 2 : priceDecimals(n))}`;
}

export function formatPct(n: number | undefined | null, withSign = true): string {
  if (n == null || !isFinite(n)) return "--";
  const s = withSign && n > 0 ? "+" : "";
  return `${s}${n.toFixed(2)}%`;
}

export function formatAmount(n: number | undefined | null, ccy?: string): string {
  if (n == null || !isFinite(n)) return "--";
  const a = Math.abs(n);
  const d = a === 0 ? 2 : a >= 1000 ? 2 : a >= 1 ? 4 : 8;
  const s = n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: d });
  return ccy ? `${s} ${ccy}` : s;
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return `${d.toLocaleDateString("en-CA")} ${d.toLocaleTimeString("en-GB", { hour12: false })}`;
}

export function shortId(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}
