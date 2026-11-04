import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Rocket } from "lucide-react";
import { toast } from "sonner";
import { useAccount } from "@/lib/store";
import { useAuthGuard } from "@/components/site/hooks";
import {
  getMyInvestmentPortfolio,
  getMyInvestmentRequests,
  requestInvestmentJumpstart,
} from "@/lib/investments";
import {
  Page,
  Tabs,
  Select,
  Field,
  Modal,
  Heading,
  Metric,
  primary,
  secondary,
  input,
  card,
  fmt,
  duration,
  useClock,
  metadata,
} from "@/components/investing/ui";
export const Route = createFileRoute("/jumpstart")({
  head: () =>
    metadata(
      "Jumpstart",
      "Discover early-stage projects and participate in token mining with OK Trade Jumpstart.",
    ),
  component: Jumpstart,
});
const projects = [
  { name: "Nexus", ticker: "NEX", allocation: 20000000, rate: 0.024, status: "Ongoing", days: 7 },
  {
    name: "Layer Horizon",
    ticker: "LHZ",
    allocation: 12000000,
    rate: 0.018,
    status: "Ongoing",
    days: 7,
  },
  {
    name: "Orbit AI",
    ticker: "ORAI",
    allocation: 8000000,
    rate: 0.032,
    status: "Upcoming",
    days: 14,
  },
  {
    name: "Vertex Network",
    ticker: "VTX",
    allocation: 15000000,
    rate: 0.015,
    status: "Upcoming",
    days: 21,
  },
  {
    name: "Aether Protocol",
    ticker: "AETH",
    allocation: 25000000,
    rate: 0.021,
    status: "Completed",
    days: 0,
  },
  {
    name: "Sonic Mesh",
    ticker: "MESH",
    allocation: 18000000,
    rate: 0.027,
    status: "Completed",
    days: 0,
  },
];
function Jumpstart() {
  const a = useAccount();
  const guard = useAuthGuard();
  const now = useClock();
  const queryClient = useQueryClient();
  const portfolioQuery = useQuery({
    queryKey: ["my-investment-portfolio", a?.user.uid],
    queryFn: getMyInvestmentPortfolio,
    enabled: !!a,
    retry: false,
  });
  const requestsQuery = useQuery({
    queryKey: ["my-investment-requests", a?.user.uid],
    queryFn: getMyInvestmentRequests,
    enabled: !!a,
    retry: false,
  });
  const stakeMutation = useMutation({
    mutationFn: ({ name, asset, value }: { name: string; asset: "USDT" | "OKB"; value: number }) =>
      requestInvestmentJumpstart(name, asset, value),
    onSuccess: async (id) => {
      toast.success("Jumpstart stake request submitted", {
        description: `Reference IV-${id.replaceAll("-", "").toUpperCase()}. Funds move only after admin approval.`,
      });
      setProject(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-investment-portfolio"] }),
        queryClient.invalidateQueries({ queryKey: ["my-investment-requests"] }),
      ]);
    },
    onError: (error) => toast.error(error.message || "Unable to submit Jumpstart stake request"),
  });
  const [tab, setTab] = useState("Ongoing"),
    [project, setProject] = useState<(typeof projects)[number] | null>(null),
    [coin, setCoin] = useState("USDT"),
    [amount, setAmount] = useState("");
  const anchor = now ? Math.floor(now / 86400000) * 86400000 : 0;
  return (
    <Page
      title="Be early to what's next."
      description="Discover emerging projects and submit a USDT or OKB stake for administrator approval."
      hero={
        <span className="inline-flex items-center gap-3 rounded-full border border-border px-5 py-3">
          <Rocket className="size-5" />
          The next generation starts here
        </span>
      }
    >
      <Tabs items={["Ongoing", "Upcoming", "Completed"]} value={tab} onChange={setTab} />
      <div className="grid gap-6 md:grid-cols-2">
        {projects
          .filter((p) => p.status === tab)
          .map((p, i) => {
            const subs =
              portfolioQuery.data?.filter(
                (position) => position.plan_name === `Jumpstart · ${p.name}`,
              ) ?? [];
            const pendingStake = requestsQuery.data?.some(
              (request) =>
                request.request_type === "subscribe" &&
                request.plan_name === `Jumpstart · ${p.name}` &&
                request.status === "pending",
            );
            return (
              <article className={`${card} space-y-6`} key={p.name}>
                <div className="flex items-center justify-between">
                  <span className="grid size-14 place-items-center rounded-2xl bg-foreground text-2xl font-bold text-background">
                    {p.ticker[0]}
                  </span>
                  <span className="rounded-full bg-surface-2 px-3 py-1 text-xs">{p.status}</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {p.name}{" "}
                    <span className="text-sm font-normal text-muted-foreground">{p.ticker}</span>
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Stake USDT or OKB · 7-day lock · Token mining
                  </p>
                </div>
                <Metric
                  label="Total token allocation"
                  value={`${fmt(p.allocation, 0)} ${p.ticker}`}
                />
                <progress
                  className="h-2 w-full accent-foreground"
                  max={100}
                  value={p.status === "Completed" ? 100 : 64 + i * 11}
                  aria-label="Allocation progress"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    {p.status === "Completed"
                      ? "Distribution complete"
                      : `${64 + i * 11}% participation`}
                  </span>
                  <span className="tabular">
                    {p.status === "Completed"
                      ? "Ended"
                      : duration(anchor + p.days * 86400000 - now)}
                  </span>
                </div>
                {subs.length > 0 && (
                  <div className="rounded-xl bg-surface p-4 text-sm">
                    <strong>You're staked</strong>
                    {subs.map((position) => (
                      <p key={position.id} className="mt-2">
                        {fmt(Number(position.principal), 4)} {position.asset} ·{" "}
                        {position.status.replaceAll("_", " ")} · Est. mining rewards:{" "}
                        {fmt(
                          Number(position.principal) *
                            p.rate *
                            Math.min(
                              1,
                              Math.max(0, now - new Date(position.started_at).getTime()) /
                                (7 * 86400000),
                            ),
                          6,
                        )}{" "}
                        {p.ticker}
                      </p>
                    ))}
                  </div>
                )}
                {pendingStake && (
                  <p className="text-sm text-muted-foreground">
                    A stake request is awaiting administrator approval. Your balance has not been
                    changed.
                  </p>
                )}
                {p.status === "Ongoing" && (
                  <button
                    className={primary}
                    onClick={() => {
                      if (guard()) {
                        setProject(p);
                        setAmount("");
                      }
                    }}
                  >
                    Stake {p.ticker}
                  </button>
                )}
                {p.status === "Upcoming" && (
                  <p className="text-sm">
                    Staking opens in {duration(anchor + p.days * 86400000 - now)}
                  </p>
                )}
              </article>
            );
          })}
      </div>
      <section>
        <Heading>From discovery to distribution</Heading>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            [
              "01",
              "Choose a project",
              "Explore the allocation, token mechanics and staking period.",
            ],
            [
              "02",
              "Stake your assets",
              "Subscribe with USDT or OKB. Your stake is locked for seven days.",
            ],
            [
              "03",
              "Track your estimate",
              "See mining rewards here. Redeem principal from Simple Earn at maturity.",
            ],
          ].map(([n, t, d]) => (
            <div className={card} key={n}>
              <p className="mb-6 text-4xl font-bold text-muted-foreground">{n}</p>
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          Projects are illustrative launches. Mining reward estimates are illustrative only and are
          not credited to account balances.
        </p>
      </section>
      <Modal
        title={`Stake for ${project?.name ?? ""}`}
        open={!!project}
        onClose={() => setProject(null)}
      >
        <Select label="Staking asset" value={coin} onChange={setCoin} options={["USDT", "OKB"]} />
        <Field label="Amount">
          <div className="flex gap-2">
            <input
              className={input}
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button
              className={secondary}
              onClick={() => setAmount(String(a?.balances[coin]?.available ?? 0))}
            >
              Max
            </button>
          </div>
        </Field>
        <p className="text-sm text-muted-foreground">
          7-day lock. No interest is credited. Mining estimates are illustrative and are not
          spendable rewards. Your balance changes only after administrator approval.
        </p>
        <button
          className={primary}
          disabled={
            stakeMutation.isPending ||
            !(Number(amount) > 0) ||
            !Number.isFinite(Number(amount)) ||
            Number(amount) > (a?.balances[coin]?.available ?? 0)
          }
          onClick={async () => {
            if (project && (coin === "USDT" || coin === "OKB"))
              stakeMutation.mutate({
                name: project.name,
                asset: coin,
                value: Number(amount),
              });
          }}
        >
          {stakeMutation.isPending ? "Submitting…" : "Submit for admin approval"}
        </button>
      </Modal>
    </Page>
  );
}
