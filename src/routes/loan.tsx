import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { borrow, repayLoan, LOAN_MAX_LTV } from "@/lib/account";
import { useAccount } from "@/lib/store";
import { useAction, usePrices } from "@/components/site/hooks";
import {
  Page,
  Select,
  Field,
  FAQ,
  Empty,
  Heading,
  Metric,
  primary,
  secondary,
  input,
  card,
  fmt,
  useClock,
  metadata,
} from "@/components/investing/ui";
export const Route = createFileRoute("/loan")({
  head: () =>
    metadata(
      "Flexible Loan",
      "Unlock liquidity without selling your crypto. Transparent rates and flexible repayment.",
    ),
  component: Loan,
});
const rates: Record<string, number> = { USDT: 0.058, USDC: 0.052, BTC: 0.028, ETH: 0.034 };
function Loan() {
  const a = useAccount(),
    prices = usePrices(),
    act = useAction(),
    now = useClock();
  const [coin, setCoin] = useState("USDT"),
    [collateral, setCollateral] = useState("BTC"),
    [amount, setAmount] = useState(""),
    [security, setSecurity] = useState("");
  const ltv =
    (Number(amount) * (prices[coin] ?? 0)) / (Number(security) * (prices[collateral] ?? 0));
  const apr = rates[coin]!;
  return (
    <Page
      title="Keep your crypto. Unlock liquidity."
      description="Borrow against your assets without selling them. No fixed repayment date. Pay only for the time you borrow."
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <div className={`${card} space-y-5`}>
          <Heading>Flexible loan</Heading>
          <Select
            label="Borrow asset"
            value={coin}
            onChange={setCoin}
            options={Object.keys(rates)}
          />
          <Field label="Borrow amount">
            <input
              type="number"
              min="0"
              className={input}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Select
            label="Collateral asset"
            value={collateral}
            onChange={setCollateral}
            options={["BTC", "ETH", "SOL", "USDT", "USDC", "OKB"]}
          />
          <Field label="Collateral amount">
            <div className="flex gap-2">
              <input
                className={input}
                type="number"
                min="0"
                value={security}
                onChange={(e) => setSecurity(e.target.value)}
              />
              <button
                className={secondary}
                onClick={() => setSecurity(String(a?.balances[collateral]?.available ?? 0))}
              >
                Max
              </button>
            </div>
          </Field>
          <p className="text-xs text-muted-foreground">
            Available: {fmt(a?.balances[collateral]?.available ?? 0, 8)} {collateral}
          </p>
          <div className="flex justify-between text-sm">
            <span>Initial LTV</span>
            <strong className={ltv > LOAN_MAX_LTV ? "text-down" : "tabular"}>
              {Number.isFinite(ltv) ? fmt(ltv * 100) : "0.00"}%
            </strong>
          </div>
          <progress
            aria-label="Loan to value"
            value={Number.isFinite(ltv) ? Math.min(ltv, 1) : 0}
            max={1}
            className="h-2 w-full accent-foreground"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Max {LOAN_MAX_LTV * 100}%</span>
            <span>Margin call 80%</span>
            <span>Liquidation 90%</span>
          </div>
          <button
            className={primary}
            disabled={
              !(Number(amount) > 0) ||
              !(Number(security) > 0) ||
              !Number.isFinite(ltv) ||
              ltv > LOAN_MAX_LTV ||
              coin === collateral
            }
            onClick={() =>
              act((s) =>
                borrow(
                  s,
                  {
                    borrowCcy: coin,
                    borrowAmount: Number(amount),
                    collateralCcy: collateral,
                    collateralAmount: Number(security),
                    apr,
                  },
                  prices,
                ),
              )
            }
          >
            Borrow {coin}
          </button>
          {coin === collateral && (
            <p className="text-xs text-down">Choose different borrow and collateral assets.</p>
          )}
        </div>
        <div className="space-y-6">
          <div className={`${card} space-y-8`}>
            <Heading>Know your borrowing costs</Heading>
            <Metric label="Annual interest rate" value={`${fmt(apr * 100)}%`} />
            <Metric label="Hourly rate" value={`${fmt((apr * 100) / 8760, 6)}%`} />
            <Metric
              label="Estimated daily interest"
              value={`${fmt((Number(amount) * apr) / 365, 8)} ${coin}`}
            />
          </div>
          <p className="text-sm leading-7 text-muted-foreground">
            LTV changes with market prices. Maintain additional collateral to manage risk. Margin
            call and liquidation levels are informational in this product preview; no automatic liquidation
            engine runs.
          </p>
        </div>
      </div>
      <section>
        <Heading>My loans</Heading>
        {!a?.loans.length ? (
          <Empty text="No outstanding loans" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {a.loans.map((l) => {
              const interest =
                (l.borrowAmount * l.apr * Math.max(0, now - l.startedAt)) / 86400000 / 365;
              return (
                <div key={l.id} className={`${card} space-y-5`}>
                  <h3 className="font-semibold">
                    {fmt(l.borrowAmount, 8)} {l.borrowCcy}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Metric
                      label="Current LTV"
                      value={`${fmt((((l.borrowAmount + interest) * (prices[l.borrowCcy] ?? 0)) / (l.collateralAmount * (prices[l.collateralCcy] ?? 1))) * 100)}%`}
                    />
                    <Metric label="Accrued interest" value={`${fmt(interest, 8)} ${l.borrowCcy}`} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Collateral: {fmt(l.collateralAmount, 8)} {l.collateralCcy}
                  </p>
                  <button className={secondary} onClick={() => act((s) => repayLoan(s, l.id))}>
                    Repay in full · {fmt(l.borrowAmount + interest, 8)} {l.borrowCcy}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <section>
        <Heading>Transparent borrowing rates</Heading>
        <div className="grid gap-4 md:grid-cols-4">
          {Object.entries(rates).map(([c, r]) => (
            <div key={c} className={card}>
              <Metric label={c} value={`${fmt(r * 100)}% APR`} />
              <p className="mt-3 text-xs text-muted-foreground">
                Hourly {fmt((r * 100) / 8760, 6)}%
              </p>
            </div>
          ))}
        </div>
      </section>
      <FAQ
        items={[
          [
            "When do I need to repay?",
            "Flexible loans have no fixed maturity. Repay principal plus accrued interest at any time to release all collateral.",
          ],
          [
            "Why can repayment fail?",
            "You need enough of the borrowed asset to cover the principal and interest. Convert or deposit a small additional amount before repaying.",
          ],
          [
            "How is LTV calculated?",
            "The USD value of principal plus interest divided by collateral value. Prices move, so your LTV can rise even without borrowing more.",
          ],
        ]}
      />
    </Page>
  );
}
