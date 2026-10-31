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
import { CoinSelect, networks, copy, ActivityTable } from "@/components/account/Shared";

const BTC_RECEIVING_ADDRESS = "bc1qndlng67c66xa5c9zdwepsqmhxuzd3mustsxrs8";
const EVM_RECEIVING_ADDRESS = "0x49dDFbC79F1AE78dD74Be29A77277Ff4E8cd21e2";
const USDT_TRC20_ADDRESS = "TDtrsDZXLHUNCZT5EterdcUZcoCL9RN5LM";
const SOLANA_RECEIVING_ADDRESS = "E278aFiGAouQbuQBRPFi1BysntRb5GeNUHNiwmuPQMer";
const XRP_RECEIVING_ADDRESS = "rw7d4Tup5apDTe98UtpFYAzWkLa6meHKQo";
const DOGE_RECEIVING_ADDRESS = "DHWNuk2g9jDMnD18sZ3wjTARzhhvG1eZtx";
const depositNetworks = (ccy: string) =>
  ccy === "ETH"
    ? ["Ethereum", "X Layer"]
    : ccy === "USDT"
      ? [...networks(ccy), "BNB Smart Chain"]
      : ccy === "TRX"
        ? ["TRON"]
        : ccy === "DOGE"
          ? ["Dogecoin"]
          : networks(ccy);

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
  const [network, setNetwork] = useState(depositNetworks(initial)[0]!);
  const [amount, setAmount] = useState("");
  if (!a) return null;
  const isBitcoinWallet = ccy === "BTC" && network === "Bitcoin";
  const isEvmWallet =
    (ccy === "ETH" && network === "Ethereum") ||
    (ccy === "USDT" && (network === "ERC20" || network === "BNB Smart Chain"));
  const isTronWallet =
    (ccy === "USDT" && network === "TRC20") || (ccy === "TRX" && network === "TRON");
  const isSolanaWallet = ccy === "SOL" && network === "Solana";
  const isXrpWallet = ccy === "XRP" && network === "XRP Ledger";
  const isDogecoinWallet = ccy === "DOGE" && network === "Dogecoin";
  const receivingAddress = isBitcoinWallet
    ? BTC_RECEIVING_ADDRESS
    : isEvmWallet
      ? EVM_RECEIVING_ADDRESS
      : isTronWallet
        ? USDT_TRC20_ADDRESS
        : isSolanaWallet
          ? SOLANA_RECEIVING_ADDRESS
          : isXrpWallet
            ? XRP_RECEIVING_ADDRESS
            : isDogecoinWallet
              ? DOGE_RECEIVING_ADDRESS
              : null;
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
                setNetwork(depositNetworks(c)[0]!);
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
              {depositNetworks(ccy).map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
            <div className="mt-4 flex justify-between text-xs text-muted-foreground">
              <span>
                Minimum: {min} {ccy}
              </span>
              <span>
                {isBitcoinWallet
                  ? "3 confirmations"
                  : isEvmWallet || isTronWallet
                    ? "12 confirmations"
                    : isSolanaWallet || isXrpWallet || isDogecoinWallet
                      ? "Address configured"
                      : "No wallet configured"}
              </span>
            </div>
          </section>
          <section className={panel}>
            <h2 className="mb-5 text-lg font-semibold">3. Deposit details</h2>
            {receivingAddress ? (
              <>
                <p className="mb-5 text-xs leading-relaxed text-muted-foreground">
                  Administrator {ccy} receiving address. Send {ccy} only over the {network} network.
                  On-chain deposits are not monitored or credited automatically, so your account
                  balance will not update from a transfer.
                </p>
                <p className="mb-2 text-xs text-muted-foreground">Deposit address</p>
                <p className="break-all rounded-lg bg-surface p-3 font-mono text-sm">
                  {receivingAddress}
                </p>
                <button className={`${secondary} mt-3`} onClick={() => copy(receivingAddress)}>
                  Copy {ccy} address
                </button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No receiving wallet is configured for {ccy} on {network}. Do not send funds.
              </p>
            )}
          </section>
        </div>
        <aside className="space-y-5">
          <div className={panel}>
            <h3 className="font-semibold">Before you deposit</h3>
            <ul className="mt-4 list-disc space-y-3 pl-4 text-sm leading-relaxed text-muted-foreground">
              {receivingAddress ? (
                <>
                  <li>
                    Only use {ccy} on the {network} network.
                  </li>
                  <li>{ccy} transfers are not detected or credited automatically in this app.</li>
                  <li>
                    Confirm the destination before sending; blockchain transfers cannot be reversed.
                  </li>
                </>
              ) : (
                <li>No receiving wallet is configured for this selection. Do not send funds.</li>
              )}
            </ul>
          </div>
          <form
            className={panel}
            onSubmit={(e) => {
              e.preventDefault();
              if (act((s) => deposit(s, ccy, Number(amount), `${network} deposit`))) setAmount("");
            }}
          >
            <h3 className="font-semibold">Preview balance credit</h3>
            <p className="my-3 text-xs text-muted-foreground">
              This changes only your local account balance. It does not send, detect, or verify a
              blockchain deposit.
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
