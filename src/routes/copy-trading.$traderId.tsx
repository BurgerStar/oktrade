import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { traders } from "@/components/copy/traders";
import { CopyDialog } from "@/components/copy/CopyDialog";
import { PnlChart } from "@/components/copy/Chart";
import { useAuthGuard } from "@/components/site/hooks";
import {
  Page,
  Tabs,
  Heading,
  Metric,
  primary,
  card,
  fmt,
  metadata,
} from "@/components/investing/ui";
export const Route = createFileRoute("/copy-trading/$traderId")({
  head: () =>
    metadata(
      "Lead Trader Profile",
      "Review lead trader performance, positions, risk statistics and followers.",
    ),
  component: Profile,
});
function Profile() {
  const { traderId } = Route.useParams(),
    t = traders.find((x) => x.id === traderId);
  const [period, setPeriod] = useState("30D"),
    [copy, setCopy] = useState(false),
    guard = useAuthGuard();
  if (!t)
    return (
      <Page title="Trader not found" description="This trader profile is not available.">
        <Link to="/copy-trading" className={primary}>
          Explore lead traders
        </Link>
      </Page>
    );
  const roi = period === "7D" ? t.roi7 : period === "90D" ? t.roi90 : t.roi30;
  return (
    <Page
      title={t.name}
      description={`${t.market} · ${t.tags.join(" · ")} · Trading for ${t.days} days`}
      hero={
        <div className="flex flex-wrap items-center gap-8">
          <span className="grid size-20 place-items-center rounded-full border border-border text-3xl font-bold">
            {t.initials}
          </span>
          <Metric label="Copiers" value={`${t.followers} / ${t.max}`} />
          <button className={primary} onClick={() => guard() && setCopy(true)}>
            Copy trader
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {[
          ["30D ROI", `+${fmt(t.roi30)}%`],
          ["Trading PnL", `$${fmt(t.pnl, 0)}`],
          ["Win rate", `${fmt(t.winRate, 1)}%`],
          ["Assets under management", `$${fmt(t.aum, 0)}`],
          ["Max drawdown", `${fmt(t.drawdown, 1)}%`],
          ["Sharpe ratio", fmt(t.sharpe)],
          ["Trading days", String(t.days)],
          ["Copier capacity", String(t.max)],
        ].map(([l, v]) => (
          <div key={l} className={card}>
            <Metric label={l!} value={v} />
          </div>
        ))}
      </div>
      <section className={card}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Heading>Cumulative PnL</Heading>
          <Tabs items={["7D", "30D", "90D"]} value={period} onChange={setPeriod} />
        </div>
        <PnlChart large data={t.series.map((p) => ({ ...p, value: (p.value * roi) / t.roi30 }))} />
      </section>
      <section>
        <Heading>Current positions · sample</Heading>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-muted-foreground">
              <tr>
                {["Pair", "Direction", "Leverage", "Entry price", "Unrealized PnL"].map((h) => (
                  <th key={h} className="p-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["BTC-USDT", "Long", "3x", "67,320.00", "+327.40"],
                ["ETH-USDT", "Long", "2x", "3,480.50", "+184.20"],
                ["SOL-USDT", "Short", "2x", "154.80", "−42.10"],
              ].map((r) => (
                <tr key={r[0]} className="border-t border-border">
                  {r.map((c, i) => (
                    <td
                      key={i}
                      className={`tabular p-4 ${i === 4 ? (c.startsWith("+") ? "text-up" : "text-down") : ""}`}
                    >
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="grid gap-8 md:grid-cols-2">
        <section className={card}>
          <Heading>Position history</Heading>
          {[
            "BTC long · +8.42%",
            "ETH short · +3.71%",
            "SOL long · −1.80%",
            "BTC long · +5.25%",
          ].map((s, i) => (
            <div key={s} className="flex justify-between border-b border-border py-4 text-sm">
              <span>{s}</span>
              <span className="text-muted-foreground">{i + 1} days ago</span>
            </div>
          ))}
        </section>
        <section className={card}>
          <Heading>Recent followers</Heading>
          {["crystal***", "alpha***", "river***", "block***", "north***"].map((s, i) => (
            <div key={s} className="flex justify-between border-b border-border py-4 text-sm">
              <span>{s}</span>
              <span className="tabular text-muted-foreground">{fmt(150 + i * 325)} USDT</span>
            </div>
          ))}
        </section>
      </div>
      <CopyDialog trader={copy ? t : null} onClose={() => setCopy(false)} />
    </Page>
  );
}
