import { useState, useId } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { symbolFromSlug, coinSlug, coinName, coinMeta, FIAT } from "@/lib/coins";
import { candlesQuery, tickerQuery, type Bar } from "@/lib/market";
import { formatUsd, formatCompact } from "@/lib/format";
import { CoinIcon, PctChange } from "@/components/site/primitives";
import { usePrices } from "@/components/site/hooks";
import {
  Page,
  Section,
  Filters,
  Missing,
  meta,
  button,
  input,
  card,
} from "@/components/content/ui";
export const Route = createFileRoute("/price/$coin")({
  head: ({ params }) =>
    meta(
      `${coinName(symbolFromSlug(params.coin))} price today`,
      "Live cryptocurrency price, market data, conversion and trading information.",
    ),
  component: Price,
});
const ranges: Record<string, { bar: Bar; limit: number }> = {
  "1D": { bar: "15m", limit: 96 },
  "1W": { bar: "1H", limit: 168 },
  "1M": { bar: "4H", limit: 180 },
  "1Y": { bar: "1D", limit: 365 },
};
const supply: Record<string, number> = {
  BTC: 19850000,
  ETH: 120700000,
  SOL: 520000000,
  XRP: 58000000000,
  BNB: 145000000,
  DOGE: 149000000000,
  ADA: 36000000000,
  USDT: 150000000000,
};
function Price() {
  const { coin } = Route.useParams();
  const sym = symbolFromSlug(coin);
  return coinMeta(sym) ? <KnownPrice key={coin} sym={sym} /> : <Missing kind="Coin" />;
}
function KnownPrice({ sym }: { sym: string }) {
  const [range, setRange] = useState("1D");
  const [amount, setAmount] = useState("1");
  const [fiat, setFiat] = useState("USD");
  const id = useId().replace(/:/g, "");
  const prices = usePrices();
  const { data: t } = useQuery(tickerQuery(`${sym}-USDT`));
  const r = ranges[range]!;
  const { data: c } = useQuery(candlesQuery(`${sym}-USDT`, r.bar, r.limit));
  const px = t?.last ?? prices[sym] ?? coinMeta(sym)!.fallbackPrice;
  const f = FIAT.find((x) => x.code === fiat)!;
  return (
    <Page
      title={`${coinName(sym)} price`}
      subtitle={`Explore ${sym} market data and make your next move.`}
      eyebrow="Crypto prices"
    >
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <CoinIcon symbol={sym} size={54} />
          <div>
            <p className="tabular text-4xl font-bold tracking-tight">{formatUsd(px)}</p>
            <PctChange value={t?.change24h} />
            <span className="ml-2 text-sm text-muted-foreground">
              24h {t?.simulated ? "· Reference market data" : ""}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <Link className={button} to="/trade/$instId" params={{ instId: `${sym}-USDT` }}>
            Trade {sym}
          </Link>
          <Link className={button} to="/buy-crypto">
            Buy {sym}
          </Link>
        </div>
      </div>
      <div className={card}>
        <Filters items={Object.keys(ranges)} value={range} onChange={setRange} />
        <div className="mt-8 h-80" aria-label={`${range} price chart`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={c ?? []}>
              <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--foreground)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--foreground)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tickFormatter={(v) =>
                  new Date(Number(v) * 1000).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
                minTickGap={65}
                stroke="var(--muted-foreground)"
              />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
                labelFormatter={(v) => new Date(Number(v) * 1000).toLocaleString()}
                formatter={(v) => formatUsd(Number(v))}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke="var(--foreground)"
                fill={`url(#${id})`}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <Section title="Market overview">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {[
            [
              "Estimated market cap",
              supply[sym] ? formatCompact(supply[sym]! * px, "$") : "Not available",
            ],
            ["24h volume", formatCompact(t?.volQuote24h, "$")],
            ["24h high", formatUsd(t?.high24h)],
            ["24h low", formatUsd(t?.low24h)],
            [
              "Circulating supply",
              supply[sym] ? `${formatCompact(supply[sym])} ${sym}` : "Not available",
            ],
          ].map(([l, v]) => (
            <div key={l} className={card}>
              <p className="text-xs text-muted-foreground">{l}</p>
              <p className="tabular mt-3 font-semibold">{v}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Supply figures are illustrative static estimates, not audited live supply. Market cap uses
          this estimate and the current price.
        </p>
      </Section>
      <Section title={`${sym} converter`}>
        <div className={`${card} grid gap-4 md:grid-cols-3`}>
          <label>
            {sym}
            <input
              className={`${input} mt-2 tabular`}
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label>
            Fiat currency
            <select
              className={`${input} mt-2`}
              value={fiat}
              onChange={(e) => setFiat(e.target.value)}
            >
              {FIAT.map((x) => (
                <option key={x.code}>{x.code}</option>
              ))}
            </select>
          </label>
          <label>
            {fiat}
            <input
              className={`${input} mt-2 tabular`}
              type="number"
              min="0"
              value={
                Number.isFinite(Number(amount))
                  ? Number((Number(amount) * px * f.rate).toFixed(6))
                  : 0
              }
              onChange={(e) => setAmount(String(Number(e.target.value) / (px * f.rate)))}
            />
          </label>
          <p className="text-xs text-muted-foreground md:col-span-3">
            Indicative conversion only. Fiat rates are static estimates; fees and execution spreads
            are excluded.
          </p>
        </div>
      </Section>
      <Section title={`About ${coinName(sym)}`}>
        <p className="max-w-3xl leading-8 text-muted-foreground">
          {coinMeta(sym)?.description ??
            `${coinName(sym)} (${sym}) is a digital asset traded in cryptocurrency markets. Review its network documentation, token supply, security model and liquidity before deciding whether it fits your risk tolerance.`}
        </p>
      </Section>
      <Section title="Frequently asked questions">
        {[
          [
            "What determines the price?",
            "Price reflects supply and demand on exchanges. Liquidity, market sentiment and network activity can all affect it.",
          ],
          [
            `How do I buy ${sym}?`,
            "Use Buy crypto or open the spot trading pair. Review availability, fees and your order details before confirming.",
          ],
          [
            "Can I lose money?",
            "Yes. Digital assets are volatile and can lose substantial or all value. Past performance does not predict future results.",
          ],
        ].map(([q, a]) => (
          <details className={card} key={q}>
            <summary className="cursor-pointer font-semibold">{q}</summary>
            <p className="mt-4 leading-7 text-muted-foreground">{a}</p>
          </details>
        ))}
      </Section>
      <Section title="Other popular coins">
        <div className="grid gap-4 sm:grid-cols-3">
          {["BTC", "ETH", "SOL", "XRP", "DOGE", "ADA"]
            .filter((s) => s !== sym)
            .map((s) => (
              <Link
                className={`${card} flex items-center gap-3 hover:bg-accent`}
                key={s}
                to="/price/$coin"
                params={{ coin: coinSlug(s) }}
              >
                <CoinIcon symbol={s} />
                <div>
                  {coinName(s)}
                  <p className="tabular text-sm text-muted-foreground">
                    {formatUsd(prices[s] ?? coinMeta(s)?.fallbackPrice)}
                  </p>
                </div>
              </Link>
            ))}
        </div>
      </Section>
    </Page>
  );
}
