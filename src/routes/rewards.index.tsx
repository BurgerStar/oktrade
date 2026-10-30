import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Gift, Sparkles } from "lucide-react";
import { claimReward } from "@/lib/account";
import { useAccount, usePrefs } from "@/lib/store";
import { useAction } from "@/components/site/hooks";
import {
  Page,
  Tabs,
  Heading,
  Metric,
  primary,
  secondary,
  card,
  fmt,
  useClock,
  metadata,
} from "@/components/investing/ui";
export const Route = createFileRoute("/rewards/")({
  head: () =>
    metadata("Rewards Hub", "Complete tasks, check in daily and unlock rewards with OK Trade."),
  component: Rewards,
});
function Rewards() {
  const a = useAccount(),
    prefs = usePrefs(),
    act = useAction(),
    now = useClock();
  const [tab, setTab] = useState("Tasks");
  const day = now ? new Date(now).toISOString().slice(0, 10) : "";
  const checkin = `checkin-${day}`;
  const tasks = [
    {
      id: "verify",
      title: "Complete identity verification",
      description: "Verify your identity to unlock more.",
      to: "/account/verification",
      amount: 5,
      done: !!a?.user.verified,
    },
    {
      id: "deposit",
      title: "Make your first deposit",
      description: "Add funds using the deposit flow.",
      to: "/assets/deposit",
      amount: 10,
      done: !!a?.activity.some((x) => x.type === "deposit"),
    },
    {
      id: "trade",
      title: "Make your first trade",
      description: "Complete a spot or futures trade.",
      to: "/markets",
      amount: 8,
      done:
        !!a &&
        (a.orders.some((o) => o.status === "filled") ||
          a.positions.length > 0 ||
          a.closedPositions.length > 0),
    },
    {
      id: "earn",
      title: "Subscribe to Simple Earn",
      description: "Put an asset to work with an Earn subscription.",
      to: "/earn",
      amount: 3,
      done: !!a?.activity.some((x) => x.type === "earn-subscribe"),
    },
    {
      id: "copy",
      title: "Copy a lead trader",
      description: "Explore copy trading with at least 50 USDT.",
      to: "/copy-trading",
      amount: 5,
      done: !!a?.activity.some((x) => x.type === "copy"),
    },
    {
      id: "invite",
      title: "Invite a friend",
      description: "Share your referral link.",
      to: "/rewards/referral",
      amount: 15,
      done: false,
    },
  ];
  const total =
    a?.activity
      .filter((x) => x.type === "reward")
      .reduce((s, x) => s + x.amount, 0) ?? 0;
  return (
    <Page
      title="Every next step, rewarded."
      description="Explore the exchange, build your knowledge and collect rewards along the way."
      hero={
        <div className="flex flex-wrap gap-12">
          <Metric
            label="Rewards earned"
            value={prefs.hideBalances ? "••••" : `${fmt(total)} USDT`}
          />
          <Metric label="Reward points" value={String((a?.claimedRewards.length ?? 0) * 100)} />
          <Metric label="Available vouchers" value="0" />
        </div>
      }
    >
      <section
        className={`${card} flex flex-col justify-between gap-6 md:flex-row md:items-center`}
      >
        <div className="flex items-center gap-5">
          <Gift className="size-12" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Your daily mystery box</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              One check-in. A 0.5 USDT reward. Resets daily at 00:00 UTC.
            </p>
          </div>
        </div>
        <button
          className={primary}
          disabled={!day || !!a?.claimedRewards.includes(checkin)}
          onClick={() => act((s) => claimReward(s, checkin, "USDT", 0.5, "Daily mystery box"))}
        >
          {a?.claimedRewards.includes(checkin) ? "Checked in today" : "Open today’s box"}
        </button>
      </section>
      <Tabs items={["Tasks", "Vouchers"]} value={tab} onChange={setTab} />
      {tab === "Tasks" ? (
        <section>
          <Heading>Your next milestones</Heading>
          <div className="space-y-4">
            {tasks.map((t) => {
              const claimed = a?.claimedRewards.includes(`task-${t.id}`);
              return (
                <div
                  key={t.id}
                  className={`${card} flex flex-wrap items-center justify-between gap-5`}
                >
                  <div className="flex items-center gap-5">
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-surface-2">
                      <Sparkles className="size-5" />
                    </span>
                    <div>
                      <h3 className="font-semibold">{t.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Progress {t.done ? "1/1 · Complete" : "0/1"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="tabular font-semibold">{t.amount} USDT</span>
                    {!t.done && !claimed && (
                      <Link to={t.to as "/earn"} className={secondary}>
                        Start task
                      </Link>
                    )}
                    <button
                      className={primary}
                      disabled={!t.done || claimed}
                      onClick={() =>
                        act((s) => {
                          const valid =
                            t.id === "verify"
                              ? s.user.verified
                              : t.id === "deposit"
                                ? s.activity.some((x) => x.type === "deposit")
                                : t.id === "trade"
                                  ? s.orders.some((o) => o.status === "filled") ||
                                    s.positions.length > 0 ||
                                    s.closedPositions.length > 0
                                  : t.id === "earn"
                                    ? s.activity.some((x) => x.type === "earn-subscribe")
                                    : t.id === "copy"
                                      ? s.activity.some((x) => x.type === "copy")
                                      : false;
                          return valid
                            ? claimReward(s, `task-${t.id}`, "USDT", t.amount, t.title)
                            : { ok: false, error: "Complete this task before claiming" };
                        })
                      }
                    >
                      {claimed ? "Claimed" : "Claim"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section>
          <Heading>Fee rebate vouchers</Heading>
          <div className="grid gap-5 md:grid-cols-2">
            {[
              ["Spot fee rebate", "Up to 10 USDT", "Complete exchange onboarding campaigns"],
              ["Futures fee rebate", "Up to 20 USDT", "Participate in eligible futures events"],
            ].map(([n, v, d]) => (
              <div key={n} className={`${card} space-y-4`}>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Not issued
                </p>
                <h3 className="text-xl font-semibold">{n}</h3>
                <Metric label="Campaign face value" value={v} />
                <p className="text-sm text-muted-foreground">
                  {d}. No vouchers have been issued to this account.
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
      <section>
        <Heading>More ways to explore</Heading>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            ["Learn & grow", "Explore crypto fundamentals and risk management.", "/learn"],
            ["Invite your circle", "Learn how referral commissions work.", "/rewards/referral"],
            [
              "Meet your next strategy",
              "Discover lead traders and their track records.",
              "/copy-trading",
            ],
          ].map(([t, d, to]) => (
            <article className={card} key={t}>
              <h3 className="text-xl font-semibold">{t}</h3>
              <p className="mb-6 mt-3 text-sm text-muted-foreground">{d}</p>
              <Link to={to as "/learn"} className={secondary}>
                Explore →
              </Link>
            </article>
          ))}
        </div>
      </section>
    </Page>
  );
}
