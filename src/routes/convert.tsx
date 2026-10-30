import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownUp, Check, Zap, Wallet } from "lucide-react";
import { convert } from "@/lib/account";
import { useAccount } from "@/lib/store";
import { useAction, usePrices } from "@/components/site/hooks";
import {
  AssetSelect,
  FAQ,
  Modal,
  Page,
  Row,
  finite,
  meta,
  primary,
  useCountdown,
} from "@/components/buy-auth/shared";
export const Route = createFileRoute("/convert")({
  head: () =>
    meta("Convert", "Convert crypto instantly with zero fees and transparent live quotes."),
  component: ConvertPage,
});
function ConvertPage() {
  const account = useAccount();
  const prices = usePrices();
  const act = useAction();
  const [from, setFrom] = useState("USDT");
  const [to, setTo] = useState("BTC");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<{ rate: number; amount: number } | null>(null);
  const timer = useCountdown(!!quote, 10);
  const rate = (prices[from] ?? 0) / (prices[to] ?? 0);
  const value = finite(amount);
  const balance = account?.balances[from]?.available ?? 0;
  const valid = value > 0 && from !== to && Number.isFinite(rate) && rate > 0;
  const refresh = () => {
    setQuote({ rate, amount: value });
    timer.refresh();
  };
  return (
    <Page
      title="Less friction. More crypto."
      subtitle="Swap one asset for another in seconds. One quote, zero trading fees."
    >
      <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-border bg-card p-6 md:p-8">
        <h2 className="mb-7 text-2xl font-bold">Convert</h2>
        <div className="rounded-2xl bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">From</span>
            <AssetSelect value={from} onChange={setFrom} />
          </div>
          <input
            aria-label="Amount to convert"
            type="number"
            inputMode="decimal"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-transparent text-3xl tabular outline-none"
          />
          <div className="mt-4 flex justify-between text-xs text-muted-foreground">
            <span className="tabular">
              Available: {balance.toLocaleString()} {from}
            </span>
            <button
              className="font-bold text-foreground"
              onClick={() => setAmount(String(balance))}
            >
              Max
            </button>
          </div>
        </div>
        <div className="my-3 flex justify-center">
          <button
            aria-label="Swap conversion direction"
            className="rounded-full border border-border p-3 hover:bg-surface"
            onClick={() => {
              setFrom(to);
              setTo(from);
              setAmount("");
            }}
          >
            <ArrowDownUp size={20} />
          </button>
        </div>
        <div className="rounded-2xl bg-surface p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">To</span>
            <AssetSelect value={to} onChange={setTo} />
          </div>
          <p className="mt-4 text-3xl tabular">{valid ? (value * rate).toFixed(8) : "0.00"}</p>
        </div>
        <p className="my-5 text-sm text-muted-foreground tabular">
          1 {from} ≈ {Number.isFinite(rate) ? rate.toPrecision(7) : "—"} {to}
        </p>
        {from === to && (
          <p role="alert" className="mb-4 text-sm text-down">
            Choose two different assets.
          </p>
        )}
        <button className={`${primary} w-full`} disabled={!valid} onClick={refresh}>
          Preview conversion
        </button>
      </div>
      <div className="mt-16 grid gap-5 md:grid-cols-3">
        {[
          [Check, "Zero trading fees"],
          [Zap, "Instant settlement"],
          [Wallet, "30+ supported assets"],
        ].map(([Icon, title]) => {
          const I = Icon as typeof Check;
          return (
            <div
              key={String(title)}
              className="flex items-center justify-center gap-3 rounded-2xl border border-border p-7"
            >
              <I size={22} />
              <span className="font-semibold">{String(title)}</span>
            </div>
          );
        })}
      </div>
      <section className="mt-16">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">Recent conversions</h2>
        {account?.activity.filter((a) => a.type === "convert").length ? (
          <div className="divide-y divide-border rounded-2xl border border-border px-6">
            {account.activity
              .filter((a) => a.type === "convert")
              .slice(0, 8)
              .map((a) => (
                <div key={a.id} className="flex flex-wrap justify-between gap-3 py-5">
                  <div>
                    <p className="font-medium">{a.detail}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(a.ts).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-sm">Completed</span>
                </div>
              ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border p-10 text-center text-muted-foreground">
            Your completed conversions will appear here.{" "}
            {account ? "Make your first swap above." : "Log in to view your activity."}
          </div>
        )}
      </section>
      <FAQ
        items={[
          [
            "Are there conversion fees?",
            "There are no trading fees for this conversion. The preview shows exactly how much you will receive.",
          ],
          [
            "Why does the quote expire?",
            "Prices move continuously. A preview locks your exchange rate for 10 seconds; refresh to get a new quote.",
          ],
          [
            "Which balance can I convert?",
            "You can convert your available asset balance. Frozen funds reserved for open orders are not available.",
          ],
        ]}
      />
      <Modal
        open={!!quote}
        close={() => setQuote(null)}
        title="Confirm conversion"
        description="Your rate is locked for 10 seconds. No trading fee applies."
      >
        {quote && (
          <>
            <Row label="You pay">
              {quote.amount} {from}
            </Row>
            <Row label="You receive">
              {(quote.amount * quote.rate).toFixed(8)} {to}
            </Row>
            <Row label="Rate">
              1 {from} = {quote.rate.toPrecision(7)} {to}
            </Row>
            <Row label="Fee">0</Row>
            <p aria-live="polite" className="text-sm text-muted-foreground">
              Quote expires in {timer.left}s
            </p>
            <button className="underline" onClick={refresh}>
              Refresh quote
            </button>
            <button
              className={`${primary} w-full`}
              disabled={timer.left === 0}
              onClick={() => {
                if (timer.left > 0 && act((s) => convert(s, from, to, quote.amount, quote.rate))) {
                  setQuote(null);
                  setAmount("");
                }
              }}
            >
              Convert now
            </button>
          </>
        )}
      </Modal>
    </Page>
  );
}
