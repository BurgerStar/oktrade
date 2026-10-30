import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ShieldCheck, Download, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { Page, Section, card, button, input, meta } from "@/components/content/ui";
import { CoinIcon } from "@/components/site/primitives";
import { usePrices } from "@/components/site/hooks";
export const Route = createFileRoute("/proof-of-reserves")({
  head: () =>
    meta(
      "Proof of reserves",
      "Explore OK Trade reserve coverage, monthly snapshots and Merkle verification.",
    ),
  component: Reserves,
});
const assets = [
  { symbol: "BTC", ratio: 104, liability: 125000 },
  { symbol: "ETH", ratio: 102, liability: 1450000 },
  { symbol: "USDT", ratio: 101, liability: 6500000000 },
  { symbol: "USDC", ratio: 103, liability: 1800000000 },
  { symbol: "SOL", ratio: 105, liability: 8500000 },
  { symbol: "XRP", ratio: 102, liability: 650000000 },
];
const history = [
  "Jul 25",
  "Aug 25",
  "Sep 25",
  "Oct 25",
  "Nov 25",
  "Dec 25",
  "Jan 26",
  "Feb 26",
  "Mar 26",
  "Apr 26",
  "May 26",
  "Jun 26",
].map((month, i) => ({
  month,
  reserves: [15.2, 15.8, 16.1, 15.9, 17.2, 18.3, 18.1, 19.6, 20.2, 21.4, 22.1, 23.2][i],
}));
function hash(s: string) {
  let n = 2166136261;
  return Array.from({ length: 8 }, (_, i) => {
    for (const c of s + String(i)) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
    return (n >>> 0).toString(16).padStart(8, "0");
  }).join("");
}
function Reserves() {
  const prices = usePrices();
  const [uid, setUid] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const total = assets.reduce(
    (s, a) => s + ((a.liability * a.ratio) / 100) * (prices[a.symbol] || 0),
    0,
  );
  return (
    <Page
      title="Trust, made verifiable."
      eyebrow="Proof of reserves"
      subtitle="Transparency is not a promise. It is a process. Explore asset backing and how inclusion proofs work."
    >
      <div className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted-foreground">
        Preview data only. Reserve balances, reports and verification results below are illustrative, not an audit or evidence of solvency. Market prices may use fallback data.
      </div>
      <section className="grid gap-6 md:grid-cols-2">
        <div className={card}>
          <p className="text-muted-foreground">
            Illustrative platform reserves · live USD valuation
          </p>
          <p className="tabular mt-4 text-4xl font-bold tracking-tight">
            {total
              ? total.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                })
              : "Loading prices…"}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Snapshot: June 30, 2026 • Six covered assets
          </p>
        </div>
        <div className={`${card} flex items-center gap-6`}>
          <ShieldCheck size={48} />
          <div>
            <h2 className="text-2xl font-bold">At least 1:1 backing</h2>
            <p className="mt-2 text-muted-foreground">
              Every covered asset has a modeled reserve ratio above 100%.
            </p>
          </div>
        </div>
      </section>
      <Section title="Asset-by-asset coverage">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {assets.map((a) => (
            <div key={a.symbol} className={card}>
              <div className="flex items-center gap-3">
                <CoinIcon symbol={a.symbol} />
                <b>{a.symbol}</b>
                <span className="tabular ml-auto text-3xl font-bold">{a.ratio}%</span>
              </div>
              <div className="my-6 h-1.5 rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-foreground"
                  style={{ width: `${10000 / a.ratio}%` }}
                />
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">User liabilities</dt>
                  <dd className="tabular">{a.liability.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Platform reserves</dt>
                  <dd className="tabular">{((a.liability * a.ratio) / 100).toLocaleString()}</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-muted-foreground">
                Amounts in {a.symbol} · reserves ÷ liabilities
              </p>
            </div>
          ))}
        </div>
      </Section>
      <Section title="A record of transparency">
        <div className={card}>
          <p className="mb-6 text-sm text-muted-foreground">
            Illustrative monthly reserves • USD billions • not historical market valuations
          </p>
          <div
            className="h-72"
            role="img"
            aria-label="Modeled reserves rose from 15.2 to 23.2 billion dollars over twelve months"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history}>
                <XAxis
                  dataKey="month"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--surface-2)" }}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                    borderRadius: 12,
                  }}
                />
                <Bar
                  dataKey="reserves"
                  name="USD billions"
                  fill="var(--foreground)"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Section>
      <Section title="Small proofs. A bigger picture.">
        <div className="grid gap-8 md:grid-cols-2">
          <div className={card}>
            <h3 className="text-xl font-bold">How a Merkle tree works</h3>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              A snapshot converts account balances into hashed leaves. Pairs of hashes are combined
              until one root represents the entire dataset. A short path of sibling hashes lets you
              check that a leaf belongs to that root without exposing other accounts.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Inclusion alone does not prove ownership of reserves, completeness of liabilities or
              freedom from encumbrances. A real assessment also needs independently checked balances
              and custody evidence.
            </p>
          </div>
          <div
            className={`${card} flex flex-col items-center justify-center gap-3`}
            aria-label="Merkle tree from root to four account leaves"
          >
            <span className="rounded-lg bg-foreground px-8 py-3 font-mono text-sm text-background">
              Snapshot root
            </span>
            <ArrowDown className="text-muted-foreground" />
            <div className="flex gap-8">
              {["Hash A+B", "Hash C+D"].map((x) => (
                <span
                  key={x}
                  className="rounded-lg border border-border px-4 py-2 font-mono text-xs"
                >
                  {x}
                </span>
              ))}
            </div>
            <ArrowDown className="text-muted-foreground" />
            <div className="flex gap-3">
              {["You", "Leaf B", "Leaf C", "Leaf D"].map((x) => (
                <span key={x} className="rounded-lg bg-surface-2 px-3 py-2 text-xs">
                  {x}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Section>
      <Section title="Verify my assets">
        <form
          className={card}
          onSubmit={(e) => {
            e.preventDefault();
            if (!uid.trim()) return;
            setBusy(true);
            setResult("");
            const value = uid.trim();
            timer.current = setTimeout(() => {
              setResult(value);
              setBusy(false);
            }, 1500);
          }}
        >
          <label htmlFor="reserve-uid" className="font-semibold">
            Account UID or leaf hash
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              id="reserve-uid"
              className={input}
              value={uid}
              onChange={(e) => {
                setUid(e.target.value);
                setResult("");
              }}
              required
              maxLength={128}
              placeholder="Enter a UID or Merkle leaf hash"
              disabled={busy}
            />
            <button className={`${button} shrink-0`} disabled={busy || !uid.trim()}>
              {busy ? "Checking proof…" : "Verify inclusion"}
            </button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Interactive preview. Any non-empty value returns an illustrative proof.
          </p>
          <div aria-live="polite">
            {result && (
              <div className="mt-6 space-y-4 rounded-xl bg-surface p-5">
                <p className="flex items-center gap-2 font-bold">
                  <ShieldCheck size={20} />
                  Verified • inclusion
                </p>
                <p className="text-sm">
                  Snapshot June 30, 2026. This is not verification of actual assets.
                </p>
                {[
                  ["Leaf hash", hash(result)],
                  ["Sibling path", `${hash(result + "sibling-1")} → ${hash(result + "sibling-2")}`],
                  ["Root", hash(result + "root")],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="mb-1 text-xs text-muted-foreground">{label}</p>
                    <code className="break-all text-xs">{value}</code>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </Section>
      <Section title="Snapshot archive">
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[550px] text-left text-sm">
            <thead className="bg-surface">
              <tr>
                {["Snapshot date", "Assets", "Method", "Report"].map((x) => (
                  <th className="p-5" key={x}>
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {["June 30, 2026", "May 31, 2026", "April 30, 2026", "March 31, 2026"].map((d) => (
                <tr className="border-t border-border" key={d}>
                  <td className="p-5">{d}</td>
                  <td className="p-5">6 assets</td>
                  <td className="p-5">Merkle tree • Preview</td>
                  <td className="p-5">
                    <button
                      className="flex items-center gap-2 font-semibold hover:underline"
                      onClick={() =>
                        toast("Report download requested", {
                          description: `${d} • Report; no audit file is issued.`,
                        })
                      }
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </Page>
  );
}
