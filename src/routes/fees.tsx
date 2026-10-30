import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Page, Section, Filters, meta, input, card } from "@/components/content/ui";
export const Route = createFileRoute("/fees")({
  head: () =>
    meta("Fees", "Explore OK Trade spot, futures and withdrawal fees and calculate trading costs."),
  component: Fees,
});
const rows = [
  ["BTC", "Bitcoin", "0.0001 BTC", "0.0002 BTC"],
  ["ETH", "Ethereum", "0.0005 ETH", "0.001 ETH"],
  ["ETH", "Arbitrum", "0.00002 ETH", "0.0001 ETH"],
  ["USDT", "Ethereum", "3 USDT", "5 USDT"],
  ["USDT", "TRON", "1 USDT", "2 USDT"],
  ["USDT", "Solana", "0.5 USDT", "1 USDT"],
  ["SOL", "Solana", "0.005 SOL", "0.01 SOL"],
  ["XRP", "XRP Ledger", "0.2 XRP", "1 XRP"],
  ["DOGE", "Dogecoin", "4 DOGE", "8 DOGE"],
  ["USDC", "Base", "0.1 USDC", "1 USDC"],
];
const tiers = [
  ["Regular", "< 5M", "< 100K", 0.08, 0.1, 0.02, 0.05],
  ["VIP1", "5M", "100K", 0.07, 0.09, 0.018, 0.045],
  ["VIP2", "10M", "500K", 0.06, 0.08, 0.015, 0.04],
  ["VIP3", "20M", "1M", 0.05, 0.07, 0.01, 0.035],
  ["VIP4", "50M", "2M", 0.04, 0.06, 0.008, 0.03],
  ["VIP5", "100M", "5M", 0.03, 0.05, 0.006, 0.025],
  ["VIP6", "200M", "10M", 0.02, 0.04, 0.004, 0.022],
  ["VIP7", "500M", "20M", 0.01, 0.03, 0.002, 0.02],
  ["VIP8", "1B", "50M", 0, 0.02, 0, 0.018],
] as const;
function Fees() {
  const [tab, setTab] = useState("Spot");
  const [search, setSearch] = useState("");
  const [volume, setVolume] = useState("10000");
  const [tier, setTier] = useState(0);
  const [role, setRole] = useState("Taker");
  const r = tiers[tier]!;
  const rate = Number(r[tab === "Futures" ? (role === "Maker" ? 5 : 6) : role === "Maker" ? 3 : 4]);
  return (
    <Page
      title="Every fee. In plain sight."
      subtitle="Transparent pricing for every stage of your trading journey."
    >
      <Filters items={["Spot", "Futures", "Withdrawal"]} value={tab} onChange={setTab} />
      {tab === "Withdrawal" ? (
        <Section title="Network withdrawal fees">
          <input
            className={`${input} max-w-md`}
            placeholder="Search coin or network"
            aria-label="Search withdrawal fees"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[550px] text-left text-sm">
              <thead className="bg-surface">
                <tr>
                  {["Asset", "Network", "Fee", "Minimum withdrawal"].map((h) => (
                    <th className="p-5" key={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows
                  .filter((r) => r.join(" ").toLowerCase().includes(search.toLowerCase()))
                  .map((r) => (
                    <tr key={r.join()} className="border-t border-border">
                      {r.map((x, i) => (
                        <td key={i} className="tabular p-5">
                          {x}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : (
        <Section title={`${tab} trading tiers`}>
          <p className="text-sm text-muted-foreground">
            Illustrative schedule. VIP qualification uses either the 30-day USD volume
            threshold or the asset threshold shown. Real eligibility may differ.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-surface">
                <tr>
                  {["Tier", "30d volume (USD)", "Assets (USD)", "Maker", "Taker"].map((h) => (
                    <th key={h} className="p-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tiers.map((r) => (
                  <tr key={r[0]} className="border-t border-border hover:bg-accent">
                    <td className="p-5 font-semibold">{r[0]}</td>
                    <td className="tabular p-5">{r[1]}</td>
                    <td className="tabular p-5">{r[2]}</td>
                    <td className="tabular p-5">{r[tab === "Spot" ? 3 : 5].toFixed(3)}%</td>
                    <td className="tabular p-5">{r[tab === "Spot" ? 4 : 6].toFixed(3)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={card}>
            <h3 className="mb-5 text-xl font-semibold">Fee calculator</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <label>
                Trade notional (USD)
                <input
                  type="number"
                  min="0"
                  value={volume}
                  className={`${input} mt-2`}
                  onChange={(e) => setVolume(e.target.value)}
                />
              </label>
              <label>
                Tier
                <select
                  value={tier}
                  className={`${input} mt-2`}
                  onChange={(e) => setTier(Number(e.target.value))}
                >
                  {tiers.map((r, i) => (
                    <option value={i} key={r[0]}>
                      {r[0]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Liquidity role
                <select
                  value={role}
                  className={`${input} mt-2`}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option>Maker</option>
                  <option>Taker</option>
                </select>
              </label>
            </div>
            <p className="tabular mt-6 text-3xl font-bold">
              $
              {((Math.max(0, Number(volume) || 0) * rate) / 100).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Estimated fee at {rate}% per fill. Excludes funding, spread and slippage.
            </p>
          </div>
        </Section>
      )}
      <p className="text-sm text-muted-foreground">
        Network fees are indicative and may change with congestion. Confirm the fee on the
        withdrawal screen. Deposits may incur fees from the sending provider.
      </p>
    </Page>
  );
}
