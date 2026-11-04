import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, ShieldCheck, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useAuthGuard } from "@/components/site/hooks";
import { CoinIcon } from "@/components/site/primitives";
import { useAccount, usePrefs } from "@/lib/store";
import {
  getMyInvestmentPortfolio,
  getMyInvestmentRequests,
  getPublicInvestmentPlans,
  requestInvestmentRedemption,
  requestInvestmentSubscription,
  type PublicInvestmentPlan,
} from "@/lib/investments";
import {
  Page,
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
  metadata,
} from "@/components/investing/ui";

export const Route = createFileRoute("/earn")({
  head: () =>
    metadata(
      "Investment plans",
      "Review published plan terms and submit subscriptions or redemptions for administrator approval.",
    ),
  component: Earn,
});

function Earn() {
  const account = useAccount();
  const prefs = usePrefs();
  const guard = useAuthGuard();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<PublicInvestmentPlan | null>(null);
  const [amount, setAmount] = useState("");
  const [riskAccepted, setRiskAccepted] = useState(false);
  const plansQuery = useQuery({
    queryKey: ["public-investment-plans"],
    queryFn: getPublicInvestmentPlans,
    retry: false,
    refetchInterval: 30_000,
  });
  const portfolioQuery = useQuery({
    queryKey: ["my-investment-portfolio", account?.user.uid],
    queryFn: getMyInvestmentPortfolio,
    enabled: !!account,
    retry: false,
    refetchInterval: 30_000,
  });
  const requestsQuery = useQuery({
    queryKey: ["my-investment-requests", account?.user.uid],
    queryFn: getMyInvestmentRequests,
    enabled: !!account,
    retry: false,
    refetchInterval: 15_000,
  });
  const refreshInvestmentData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["my-investment-portfolio"] }),
      queryClient.invalidateQueries({ queryKey: ["my-investment-requests"] }),
      queryClient.invalidateQueries({ queryKey: ["my-transaction-history"] }),
    ]);
  };
  const subscribeMutation = useMutation({
    mutationFn: ({ plan, value }: { plan: PublicInvestmentPlan; value: number }) =>
      requestInvestmentSubscription(plan.id, value),
    onSuccess: async (id) => {
      toast.success("Subscription request submitted", {
        description: `Reference IV-${id.replaceAll("-", "").toUpperCase()}. Funds are unchanged until an admin approves.`,
      });
      setSelectedPlan(null);
      setRiskAccepted(false);
      await refreshInvestmentData();
    },
    onError: (error) => toast.error(error.message || "Unable to submit subscription request"),
  });
  const redeemMutation = useMutation({
    mutationFn: requestInvestmentRedemption,
    onSuccess: async (id) => {
      toast.success("Redemption request submitted", {
        description: `Reference IV-${id.replaceAll("-", "").toUpperCase()}. Principal and return are credited only after admin approval.`,
      });
      await refreshInvestmentData();
    },
    onError: (error) => toast.error(error.message || "Unable to submit redemption request"),
  });
  const investments = portfolioQuery.data ?? [];
  const activePrincipal = investments
    .filter((position) => position.status !== "redeemed")
    .reduce((sum, position) => sum + Number(position.principal), 0);
  const accruedReturn = investments
    .filter((position) => position.status !== "redeemed")
    .reduce((sum, position) => sum + Number(position.accrued_return), 0);

  return (
    <Page
      title="Investment plans"
      description="Every subscription and redemption is reviewed by an administrator. Funds move only after approval."
      hero={
        <div className="flex flex-wrap gap-10">
          <Metric
            label="Active principal"
            value={prefs.hideBalances ? "••••••" : `${fmt(activePrincipal, 2)} USDT`}
          />
          <Metric
            label="Accrued estimate"
            value={prefs.hideBalances ? "••••••" : `${fmt(accruedReturn, 6)} USDT`}
          />
        </div>
      }
    >
      <div className="grid gap-5 md:grid-cols-3">
        <div className={card}>
          <ShieldCheck className="mb-4 size-7" />
          <h2 className="font-semibold">Admin-approved subscriptions</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A request does not reserve or debit your balance. USDT is deducted only if an admin
            approves it and your available balance still covers it.
          </p>
        </div>
        <div className={card}>
          <TrendingUp className="mb-4 size-7" />
          <h2 className="font-semibold">Server-calculated accrual</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Return is calculated from the approved position’s saved rate and start time. Fixed-term
            accrual stops at maturity.
          </p>
        </div>
        <div className={card}>
          <Clock3 className="mb-4 size-7" />
          <h2 className="font-semibold">Admin-approved redemptions</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Mature positions can request redemption. Principal and accrued return are credited
            together only when an admin approves.
          </p>
        </div>
      </div>

      <section>
        <Heading>Published plans</Heading>
        {plansQuery.isPending ? (
          <p className="text-sm text-muted-foreground">Loading published plans…</p>
        ) : plansQuery.isError ? (
          <div className={`${card} space-y-3 text-sm`}>
            <p className="font-medium">Investment plans are unavailable.</p>
            <p className="text-muted-foreground">
              {plansQuery.error instanceof Error
                ? plansQuery.error.message
                : "The published plans service could not be reached."}
            </p>
            <button
              type="button"
              className={secondary}
              onClick={() => void plansQuery.refetch()}
              disabled={plansQuery.isFetching}
            >
              {plansQuery.isFetching ? "Retrying…" : "Retry"}
            </button>
          </div>
        ) : plansQuery.data?.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plansQuery.data.map((plan) => (
              <article
                className={`${card} flex flex-col`}
                key={plan.id}
                data-featured={plan.featured}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">{plan.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {plan.duration_days} day fixed term
                    </p>
                  </div>
                  {plan.featured && (
                    <span className="rounded-full border border-border px-3 py-1 text-xs">
                      Featured
                    </span>
                  )}
                </div>
                <div className="my-6 rounded-xl bg-surface p-4">
                  <p className="text-sm text-muted-foreground">Daily rate</p>
                  <p className="mt-1 text-2xl font-semibold">{fmt(Number(plan.daily_rate), 4)}%</p>
                </div>
                <dl className="mb-6 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Minimum</dt>
                    <dd>{fmt(Number(plan.minimum_amount), 2)} USDT</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Maximum</dt>
                    <dd>{fmt(Number(plan.maximum_amount), 2)} USDT</dd>
                  </div>
                  {!!plan.bonus_label && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Plan details</dt>
                      <dd className="text-right">{plan.bonus_label}</dd>
                    </div>
                  )}
                </dl>
                <button
                  type="button"
                  className={`${primary} mt-auto w-full`}
                  onClick={() => {
                    if (!guard()) return;
                    setSelectedPlan(plan);
                    setAmount("");
                    setRiskAccepted(false);
                  }}
                >
                  Request subscription
                </button>
              </article>
            ))}
          </div>
        ) : (
          <Empty text="No plans are currently published" />
        )}
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Illustrative accrual = principal × daily rate × elapsed days. Displayed estimates are not
          guaranteed returns. The server calculates the actual amount at approved redemption.
        </p>
      </section>

      {account && (
        <>
          <section>
            <Heading>My investments</Heading>
            {portfolioQuery.isError ? (
              <p className="text-sm text-destructive">
                {portfolioQuery.error instanceof Error
                  ? portfolioQuery.error.message
                  : "Your investments could not be loaded."}
              </p>
            ) : portfolioQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Loading your positions…</p>
            ) : investments.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {investments.map((position) => {
                  const maturity = new Date(position.redeemable_at).getTime();
                  const canRequestRedemption =
                    position.status === "active" &&
                    (position.duration_days === 0 || Date.now() >= maturity);
                  return (
                    <article className={card} key={position.id}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">{position.plan_name}</h3>
                          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                            <CoinIcon symbol={position.asset} />
                            {position.asset} · {position.duration_days || "Flexible"}{" "}
                            {position.duration_days ? "days" : ""}
                          </p>
                        </div>
                        <span className="rounded-full border border-border px-3 py-1 text-xs capitalize">
                          {position.status.replaceAll("_", " ")}
                        </span>
                      </div>
                      <div className="my-5 grid grid-cols-2 gap-4">
                        <Metric
                          label="Principal"
                          value={`${fmt(Number(position.principal), 6)} ${position.asset}`}
                        />
                        <Metric
                          label="Accrued estimate"
                          value={`${fmt(Number(position.accrued_return), 6)} ${position.asset}`}
                        />
                      </div>
                      <p className="mb-4 text-xs text-muted-foreground">
                        Started {new Date(position.started_at).toLocaleString()}
                        {position.duration_days > 0 &&
                          ` · Matures ${new Date(position.redeemable_at).toLocaleString()}`}
                      </p>
                      {position.status === "active" ? (
                        <button
                          type="button"
                          className={secondary}
                          disabled={!canRequestRedemption || redeemMutation.isPending}
                          onClick={() => redeemMutation.mutate(position.id)}
                        >
                          {canRequestRedemption ? "Request redemption" : "Locked until maturity"}
                        </button>
                      ) : position.status === "redemption_pending" ? (
                        <p className="text-sm text-muted-foreground">
                          Redemption is awaiting administrator approval.
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">This investment is closed.</p>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <Empty text="No investments yet" />
            )}
          </section>

          <section>
            <Heading>Investment requests</Heading>
            {requestsQuery.isError ? (
              <p className="text-sm text-destructive">
                {requestsQuery.error instanceof Error
                  ? requestsQuery.error.message
                  : "Investment requests could not be loaded."}
              </p>
            ) : requestsQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Loading your requests…</p>
            ) : requestsQuery.data?.length ? (
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-surface text-muted-foreground">
                    <tr>
                      <th className="p-4 font-normal">Reference</th>
                      <th className="p-4 font-normal">Request</th>
                      <th className="p-4 font-normal">Amount</th>
                      <th className="p-4 font-normal">Submitted</th>
                      <th className="p-4 font-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requestsQuery.data.map((request) => (
                      <tr className="border-t border-border" key={request.id}>
                        <td className="p-4 font-mono text-xs">{request.reference}</td>
                        <td className="p-4 capitalize">
                          {request.plan_name} · {request.request_type}
                        </td>
                        <td className="p-4">
                          {fmt(Number(request.amount), 6)} {request.asset}
                        </td>
                        <td className="p-4">{new Date(request.created_at).toLocaleString()}</td>
                        <td className="p-4">
                          <span className="capitalize">{request.status}</span>
                          {request.review_note && (
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {request.review_note}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty text="No investment requests" />
            )}
          </section>
        </>
      )}

      <FAQ
        items={[
          [
            "When are subscription funds deducted?",
            "Only after an administrator approves the subscription. Approval also checks that your available USDT still covers the request.",
          ],
          [
            "How is return calculated?",
            "Return is calculated on the server from the approved principal, saved daily plan rate, and elapsed time. Fixed-term plans stop accruing at maturity.",
          ],
          [
            "When are principal and return credited?",
            "Only after the investment matures, you request redemption, and an administrator approves that request.",
          ],
        ]}
      />

      <Modal
        title={`Request ${selectedPlan?.name ?? "subscription"}`}
        description="Submitting a request does not reserve or debit your balance."
        open={!!selectedPlan}
        onClose={() => {
          setSelectedPlan(null);
          setRiskAccepted(false);
        }}
      >
        {selectedPlan && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              {selectedPlan.duration_days}-day term · {fmt(Number(selectedPlan.daily_rate), 4)}%
              daily · Minimum {fmt(Number(selectedPlan.minimum_amount), 2)} USDT
            </p>
            <Field label="Subscription amount · USDT">
              <div className="flex gap-2">
                <input
                  className={input}
                  type="number"
                  min={Number(selectedPlan.minimum_amount)}
                  max={Number(selectedPlan.maximum_amount)}
                  step="any"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
                <button
                  type="button"
                  className={secondary}
                  onClick={() =>
                    setAmount(
                      String(
                        Math.min(
                          Number(selectedPlan.maximum_amount),
                          account?.balances.USDT?.available ?? 0,
                        ),
                      ),
                    )
                  }
                >
                  Max
                </button>
              </div>
            </Field>
            <p className="text-xs text-muted-foreground">
              Current available balance: {fmt(account?.balances.USDT?.available ?? 0, 6)} USDT.
              Balance is checked again by the server when an admin approves.
            </p>
            <div className={card}>
              <Metric
                label="Illustrative full-term return"
                value={`${fmt(
                  (Number(amount) * Number(selectedPlan.daily_rate) * selectedPlan.duration_days) /
                    100,
                  6,
                )} USDT`}
              />
            </div>
            <label className="flex gap-3 text-sm">
              <input
                type="checkbox"
                checked={riskAccepted}
                onChange={(event) => setRiskAccepted(event.target.checked)}
              />
              I understand the displayed return is an estimate and the request needs administrator
              approval.
            </label>
            <button
              type="button"
              className={`${primary} w-full`}
              disabled={
                !riskAccepted ||
                subscribeMutation.isPending ||
                !Number.isFinite(Number(amount)) ||
                Number(amount) < Number(selectedPlan.minimum_amount) ||
                Number(amount) > Number(selectedPlan.maximum_amount) ||
                Number(amount) > (account?.balances.USDT?.available ?? 0)
              }
              onClick={() =>
                subscribeMutation.mutate({ plan: selectedPlan, value: Number(amount) })
              }
            >
              {subscribeMutation.isPending ? "Submitting…" : "Submit for admin approval"}
            </button>
          </div>
        )}
      </Modal>
    </Page>
  );
}
