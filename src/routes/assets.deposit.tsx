import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAccount } from "@/lib/store";
import { deposit } from "@/lib/account";
import { COINS } from "@/lib/coins";
import { useAction } from "@/components/site/hooks";
import {
  AccountShell,
  accountMeta,
  panel,
  primary,
  secondary,
  field,
} from "@/components/account/AccountShell";
import {
  CoinSelect,
  networks,
  demoAddress,
  copy,
  ActivityTable,
} from "@/components/account/Shared";
export const Route = createFileRoute("/assets/deposit")({
  validateSearch: (s: Record<string, unknown>): { ccy?: string } =>
    COINS.some((c) => c.symbol === s["ccy"]) ? { ccy: String(s["ccy"]) } : {},
  head: () => accountMeta("Deposit crypto"),
  component: Page,
});
function Page() {
  const ccy = Route.useSearch().ccy ?? "USDT";
  return (
    <AccountShell title="Deposit crypto">
      <Deposit initial={ccy} key={ccy} />
    </AccountShell>
  );
}
function Deposit({ initial }: { initial: string }) {
  const a = useAccount();
  const act = useAction();
  const [ccy, setCcy] = useState(initial);
  const [network, setNetwork] = useState(networks(initial)[0]!);
  const [amount, setAmount] = useState("");
  if (!a) return null;
  const address = demoAddress(ccy, network, a.user.uid);
  const min = ccy === "BTC" ? 0.0001 : ccy === "ETH" ? 0.001 : 1;
  return (
    <div className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="space-y-7">
          <section className={panel}>
            <h2 className="mb-5 text-lg font-semibold">1. Select crypto</h2>
            <CoinSelect
              value={ccy}
              onChange={(c) => {
                setCcy(c);
                setNetwork(networks(c)[0]!);
              }}
            />
          </section>
          <section className={panel}>
            <h2 className="mb-5 text-lg font-semibold">2. Select network</h2>
            <select
              aria-label="Deposit network"
              className={field}
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
            >
              {networks(ccy).map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
            <div className="mt-4 flex justify-between text-xs text-muted-foreground">
              <span>
                Minimum: {min} {ccy}
              </span>
              <span>{network === "Bitcoin" ? 3 : network === "ERC20" ? 12 : 20} confirmations</span>
            </div>
          </section>
          <section className={panel}>
            <h2 className="mb-5 text-lg font-semibold">3. Deposit details</h2>
            <div className="mb-5 flex items-start gap-5">
              <div
                aria-label="Address preview, not a scannable QR code"
                className="grid size-28 shrink-0 grid-cols-9 gap-0.5 rounded border border-border p-2"
              >
                {Array.from({ length: 81 }, (_, i) => (
                  <span
                    key={i}
                    className={
                      (address.charCodeAt(i % address.length) + i) % 3
                        ? "bg-foreground"
                        : "bg-background"
                    }
                  />
                ))}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {ccy} on {network}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Confirm the network and destination before sending funds. This preview is not a scannable QR code.
                </p>
              </div>
            </div>
            <p className="mb-2 text-xs text-muted-foreground">Deposit address</p>
            <p className="break-all rounded-lg bg-surface p-3 font-mono text-sm">{address}</p>
            <button className={`${secondary} mt-3`} onClick={() => copy(address)}>
              Copy address
            </button>
            {ccy === "XRP" && (
              <div className="mt-4">
                <p className="text-sm">
                  Destination tag (required): <strong className="font-mono">{a.user.uid}</strong>
                </p>
                <button className={`${secondary} mt-2`} onClick={() => copy(a.user.uid)}>
                  Copy tag
                </button>
              </div>
            )}
          </section>
        </div>
        <aside className="space-y-5">
          <div className={panel}>
            <h3 className="font-semibold">Before you deposit</h3>
            <ul className="mt-4 list-disc space-y-3 pl-4 text-sm leading-relaxed text-muted-foreground">
              <li>
                Only use {ccy} on the {network} network.
              </li>
              <li>Deposits below the minimum may not be credited.</li>
              <li>Network confirmations are required before funds become available.</li>
              <li>Only send the supported asset on the selected network.</li>
            </ul>
          </div>
          <form
            className={panel}
            onSubmit={(e) => {
              e.preventDefault();
              if (act((s) => deposit(s, ccy, Number(amount), `${network} deposit`))) setAmount("");
            }}
          >
            <h3 className="font-semibold">Simulate deposit</h3>
            <p className="my-3 text-xs text-muted-foreground">
              Add funds instantly to your account balance.
            </p>
            <input
              className={field}
              type="number"
              min={min}
              step="any"
              required
              aria-label="Deposit amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Amount (${ccy})`}
            />
            <button className={`${primary} mt-4 w-full`}>Add funds</button>
          </form>
        </aside>
      </div>
      <section>
        <h2 className="mb-4 text-xl font-semibold">Recent deposits</h2>
        <ActivityTable items={a.activity.filter((x) => x.type === "deposit").slice(0, 10)} />
      </section>
    </div>
  );
}
