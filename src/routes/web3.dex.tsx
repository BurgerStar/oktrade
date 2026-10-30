import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownUp, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { convert } from "@/lib/account";
import { useAccount } from "@/lib/store";
import { useAction, usePrices, useAuthGuard } from "@/components/site/hooks";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Page,
  Tabs,
  Select,
  Field,
  primary,
  secondary,
  input,
  card,
  fmt,
  metadata,
} from "@/components/investing/ui";
export const Route = createFileRoute("/web3/dex")({
  head: () =>
    metadata("DEX Swap", "Compare a swap quote with live token prices and transparent fees."),
  component: Dex,
});
function Dex() {
  const a = useAccount(),
    act = useAction(),
    guard = useAuthGuard(),
    prices = usePrices();
  const [tab, setTab] = useState("Swap"),
    [chain, setChain] = useState("Ethereum"),
    [destination, setDestination] = useState("Arbitrum"),
    [from, setFrom] = useState("USDT"),
    [to, setTo] = useState("ETH"),
    [amount, setAmount] = useState(""),
    [slippage, setSlippage] = useState("0.5");
  const rate = ((prices[from] ?? 0) / (prices[to] ?? 1)) * 0.997,
    received = Number(amount) * rate;
  const valid =
    Number(amount) > 0 &&
    Number.isFinite(received) &&
    received > 0 &&
    from !== to &&
    Number(slippage) > 0 &&
    Number(slippage) <= 50;
  return (
    <Page
      title="Your assets. The best route."
      eyebrow="OK Trade DEX"
      description="Explore decentralized swaps with live reference prices. Swap estimates settle inside your OK Trade account, not on-chain."
    >
      <div className="mx-auto max-w-xl">
        <div className={`${card} space-y-6`}>
          <div className="flex items-center justify-between">
            <Tabs items={["Swap", "Bridge"]} value={tab} onChange={setTab} />
            <Popover>
              <PopoverTrigger asChild>
                <button className={secondary} aria-label="Slippage settings">
                  <Settings2 className="size-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="space-y-4 rounded-2xl border-border bg-card">
                <p className="font-semibold">Slippage tolerance</p>
                <Tabs items={["0.1", "0.5", "1"]} value={slippage} onChange={setSlippage} />
                <Field label="Custom slippage %">
                  <input
                    className={input}
                    type="number"
                    min="0.01"
                    max="50"
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                  />
                </Field>
                <p className="text-xs text-muted-foreground">
                  Tolerance informs the minimum quote. Swaps execute at the displayed rate.
                </p>
              </PopoverContent>
            </Popover>
          </div>
          <Select
            label="From network"
            value={chain}
            onChange={setChain}
            options={["Ethereum", "Arbitrum", "Base", "Solana", "Polygon", "X Layer"]}
          />
          {tab === "Bridge" && (
            <Select
              label="Destination network"
              value={destination}
              onChange={setDestination}
              options={["Arbitrum", "Ethereum", "Base", "Solana", "Polygon", "X Layer"]}
            />
          )}
          <div className="space-y-4 rounded-2xl bg-surface p-5">
            <Select
              label="You pay"
              value={from}
              onChange={setFrom}
              options={["USDT", "USDC", "ETH", "BTC", "SOL", "OKB"]}
            />
            <Field label="Amount">
              <input
                type="number"
                min="0"
                placeholder="0.00"
                className={`${input} tabular text-2xl`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Balance {fmt(a?.balances[from]?.available ?? 0, 8)} {from}
              </span>
              <button onClick={() => setAmount(String(a?.balances[from]?.available ?? 0))}>
                Max
              </button>
            </div>
          </div>
          <div className="text-center">
            <button
              className={secondary}
              aria-label="Reverse swap tokens"
              onClick={() => {
                setFrom(to);
                setTo(from);
                setAmount("");
              }}
            >
              <ArrowDownUp className="size-4" />
            </button>
          </div>
          <div className="space-y-4 rounded-2xl bg-surface p-5">
            <Select
              label="You receive"
              value={to}
              onChange={setTo}
              options={["ETH", "BTC", "SOL", "USDT", "USDC", "OKB"]}
            />
            <p className="tabular text-3xl font-semibold">{fmt(received, 8)}</p>
            <p className="text-xs text-muted-foreground">
              Reference price ${fmt(prices[to] ?? 0, 4)}
            </p>
          </div>
          <div className="space-y-3 text-sm">
            {[
              ["Best route", "Uniswap V3 → Curve · illustrative"],
              ["Price impact", "0.30% fee"],
              ["Network fee", tab === "Swap" ? "$0.00 · off-chain" : "~$1.24 · estimate only"],
              ["Slippage", `${slippage}%`],
              ["Minimum received", `${fmt(received * (1 - Number(slippage) / 100), 8)} ${to}`],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between gap-5">
                <span className="text-muted-foreground">{l}</span>
                <span className="text-right">{v}</span>
              </div>
            ))}
          </div>
          <button
            className={`${primary} w-full`}
            disabled={!valid || (tab === "Bridge" && chain === destination)}
            onClick={() => {
              if (tab === "Bridge") {
                if (guard())
                  toast.info("Bridge quote prepared", {
                    description: `${amount} ${from}: ${chain} → ${destination}. No assets were moved or network transaction submitted.`,
                  });
                return;
              }
              if (act((s) => convert(s, from, to, Number(amount), rate))) setAmount("");
            }}
          >
            {a
              ? tab === "Swap"
                ? "Swap in account"
                : "Preview bridge"
              : "Log in to continue"}
          </button>
          <p className="text-xs leading-6 text-muted-foreground">
            The route and network estimates are illustrative. No wallet signature, blockchain
            transaction or actual bridge is executed. Swap charges a 0.3% conversion fee.
          </p>
        </div>
      </div>
    </Page>
  );
}
