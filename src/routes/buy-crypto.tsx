import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, ShieldCheck, Zap } from "lucide-react";
import { FIAT } from "@/lib/coins";
import { buyWithFiat, sellForFiat } from "@/lib/account";
import { usePrefs } from "@/lib/store";
import { useAction, usePrices } from "@/components/site/hooks";
import {
  AssetSelect,
  FAQ,
  FiatSelect,
  Modal,
  Page,
  Row,
  field,
  finite,
  meta,
  methods,
  primary,
  useCountdown,
} from "@/components/buy-auth/shared";
export const Route = createFileRoute("/buy-crypto")({
  head: () =>
    meta(
      "Buy crypto",
      "Buy and sell crypto in a few simple steps. Compare payment methods and preview your live quote.",
    ),
  component: BuyCrypto,
});
function BuyCrypto() {
  const prefs = usePrefs();
  const [fiatCode, setFiat] = useState(prefs.currency);
  const fiat = FIAT.find((f) => f.code === fiatCode) ?? FIAT[0];
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [asset, setAsset] = useState("BTC");
  const [amount, setAmount] = useState("100");
  const [method, setMethod] = useState(methods[0]!);
  const [quote, setQuote] = useState<{
    rate: number;
    amount: number;
    fee: number;
    crypto: number;
  } | null>(null);
  const prices = usePrices();
  const act = useAction();
  const timer = useCountdown(!!quote, 30);
  const value = finite(amount);
  const rate = (prices[asset] ?? 0) * fiat.rate;
  const feePct = method === "Bank transfer" ? 0 : 0.015;
  const fee = value * feePct;
  const crypto = rate > 0 ? (side === "buy" ? value - fee : value) / rate : 0;
  const min = 10 * fiat.rate;
  const max = 50000 * fiat.rate;
  const valid = value >= min && value <= max && rate > 0;
  const refresh = () => {
    setQuote({ rate, amount: value, fee, crypto });
    timer.refresh();
  };
  return (
    <Page
      title="Crypto. In a few clicks."
      subtitle="Your next move starts here. Buy and sell crypto with the payment methods you already know."
    >
      <div className="mt-12 grid items-center gap-16 lg:grid-cols-2">
        <div>
          <div className="mb-8 inline-flex rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-widest">
            Express buy
          </div>
          <h2 className="max-w-lg text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            A simple way into a world of possibilities.
          </h2>
          <div className="mt-10 space-y-6">
            {[
              [CreditCard, "Pay your way", "Cards, bank transfers and leading payment providers."],
              [Zap, "From cash to crypto", "Get a clear quote before you confirm."],
              [ShieldCheck, "You stay in control", "Transparent fees. No hidden surprises."],
            ].map(([Icon, title, text]) => {
              const I = Icon as typeof CreditCard;
              return (
                <div key={String(title)} className="flex gap-4">
                  <I className="mt-1 size-6 shrink-0" />
                  <div>
                    <h3 className="font-semibold">{String(title)}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{String(text)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <div className="mb-7 grid grid-cols-2 rounded-full bg-surface p-1">
            {(["buy", "sell"] as const).map((s) => (
              <button
                key={s}
                className={`rounded-full py-3 font-semibold ${s === side ? "bg-foreground text-background" : "text-muted-foreground"}`}
                onClick={() => setSide(s)}
              >
                {s === "buy" ? "Buy" : "Sell"}
              </button>
            ))}
          </div>
          <label className="block rounded-2xl border border-border p-4">
            <span className="text-sm text-muted-foreground">
              {side === "buy" ? "Spend" : "Sell crypto worth"}
            </span>
            <div className="mt-3 flex gap-4">
              <input
                aria-label="Fiat amount"
                className="min-w-0 flex-1 bg-transparent text-3xl tabular outline-none"
                inputMode="decimal"
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="w-28">
                <FiatSelect value={fiatCode} onChange={setFiat} />
              </div>
            </div>
          </label>
          <div className="my-4 rounded-2xl border border-border p-4">
            <div className="text-sm text-muted-foreground">
              {side === "buy" ? "Receive" : "Crypto to sell"}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-2xl tabular">{crypto.toFixed(8)}</span>
              <AssetSelect value={asset} onChange={setAsset} />
            </div>
          </div>
          <label className="block text-sm">
            Payment method
            <select
              className={`${field} mt-2`}
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              {methods.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <div className="my-5 space-y-2">
            <Row label="Rate">
              1 {asset} ≈ {rate.toLocaleString()} {fiatCode}
            </Row>
            <Row label="Fee">{(feePct * 100).toFixed(1)}%</Row>
            <p className="text-xs text-muted-foreground">
              Limits: {min.toLocaleString()}–{max.toLocaleString()} {fiatCode}
            </p>
            {!valid && (
              <p role="alert" className="text-sm text-down">
                Enter an amount within these limits.
              </p>
            )}
          </div>
          <button className={`${primary} w-full`} disabled={!valid} onClick={refresh}>
            Review {side}
          </button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            No real card or bank payment is collected during the preview.
          </p>
        </div>
      </div>
      <section className="mt-24">
        <h2 className="text-3xl font-bold tracking-tight">How to buy crypto</h2>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {[
            ["Choose your crypto", "Pick an asset and enter how much you want to spend."],
            ["Choose how to pay", "Compare payment options and see your fee upfront."],
            ["Make it yours", "Review the quote and confirm your crypto order."],
          ].map(([title, text], i) => (
            <div key={title} className="rounded-2xl border border-border p-7">
              <span className="text-4xl font-bold text-muted-foreground">0{i + 1}</span>
              <h3 className="mt-6 text-xl font-semibold">{title}</h3>
              <p className="mt-3 text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap justify-center gap-8 border-y border-border py-8 font-semibold text-muted-foreground">
          {methods.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </section>
      <FAQ
        items={[
          [
            "What fees will I pay?",
            "Bank transfer has a 0% fee. Cards, mobile wallets and third-party providers have a 1.5% fee, shown before confirmation.",
          ],
          [
            "How long is my quote valid?",
            "Your review quote is locked for 30 seconds. Refresh it if the countdown expires.",
          ],
          [
            "Is this a real purchase?",
            "This is a wallet-level preview for the OK Trade experience. It does not move funds outside the account.",
          ],
        ]}
      />
      <Modal
        open={!!quote}
        close={() => setQuote(null)}
        title={`Review ${side}`}
        description="Check your locked quote before confirming the transaction."
      >
        {quote && (
          <>
            <Row label="Rate">
              1 {asset} = {quote.rate.toLocaleString()} {fiatCode}
            </Row>
            <Row label="Crypto">
              {quote.crypto.toFixed(8)} {asset}
            </Row>
            <Row label="Fee">
              {quote.fee.toFixed(2)} {fiatCode}
            </Row>
            <Row label={side === "buy" ? "Total spend" : "Net fiat proceeds"}>
              {(side === "buy" ? quote.amount : quote.amount - quote.fee).toFixed(2)} {fiatCode}
            </Row>
            <Row label="Payment">{method}</Row>
            <p aria-live="polite" className="text-sm text-muted-foreground">
              Quote expires in {timer.left}s
            </p>
            <button className="text-sm underline" onClick={refresh}>
              Refresh quote
            </button>
            <button
              className={`${primary} w-full`}
              disabled={timer.left === 0}
              onClick={() => {
                if (timer.left === 0) return;
                const ok = act((s) =>
                  side === "buy"
                    ? buyWithFiat(s, asset, quote.crypto, quote.amount, fiatCode, method)
                    : sellForFiat(s, asset, quote.crypto, quote.amount - quote.fee, fiatCode),
                );
                if (ok) setQuote(null);
              }}
            >
              Confirm {side}
            </button>
          </>
        )}
      </Modal>
    </Page>
  );
}
