import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, TrendingUp, ShieldCheck, Clock3 } from "lucide-react";
import { useAccount, usePrefs } from "@/lib/store";
import { subscribeEarn, redeemEarn, earnInterest } from "@/lib/account";
import { useAction, usePrices, useAuthGuard } from "@/components/site/hooks";
import { CoinIcon } from "@/components/site/primitives";
import {
  Page,
  Tabs,
  Field,
  Modal,
  FAQ,
  Empty,
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
export const Route = createFileRoute("/earn")({
  head: () =>
    metadata(
      "Simple Earn",
      "Put your crypto to work with flexible savings, fixed terms and on-chain staking.",
    ),
  component: Earn,
});
const categories = [
  "All",
  "Flexible",
  "Fixed",
  "On-chain earn / Staking",
  "Dual investment",
  "Shark Fin",
];
const coins = ["USDT", "BTC", "ETH", "SOL", "USDC", "OKB", "DOT", "AVAX", "ATOM", "TON"];
const products = Array.from({ length: 27 }, (_, i) => {
  const ccy = coins[i % 10]!;
  const category =
    i < 10
      ? "Flexible"
      : i < 19
        ? "Fixed"
        : i < 24
          ? "On-chain earn / Staking"
          : i < 26
            ? "Dual investment"
            : "Shark Fin";
  return {
    id: i,
    ccy,
    category,
    apr:
      (i < 10
        ? [5.2, 1.1, 2.4, 4.2, 4.8, 1.7, 6, 4.5, 8, 3.6][i]!
        : i < 19
          ? 6 + (i % 5) * 1.2
          : i === 20
            ? 3.4
            : i === 21
              ? 7
              : 5 + (i % 6) * 1.4) / 100,
    termDays:
      category === "Flexible"
        ? 0
        : category === "Fixed"
          ? [30, 60, 90][i % 3]!
          : category === "On-chain earn / Staking"
            ? 7
            : 14,
  };
});
function Earn() {
  const account = useAccount(),
    prefs = usePrefs(),
    prices = usePrices(),
    act = useAction(),
    guard = useAuthGuard(),
    now = useClock();
  const [tab, setTab] = useState("All"),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<(typeof products)[number] | null>(null),
    [amount, setAmount] = useState(""),
    [agreed, setAgreed] = useState(false);
  const earnings =
    account?.earn.reduce(
      (n, e) => n + earnInterest(e, now || e.startedAt) * (prices[e.ccy] ?? 0),
      0,
    ) ?? 0;
  return (
    <Page
      title="Your crypto. More potential."
      description="Simple Earn puts idle assets to work. Choose the flexibility you need and earn at your own pace."
      hero={
        <div className="flex flex-wrap items-center gap-10">
          <div className="flex items-center gap-3">
            <TrendingUp className="size-10" />
            <span>
              Earn on 25+ products
              <br />
              <span className="text-sm text-muted-foreground">
                Flexible access. Transparent rates.
              </span>
            </span>
          </div>
          {account && (
            <Metric
              label="Total earnings · USD equivalent"
              value={prefs.hideBalances ? "••••••" : `$${fmt(earnings, 6)}`}
            />
          )}
        </div>
      }
    >
      <div className="grid gap-5 md:grid-cols-3">
        {[
          [
            ShieldCheck,
            "Built around your goals",
            "Select the term and asset that fit your strategy.",
          ],
          [Clock3, "Flexible or fixed", "Redeem flexible savings whenever you need."],
          [TrendingUp, "Every second counts", "Watch your interest accrue in real time."],
        ].map(([Icon, title, text]) => {
          const I = Icon as typeof TrendingUp;
          return (
            <div key={String(title)} className={card}>
              <I className="mb-5 size-7" />
              <h3 className="font-semibold">{String(title)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{String(text)}</p>
            </div>
          );
        })}
      </div>
      <section>
        <Heading>Discover your next earning opportunity</Heading>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Tabs items={categories} value={tab} onChange={setTab} />
          <label className="relative">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <input
              aria-label="Search earn products"
              className={`${input} pl-10`}
              placeholder="Search assets"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-muted-foreground">
              <tr>
                {["Asset", "Est. APR", "Product", "Term", ""].map((x, i) => (
                  <th key={i} className="px-6 py-4 font-normal">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products
                .filter(
                  (p) =>
                    (tab === "All" || p.category === tab) &&
                    `${p.ccy} ${p.category}`.toLowerCase().includes(query.toLowerCase()),
                )
                .map((p) => (
                  <tr key={p.id} className="border-t border-border hover:bg-surface">
                    <td className="px-6 py-5">
                      <span className="flex items-center gap-3 font-semibold">
                        <CoinIcon symbol={p.ccy} />
                        {p.ccy}
                      </span>
                    </td>
                    <td className="tabular px-6 py-5 text-up">{fmt(p.apr * 100)}%</td>
                    <td className="px-6 py-5">{p.category}</td>
                    <td className="whitespace-nowrap px-6 py-5">
                      {p.termDays ? `${p.termDays} days` : "Flexible"}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        className={secondary}
                        onClick={() => {
                          if (guard()) {
                            setSelected(p);
                            setAmount("");
                            setAgreed(false);
                          }
                        }}
                      >
                        Subscribe
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!products.some(
            (p) =>
              (tab === "All" || p.category === tab) &&
              `${p.ccy} ${p.category}`.toLowerCase().includes(query.toLowerCase()),
          ) && <Empty text="No matching products" />}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Annualized estimates. Structured products use simplified fixed-term accounting; no
          option or principal-protection payoff is modeled.
        </p>
      </section>
      <section>
        <Heading>My earn</Heading>
        {!account?.earn.length ? (
          <Empty text="Your earning journey starts here" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {account.earn.map((e) => {
              const remaining = e.startedAt + e.termDays * 86400000 - now;
              return (
                <div key={e.id} className={card}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      {e.ccy} · {e.product}
                    </h3>
                    <span className="text-up">{fmt(e.apr * 100)}%</span>
                  </div>
                  <div className="my-6 grid grid-cols-2 gap-4">
                    <Metric
                      label="Subscribed"
                      value={prefs.hideBalances ? "••••" : `${fmt(e.amount, 6)} ${e.ccy}`}
                    />
                    <Metric
                      label="Accrued interest"
                      value={
                        prefs.hideBalances ? "••••" : fmt(earnInterest(e, now || e.startedAt), 8)
                      }
                    />
                  </div>
                  <button
                    className={secondary}
                    disabled={e.termDays > 0 && remaining > 0}
                    onClick={() => act((s) => redeemEarn(s, e.id))}
                  >
                    {e.termDays > 0 && remaining > 0
                      ? `Unlocks in ${duration(remaining)}`
                      : "Redeem"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <FAQ
        items={[
          [
            "How is interest calculated?",
            "Interest = principal × APR × elapsed days ÷ 365. Interest accrues each second; estimates are not guaranteed returns.",
          ],
          [
            "Can I redeem early?",
            "Flexible subscriptions can be redeemed at any time. Fixed-term products remain locked until their displayed maturity.",
          ],
          [
            "What are the risks?",
            "Digital assets are volatile. Staking and structured products can involve liquidity and protocol risks. This product preview does not execute any on-chain transaction.",
          ],
        ]}
      />
      <Modal
        title={`Subscribe ${selected?.ccy ?? ""}`}
        open={!!selected}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <>
            <p className="text-sm text-muted-foreground">
              {selected.category} ·{" "}
              {selected.termDays ? `${selected.termDays}-day term` : "Redeem anytime"} ·{" "}
              {fmt(selected.apr * 100)}% APR
            </p>
            <Field label={`Amount · ${selected.ccy}`}>
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
                  onClick={() => setAmount(String(account?.balances[selected.ccy]?.available ?? 0))}
                >
                  Max
                </button>
              </div>
            </Field>
            <p className="text-xs text-muted-foreground">
              Available: {fmt(account?.balances[selected.ccy]?.available ?? 0, 8)} {selected.ccy}
            </p>
            <div className={card}>
              <Metric
                label={selected.termDays ? "Estimated term earnings" : "Estimated daily earnings"}
                value={`${fmt((Number(amount) * selected.apr * (selected.termDays || 1)) / 365, 8)} ${selected.ccy}`}
              />
            </div>
            <label className="flex gap-3 text-sm">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              I understand the term, product mechanics and investment risks.
            </label>
            <button
              className={primary}
              disabled={!agreed || !(Number(amount) > 0) || !Number.isFinite(Number(amount))}
              onClick={() => {
                if (
                  act((s) =>
                    subscribeEarn(s, {
                      ccy: selected.ccy,
                      amount: Number(amount),
                      apr: selected.apr,
                      termDays: selected.termDays,
                      product: selected.category,
                    }),
                  )
                )
                  setSelected(null);
              }}
            >
              Confirm subscription
            </button>
          </>
        )}
      </Modal>
    </Page>
  );
}
