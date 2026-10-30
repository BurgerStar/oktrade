import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAccount } from "@/lib/store";
import { stopCopy } from "@/lib/account";
import { useAction, useAuthGuard } from "@/components/site/hooks";
import { traders, copyPnl, type Trader } from "@/components/copy/traders";
import { CopyDialog } from "@/components/copy/CopyDialog";
import { PnlChart } from "@/components/copy/Chart";
import {
  Page,
  Tabs,
  Select,
  Heading,
  Metric,
  Empty,
  primary,
  secondary,
  card,
  fmt,
  useClock,
  metadata,
} from "@/components/investing/ui";
export const Route = createFileRoute("/copy-trading/")({
  head: () =>
    metadata(
      "Copy Trading",
      "Discover experienced lead traders and explore strategies with transparent performance.",
    ),
  component: Copy,
});
function Copy() {
  const a = useAccount(),
    act = useAction(),
    guard = useAuthGuard(),
    now = useClock();
  const [market, setMarket] = useState("Futures"),
    [period, setPeriod] = useState("30D"),
    [sort, setSort] = useState("ROI"),
    [selected, setSelected] = useState<Trader | null>(null);
  const roi = (t: Trader) => (period === "7D" ? t.roi7 : period === "90D" ? t.roi90 : t.roi30);
  const score = (t: Trader) =>
    sort === "PnL"
      ? t.pnl
      : sort === "Followers"
        ? t.followers
        : sort === "Win rate"
          ? t.winRate
          : roi(t);
  return (
    <Page
      title="Great traders. Your next move."
      description="Learn from experience. Discover lead traders, compare their track records and put a strategy to work."
      hero={
        <div className="flex flex-wrap gap-12">
          <Metric label="Lead traders" value="16" />
          <Metric label="Strategies" value="Spot & futures" />
          <Metric label="Start copying from" value="50 USDT" />
        </div>
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-5">
        <Tabs items={["Futures", "Spot"]} value={market} onChange={setMarket} />
        <Tabs items={["7D", "30D", "90D"]} value={period} onChange={setPeriod} />
        <Select
          label="Sort by"
          value={sort}
          onChange={setSort}
          options={["ROI", "PnL", "Followers", "Win rate"]}
        />
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {traders
          .filter((t) => t.market === market)
          .sort((a, b) => score(b) - score(a))
          .map((t) => (
            <article key={t.id} className={card}>
              <Link
                to="/copy-trading/$traderId"
                params={{ traderId: t.id }}
                className="flex items-center gap-3"
              >
                <span className="grid size-12 place-items-center rounded-full bg-surface-2 font-semibold">
                  {t.initials}
                </span>
                <div>
                  <h2 className="font-semibold">{t.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {t.followers}/{t.max} copiers
                  </p>
                </div>
              </Link>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="text-up">
                  <Metric label={`${period} ROI`} value={`+${fmt(roi(t))}%`} />
                </div>
                <Metric label="Trading PnL" value={`$${fmt(t.pnl, 0)}`} />
              </div>
              <PnlChart
                data={t.series.map((p) => ({ ...p, value: (p.value * roi(t)) / t.roi30 }))}
              />
              <div className="grid grid-cols-2 gap-4">
                <Metric label="Win rate" value={`${fmt(t.winRate, 1)}%`} />
                <Metric label="Max drawdown" value={`${fmt(t.drawdown, 1)}%`} />
              </div>
              <div className="my-5 flex flex-wrap gap-2">
                {t.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-surface px-3 py-1 text-xs text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <button
                className={`${primary} w-full`}
                onClick={() => {
                  if (guard()) setSelected(t);
                }}
              >
                {a?.copy.some((c) => c.traderId === t.id)
                  ? "Copying · View settings"
                  : "Copy trader"}
              </button>
            </article>
          ))}
      </div>
      <section>
        <Heading>My copy trading</Heading>
        {!a?.copy.length ? (
          <Empty text="Find a strategy that fits you" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {a.copy.map((c) => {
              const t = traders.find((t) => t.id === c.traderId);
              const pnl = copyPnl(c.amount, c.startedAt, t?.roi30 ?? 0, now);
              return (
                <div key={c.id} className={`${card} space-y-5`}>
                  <h3 className="font-semibold">{c.traderName}</h3>
                  <div className="grid grid-cols-2">
                    <Metric label="Investment" value={`${fmt(c.amount)} USDT`} />
                    <div className="text-up">
                      <Metric label="PnL" value={`+${fmt(pnl, 6)} USDT`} />
                    </div>
                  </div>
                  <button className={secondary} onClick={() => act((s) => stopCopy(s, c.id, pnl))}>
                    Stop copying & settle
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <p className="text-xs text-muted-foreground">
        All track records are sample data. Past performance does not predict future results.
        Follower PnL scales linearly with elapsed time over 30 days.
      </p>
      <CopyDialog trader={selected} onClose={() => setSelected(null)} />
    </Page>
  );
}
