import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bot as BotIcon } from "lucide-react";
import { createBot, stopBot, type Bot } from "@/lib/account";
import { useAccount } from "@/lib/store";
import { useAction, usePrices, useAuthGuard } from "@/components/site/hooks";
import {
  Page,
  Select,
  Field,
  Modal,
  Heading,
  Metric,
  Empty,
  primary,
  secondary,
  input,
  card,
  fmt,
  duration,
  useClock,
  metadata,
} from "@/components/investing/ui";
export const Route = createFileRoute("/trading-bots")({
  head: () =>
    metadata(
      "Trading Bots",
      "Build systematic crypto strategies with spot grids, DCA and recurring buys.",
    ),
  component: Bots,
});
const types: { kind: Bot["kind"]; name: string; description: string }[] = [
  {
    kind: "spot-grid",
    name: "Spot grid",
    description: "Buy low and sell high across a defined price range.",
  },
  {
    kind: "futures-grid",
    name: "Futures grid",
    description: "Trade a price range with directional exposure and leverage.",
  },
  {
    kind: "dca",
    name: "Spot DCA (Martingale)",
    description: "Average entries with safety orders and a take-profit target.",
  },
  {
    kind: "recurring",
    name: "Recurring buy",
    description: "Build a portfolio with scheduled, weighted investments.",
  },
  {
    kind: "arbitrage",
    name: "Arbitrage",
    description: "Explore spot and futures funding-rate spreads.",
  },
];
function Bots() {
  const a = useAccount(),
    act = useAction(),
    guard = useAuthGuard(),
    prices = usePrices(),
    now = useClock();
  const [kind, setKind] = useState<Bot["kind"] | null>(null),
    [pair, setPair] = useState("BTC-USDT"),
    [lower, setLower] = useState(""),
    [upper, setUpper] = useState(""),
    [grids, setGrids] = useState("20"),
    [investment, setInvestment] = useState("100"),
    [mode, setMode] = useState("Arithmetic"),
    [direction, setDirection] = useState("Neutral"),
    [leverage, setLeverage] = useState("3"),
    [step, setStep] = useState("2"),
    [tp, setTp] = useState("3"),
    [orders, setOrders] = useState("5"),
    [frequency, setFrequency] = useState("Weekly"),
    [allocation, setAllocation] = useState("60");
  function open(k: Bot["kind"], p = "BTC-USDT") {
    if (!guard()) return;
    setKind(k);
    setPair(p);
    const price = prices[p.split("-")[0]!] ?? 1;
    setLower(String(Number((price * 0.9).toPrecision(7))));
    setUpper(String(Number((price * 1.1).toPrecision(7))));
    setInvestment("100");
  }
  const gridProfit =
    mode === "Geometric"
      ? (Math.pow(Number(upper) / Number(lower), 1 / Number(grids)) - 1) * 100
      : ((Number(upper) - Number(lower)) / Number(grids) / ((Number(upper) + Number(lower)) / 2)) *
        100;
  const valid =
    Number.isFinite(Number(investment)) &&
    Number(investment) >= 10 &&
    (!(kind === "spot-grid" || kind === "futures-grid") ||
      (Number(lower) > 0 &&
        Number(upper) > Number(lower) &&
        Number.isInteger(Number(grids)) &&
        Number(grids) >= 2 &&
        Number(grids) <= 200)) &&
    (kind !== "futures-grid" ||
      (Number(leverage) >= 1 && Number(leverage) <= 20 && Number.isInteger(Number(leverage)))) &&
    (kind !== "dca" ||
      (Number(step) > 0 &&
        Number(step) <= 50 &&
        Number(tp) > 0 &&
        Number(tp) <= 100 &&
        Number(orders) >= 1 &&
        Number(orders) <= 20 &&
        Number.isInteger(Number(orders)))) &&
    (kind !== "recurring" || (Number(allocation) > 0 && Number(allocation) < 100));
  return (
    <Page
      title="Your strategy. On autopilot."
      description="Turn a trading idea into a systematic approach. Configure, launch and track your bots in one place."
    >
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {types.map((t) => (
          <article key={t.kind} className={`${card} flex flex-col items-start`}>
            <BotIcon className="mb-6 size-8" />
            <h2 className="text-xl font-semibold">{t.name}</h2>
            <p className="mb-7 mt-3 flex-1 text-sm leading-6 text-muted-foreground">
              {t.description}
            </p>
            <button className={primary} onClick={() => open(t.kind)}>
              Create bot
            </button>
          </article>
        ))}
      </div>
      <section>
        <Heading>Popular strategies</Heading>
        <div className="grid gap-5 md:grid-cols-3">
          {["BTC-USDT", "ETH-USDT", "SOL-USDT"].map((p, i) => (
            <div className={card} key={p}>
              <h3 className="font-semibold">{p} · Spot grid</h3>
              <div className="my-6 text-up">
                <Metric label="7D annualized yield · sample" value={`+${fmt(38.2 + i * 13.7)}%`} />
              </div>
              <p className="mb-5 text-sm text-muted-foreground">
                Runtime {12 + i * 7} days · 20 grids · Balanced
              </p>
              <button className={secondary} onClick={() => open("spot-grid", p)}>
                Copy strategy
              </button>
            </div>
          ))}
        </div>
      </section>
      <section>
        <Heading>My bots</Heading>
        {!a?.bots.length ? (
          <Empty text="Launch your first trading bot" />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {a.bots.map((b) => {
              const elapsed = Math.max(0, now - b.startedAt);
              const pnl = b.investment * 0.18 * Math.min(1, elapsed / (365 * 86400000));
              return (
                <div key={b.id} className={`${card} space-y-5`}>
                  <h3 className="font-semibold">
                    {types.find((t) => t.kind === b.kind)?.name} · {b.instId}
                  </h3>
                  <div className="grid grid-cols-2">
                    <Metric label="Investment" value={`${fmt(b.investment)} USDT`} />
                    <div className="text-up">
                      <Metric label="PnL" value={`+${fmt(pnl, 6)} USDT`} />
                    </div>
                  </div>
                  <p className="tabular text-sm text-muted-foreground">
                    Runtime {duration(elapsed)}
                  </p>
                  <button className={secondary} onClick={() => act((s) => stopBot(s, b.id, pnl))}>
                    Stop & settle
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <Modal
        title={`Create ${types.find((t) => t.kind === kind)?.name ?? "bot"}`}
        open={!!kind}
        onClose={() => setKind(null)}
      >
        <Select
          label={kind === "recurring" ? "Primary coin / secondary ETH" : "Trading pair"}
          value={pair}
          onChange={(p) => {
            setPair(p);
            const price = prices[p.split("-")[0]!] ?? 1;
            setLower(String(price * 0.9));
            setUpper(String(price * 1.1));
          }}
          options={
            kind === "recurring"
              ? ["BTC-USDT", "SOL-USDT"]
              : ["BTC-USDT", "ETH-USDT", "SOL-USDT", "OKB-USDT"]
          }
        />
        {(kind === "spot-grid" || kind === "futures-grid") && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Lower price · USDT">
                <input
                  className={input}
                  type="number"
                  value={lower}
                  onChange={(e) => setLower(e.target.value)}
                />
              </Field>
              <Field label="Upper price · USDT">
                <input
                  className={input}
                  type="number"
                  value={upper}
                  onChange={(e) => setUpper(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Grid count · 2–200">
              <input
                className={input}
                type="number"
                min="2"
                max="200"
                value={grids}
                onChange={(e) => setGrids(e.target.value)}
              />
            </Field>
            <Select
              label="Spacing"
              value={mode}
              onChange={setMode}
              options={["Arithmetic", "Geometric"]}
            />
            <p className="text-sm">Est. profit/grid before fees: {fmt(gridProfit, 4)}%</p>
          </>
        )}
        {kind === "futures-grid" && (
          <>
            <Select
              label="Direction"
              value={direction}
              onChange={setDirection}
              options={["Long", "Short", "Neutral"]}
            />
            <Field label="Leverage · 1–20x">
              <input
                className={input}
                type="number"
                min="1"
                max="20"
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
              />
            </Field>
          </>
        )}
        {kind === "dca" && (
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Price step %", step, setStep],
              ["Take profit %", tp, setTp],
              ["Safety orders", orders, setOrders],
            ].map(([label, value, setter]) => (
              <Field key={String(label)} label={String(label)}>
                <input
                  className={input}
                  type="number"
                  value={String(value)}
                  onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                />
              </Field>
            ))}
          </div>
        )}
        {kind === "recurring" && (
          <>
            <Field label="Primary coin allocation % · remainder ETH">
              <input
                className={input}
                type="number"
                min="1"
                max="99"
                value={allocation}
                onChange={(e) => setAllocation(e.target.value)}
              />
            </Field>
            <p className="text-sm text-muted-foreground">
              {pair.split("-")[0]} {allocation}% · ETH {100 - Number(allocation)}%
            </p>
            <Select
              label="Frequency"
              value={frequency}
              onChange={setFrequency}
              options={["Daily", "Weekly", "Monthly"]}
            />
          </>
        )}
        {kind === "arbitrage" && (
          <p className="rounded-xl bg-surface p-4 text-sm">
            Market-neutral spot / perpetual hedge. Illustrative funding spread: 0.01% per 8 hours.
          </p>
        )}
        <Field label="Investment · USDT">
          <input
            className={input}
            type="number"
            min="10"
            value={investment}
            onChange={(e) => setInvestment(e.target.value)}
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          Bots store strategy parameters but do not place orders. PnL is a deterministic 18%
          annualized estimate, independent of market movement; real strategies can lose money.
        </p>
        <button
          className={primary}
          disabled={!valid}
          onClick={() => {
            if (
              kind &&
              act((s) =>
                createBot(s, {
                  kind,
                  instId: pair,
                  investment: Number(investment),
                  params: {
                    lower: Number(lower),
                    upper: Number(upper),
                    grids: Number(grids),
                    spacing: mode,
                    direction,
                    leverage: Number(leverage),
                    priceStep: Number(step),
                    takeProfit: Number(tp),
                    safetyOrders: Number(orders),
                    allocation: Number(allocation),
                    secondaryCoin: "ETH",
                    frequency,
                  },
                }),
              )
            )
              setKind(null);
          }}
        >
          Create bot
        </button>
      </Modal>
    </Page>
  );
}
