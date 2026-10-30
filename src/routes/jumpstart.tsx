import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Rocket } from "lucide-react";
import { useAccount } from "@/lib/store";
import { subscribeEarn } from "@/lib/account";
import { useAction, useAuthGuard } from "@/components/site/hooks";
import {
  Page,
  Tabs,
  Select,
  Field,
  Modal,
  Heading,
  Metric,
  primary,
  secondary,
  input,
  card,
  fmt,
  duration,
  useClock,
  metadata,
} from "@/components/investing/ui";
export const Route = createFileRoute("/jumpstart")({
  head: () =>
    metadata(
      "Jumpstart",
      "Discover early-stage projects and participate in token mining with OK Trade Jumpstart.",
    ),
  component: Jumpstart,
});
const projects = [
  { name: "Nexus", ticker: "NEX", allocation: 20000000, rate: 0.024, status: "Ongoing", days: 7 },
  {
    name: "Layer Horizon",
    ticker: "LHZ",
    allocation: 12000000,
    rate: 0.018,
    status: "Ongoing",
    days: 7,
  },
  {
    name: "Orbit AI",
    ticker: "ORAI",
    allocation: 8000000,
    rate: 0.032,
    status: "Upcoming",
    days: 14,
  },
  {
    name: "Vertex Network",
    ticker: "VTX",
    allocation: 15000000,
    rate: 0.015,
    status: "Upcoming",
    days: 21,
  },
  {
    name: "Aether Protocol",
    ticker: "AETH",
    allocation: 25000000,
    rate: 0.021,
    status: "Completed",
    days: 0,
  },
  {
    name: "Sonic Mesh",
    ticker: "MESH",
    allocation: 18000000,
    rate: 0.027,
    status: "Completed",
    days: 0,
  },
];
function Jumpstart() {
  const a = useAccount(),
    act = useAction(),
    guard = useAuthGuard(),
    now = useClock();
  const [tab, setTab] = useState("Ongoing"),
    [project, setProject] = useState<(typeof projects)[number] | null>(null),
    [coin, setCoin] = useState("USDT"),
    [amount, setAmount] = useState("");
  const anchor = now ? Math.floor(now / 86400000) * 86400000 : 0;
  return (
    <Page
      title="Be early to what's next."
      description="Discover emerging projects. Stake your assets and explore token mining in a risk-free preview."
      hero={
        <span className="inline-flex items-center gap-3 rounded-full border border-border px-5 py-3">
          <Rocket className="size-5" />
          The next generation starts here
        </span>
      }
    >
      <Tabs items={["Ongoing", "Upcoming", "Completed"]} value={tab} onChange={setTab} />
      <div className="grid gap-6 md:grid-cols-2">
        {projects
          .filter((p) => p.status === tab)
          .map((p, i) => {
            const subs = a?.earn.filter((e) => e.product === `Jumpstart · ${p.name}`) ?? [];
            return (
              <article className={`${card} space-y-6`} key={p.name}>
                <div className="flex items-center justify-between">
                  <span className="grid size-14 place-items-center rounded-2xl bg-foreground text-2xl font-bold text-background">
                    {p.ticker[0]}
                  </span>
                  <span className="rounded-full bg-surface-2 px-3 py-1 text-xs">{p.status}</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {p.name}{" "}
                    <span className="text-sm font-normal text-muted-foreground">{p.ticker}</span>
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Stake USDT or OKB · 7-day lock · Token mining
                  </p>
                </div>
                <Metric
                  label="Total token allocation"
                  value={`${fmt(p.allocation, 0)} ${p.ticker}`}
                />
                <progress
                  className="h-2 w-full accent-foreground"
                  max={100}
                  value={p.status === "Completed" ? 100 : 64 + i * 11}
                  aria-label="Allocation progress"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    {p.status === "Completed"
                      ? "Distribution complete"
                      : `${64 + i * 11}% participation`}
                  </span>
                  <span className="tabular">
                    {p.status === "Completed"
                      ? "Ended"
                      : duration(anchor + p.days * 86400000 - now)}
                  </span>
                </div>
                {subs.length > 0 && (
                  <div className="rounded-xl bg-surface p-4 text-sm">
                    <strong>You're staked</strong>
                    {subs.map((e) => (
                      <p key={e.id} className="mt-2">
                        {fmt(e.amount, 4)} {e.ccy} · Est. mining rewards:{" "}
                        {fmt(
                          e.amount *
                            p.rate *
                            Math.min(1, Math.max(0, now - e.startedAt) / (7 * 86400000)),
                          6,
                        )}{" "}
                        {p.ticker}
                      </p>
                    ))}
                  </div>
                )}
                {p.status === "Ongoing" && (
                  <button
                    className={primary}
                    onClick={() => {
                      if (guard()) {
                        setProject(p);
                        setAmount("");
                      }
                    }}
                  >
                    Stake {p.ticker}
                  </button>
                )}
                {p.status === "Upcoming" && (
                  <p className="text-sm">
                    Staking opens in {duration(anchor + p.days * 86400000 - now)}
                  </p>
                )}
              </article>
            );
          })}
      </div>
      <section>
        <Heading>From discovery to distribution</Heading>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            [
              "01",
              "Choose a project",
              "Explore the allocation, token mechanics and staking period.",
            ],
            [
              "02",
              "Stake your assets",
              "Subscribe with USDT or OKB. Your stake is locked for seven days.",
            ],
            [
              "03",
              "Track your estimate",
              "See mining rewards here. Redeem principal from Simple Earn at maturity.",
            ],
          ].map(([n, t, d]) => (
            <div className={card} key={n}>
              <p className="mb-6 text-4xl font-bold text-muted-foreground">{n}</p>
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          Projects are illustrative launches. Mining reward estimates are illustrative only and
          are not credited to account balances.
        </p>
      </section>
      <Modal
        title={`Stake for ${project?.name ?? ""}`}
        open={!!project}
        onClose={() => setProject(null)}
      >
        <Select label="Staking asset" value={coin} onChange={setCoin} options={["USDT", "OKB"]} />
        <Field label="Amount">
          <div className="flex gap-2">
            <input
              className={input}
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button
              className={secondary}
              onClick={() => setAmount(String(a?.balances[coin]?.available ?? 0))}
            >
              Max
            </button>
          </div>
        </Field>
        <p className="text-sm text-muted-foreground">
          7-day lock. 0% interest; mining estimates are not spendable rewards.
        </p>
        <button
          className={primary}
          disabled={!(Number(amount) > 0) || !Number.isFinite(Number(amount))}
          onClick={() => {
            if (
              project &&
              act((s) =>
                subscribeEarn(s, {
                  product: `Jumpstart · ${project.name}`,
                  ccy: coin,
                  amount: Number(amount),
                  apr: 0,
                  termDays: 7,
                }),
              )
            )
              setProject(null);
          }}
        >
          Confirm stake
        </button>
      </Modal>
    </Page>
  );
}
