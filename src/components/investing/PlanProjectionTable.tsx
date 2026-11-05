import { calculateInvestmentPlanProjection } from "@/lib/investments";
import type { PublicInvestmentPlan } from "@/lib/investments";

type PlanProjectionTableProps = {
  plans: Pick<
    PublicInvestmentPlan,
    "id" | "name" | "daily_rate" | "duration_days" | "minimum_amount" | "maximum_amount"
  >[];
};

const formatAmount = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function PlanProjectionTable({ plans }: PlanProjectionTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr>
              {[
                "Plan / term",
                "Deposit",
                "Daily rate",
                "Daily return",
                "Term total",
                "Term return",
                "Simple annualized",
              ].map((heading) => (
                <th
                  className="whitespace-nowrap border-b border-border bg-surface px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  key={heading}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plans.flatMap((plan) =>
              [
                { label: "Minimum", principal: Number(plan.minimum_amount) },
                { label: "Maximum", principal: Number(plan.maximum_amount) },
              ].map(({ label, principal }) => {
                const rate = Number(plan.daily_rate);
                const projection = calculateInvestmentPlanProjection(
                  principal,
                  rate,
                  Number(plan.duration_days),
                );

                return (
                  <tr
                    className="border-b border-border last:border-0 transition-colors hover:bg-surface/70"
                    key={`${plan.id}-${label}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="font-medium">{plan.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {label} · {plan.duration_days} days
                      </span>
                    </td>
                    <td className="tabular whitespace-nowrap px-4 py-3">
                      {formatAmount(principal)} USDT
                    </td>
                    <td className="tabular whitespace-nowrap px-4 py-3">{rate}%</td>
                    <td className="tabular whitespace-nowrap px-4 py-3">
                      {formatAmount(projection.dailyReturn)} USDT
                    </td>
                    <td className="tabular whitespace-nowrap px-4 py-3">
                      {formatAmount(projection.termTotal)} USDT
                    </td>
                    <td className="tabular whitespace-nowrap px-4 py-3">
                      {formatAmount(projection.termReturn)} USDT ·{" "}
                      {(rate * Number(plan.duration_days)).toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                      })}
                      %
                    </td>
                    <td className="tabular whitespace-nowrap px-4 py-3">
                      {projection.simpleAnnualizedRate.toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                      })}
                      %
                    </td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        Illustrative simple, non-compounding arithmetic using the displayed daily rate and plan
        term. Annualized figures are not a forecast or guaranteed return. Actual accrual uses the
        approved position’s saved terms and is capped at maturity.
      </p>
    </div>
  );
}
