import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  CandlestickChart,
  Copy,
  LineChart,
  Lock,
  Percent,
  ShieldCheck,
  Smartphone,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CoinIcon,
  Container,
  PctChange,
  PillTabs,
  SectionTitle,
} from "@/components/site/primitives";
import { useSpotTickers } from "@/components/site/hooks";
import { useAccount } from "@/lib/store";
import { coinName } from "@/lib/coins";
import { formatCompact, formatPrice } from "@/lib/format";
import type { Ticker } from "@/lib/market";
import heroImg from "@/assets/hero-onyx.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OK Trade — Buy, trade and earn crypto" },
      {
        name: "description",
        content:
          "Buy Bitcoin, Ethereum and 300+ cryptocurrencies. Spot and futures trading with live prices, earn, copy trading and trading bots.",
      },
      { property: "og:title", content: "OK Trade — Buy, trade and earn crypto" },
      {
        property: "og:description",
        content:
          "Spot & futures trading, earn, copy trading and bots on a black-and-white exchange.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <>
      <Hero />
      <TickerStrip />
      <MarketsSection />
      <ProductsSection />
      <InvestmentPlansSection />
      <TrustSection />
      <FaqSection />
      <FinalCta />
    </>
  );
}

function Hero() {
  const account = useAccount();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]" />
      <Container className="relative grid items-center gap-10 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-24">
        <div>
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-up" /> Live markets
          </p>
          <h1 className="text-5xl font-extrabold leading-[0.95] tracking-tighter sm:text-6xl lg:text-[88px]">
            Trade crypto
            <br />
            in black
            <br />
            <span className="text-muted-foreground">&amp; white.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            Spot, futures, bots, copy trading and earn — one account, real-time prices, zero noise.
          </p>
          {account ? (
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-full px-8 text-base">
                <Link to="/trade/$instId" params={{ instId: "BTC-USDT" }}>
                  Start trading <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-full px-8 text-base"
              >
                <Link to="/assets">View assets</Link>
              </Button>
            </div>
          ) : (
            <form
              className="mt-8 flex max-w-md gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                navigate({ to: "/signup", search: email ? { email } : {} });
              }}
            >
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                aria-label="Email address"
                className="h-12 rounded-full px-5 text-base"
              />
              <Button type="submit" size="lg" className="h-12 shrink-0 rounded-full px-7 text-base">
                Sign up
              </Button>
            </form>
          )}
          <div className="mt-10 flex flex-wrap gap-8 text-sm">
            {[
              ["50M+", "Traders"],
              ["$1.2T+", "Quarterly volume"],
              ["350+", "Crypto assets"],
            ].map(([v, l]) => (
              <div key={l}>
                <div className="text-2xl font-bold tracking-tight">{v}</div>
                <div className="text-muted-foreground">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <HeroMarkets />
      </Container>
    </section>
  );
}

function HeroMarkets() {
  const { data } = useSpotTickers();
  const [tab, setTab] = useState<"hot" | "gainers" | "volume">("hot");
  const rows = useMemo(() => {
    const t = (data ?? []).filter((x) => x.base !== "USDC");
    if (tab === "gainers")
      return [...t]
        .filter((x) => x.volQuote24h > 2e5)
        .sort((a, b) => b.change24h - a.change24h)
        .slice(0, 6);
    if (tab === "volume") return t.slice(0, 6);
    const hot = ["BTC", "ETH", "SOL", "XRP", "DOGE", "OKB"];
    return hot.map((s) => t.find((x) => x.base === s)).filter(Boolean) as Ticker[];
  }, [data, tab]);

  return (
    <div className="relative">
      <img
        src={heroImg}
        alt=""
        width={1280}
        height={1280}
        className="absolute -right-24 -top-24 hidden w-[560px] opacity-70 lg:block"
      />
      <div className="relative rounded-3xl border border-border bg-card/80 p-5 shadow-2xl backdrop-blur-xl lg:ml-16 lg:mt-24">
        <div className="mb-3 flex items-center justify-between">
          <PillTabs
            size="sm"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "hot", label: "Popular" },
              { value: "gainers", label: "Top gainers" },
              { value: "volume", label: "Top volume" },
            ]}
          />
          <Link to="/markets" className="text-xs text-muted-foreground hover:text-foreground">
            More <ArrowRight className="inline size-3" />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {rows.length === 0
            ? Array.from({ length: 6 }, (_, i) => <div key={i} className="h-14 animate-pulse" />)
            : rows.map((t) => (
                <Link
                  key={t.instId}
                  to="/trade/$instId"
                  params={{ instId: t.instId }}
                  className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-accent"
                >
                  <CoinIcon symbol={t.base} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{t.base}</div>
                    <div className="truncate text-xs text-muted-foreground">{coinName(t.base)}</div>
                  </div>
                  <div className="text-right">
                    <div className="tabular font-medium">${formatPrice(t.last)}</div>
                    <PctChange value={t.change24h} className="text-xs" />
                  </div>
                </Link>
              ))}
        </div>
      </div>
    </div>
  );
}

function TickerStrip() {
  const { data } = useSpotTickers();
  const items = (data ?? []).slice(0, 24);
  if (!items.length) return <div className="h-12 border-b border-border" />;
  const loop = [...items, ...items];
  return (
    <div className="overflow-hidden border-b border-border">
      <div className="animate-marquee flex w-max hover:[animation-play-state:paused]">
        {loop.map((t, i) => (
          <Link
            key={`${t.instId}-${i}`}
            to="/trade/$instId"
            params={{ instId: t.instId }}
            className="flex items-center gap-2 border-r border-border px-5 py-3 text-sm hover:bg-accent"
          >
            <span className="font-semibold">{t.base}/USDT</span>
            <span className="tabular">{formatPrice(t.last)}</span>
            <PctChange value={t.change24h} className="text-xs" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function MarketsSection() {
  const { data } = useSpotTickers();
  const [tab, setTab] = useState<"pop" | "gain" | "lose" | "vol">("pop");
  const rows = useMemo(() => {
    const t = (data ?? []).filter((x) => x.volQuote24h > 1e5 && x.base !== "USDC");
    if (tab === "gain") return [...t].sort((a, b) => b.change24h - a.change24h).slice(0, 8);
    if (tab === "lose") return [...t].sort((a, b) => a.change24h - b.change24h).slice(0, 8);
    if (tab === "vol") return t.slice(0, 8);
    const pop = ["BTC", "ETH", "SOL", "XRP", "BNB", "DOGE", "TON", "ADA"];
    return pop.map((s) => t.find((x) => x.base === s)).filter(Boolean) as Ticker[];
  }, [data, tab]);

  return (
    <section className="py-20">
      <Container>
        <SectionTitle
          title="Catch your next opportunity"
          subtitle="Real-time prices across 300+ markets."
          action={
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/markets">
                View all markets <ArrowRight />
              </Link>
            </Button>
          }
        />
        <PillTabs
          className="mb-4"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "pop", label: "Popular" },
            { value: "gain", label: "Gainers" },
            { value: "lose", label: "Losers" },
            { value: "vol", label: "24h volume" },
          ]}
        />
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-normal">Name</th>
                <th className="px-5 py-3 text-right font-normal">Price</th>
                <th className="px-5 py-3 text-right font-normal">24h change</th>
                <th className="hidden px-5 py-3 text-right font-normal md:table-cell">
                  24h high / low
                </th>
                <th className="px-5 py-3 text-right font-normal">24h volume</th>
                <th className="px-5 py-3 text-right font-normal">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr
                  key={t.instId}
                  className="border-b border-border last:border-0 hover:bg-accent/50"
                >
                  <td className="px-5 py-4">
                    <Link
                      to="/price/$coin"
                      params={{
                        coin: `${coinName(t.base)
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")}-${t.base.toLowerCase()}`,
                      }}
                      className="flex items-center gap-3"
                    >
                      <CoinIcon symbol={t.base} size={28} />
                      <span className="font-semibold">{t.base}</span>
                      <span className="text-muted-foreground">{coinName(t.base)}</span>
                    </Link>
                  </td>
                  <td className="tabular px-5 py-4 text-right font-medium">
                    ${formatPrice(t.last)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <PctChange value={t.change24h} />
                  </td>
                  <td className="tabular hidden px-5 py-4 text-right text-muted-foreground md:table-cell">
                    {formatPrice(t.high24h)} / {formatPrice(t.low24h)}
                  </td>
                  <td className="tabular px-5 py-4 text-right text-muted-foreground">
                    {formatCompact(t.volQuote24h, "$")}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button asChild size="sm" variant="outline" className="rounded-full">
                      <Link to="/trade/$instId" params={{ instId: t.instId }}>
                        Trade
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </section>
  );
}

const PRODUCTS = [
  {
    icon: CandlestickChart,
    title: "Spot",
    body: "Buy and sell 300+ assets with pro charts, live order book and limit / market orders.",
    to: "/trade/BTC-USDT",
    cta: "Trade spot",
  },
  {
    icon: LineChart,
    title: "Futures",
    body: "USDT-margined perpetual swaps with up to 125x leverage, cross & isolated margin.",
    to: "/futures/BTC-USDT-SWAP",
    cta: "Trade futures",
  },
  {
    icon: Copy,
    title: "Copy trading",
    body: "Mirror lead traders automatically. Set your amount, stop-loss and take-profit.",
    to: "/copy-trading",
    cta: "Find traders",
  },
  {
    icon: Bot,
    title: "Trading bots",
    body: "Grid, DCA, recurring buy and arbitrage bots that work around the clock.",
    to: "/trading-bots",
    cta: "Create a bot",
  },
  {
    icon: Percent,
    title: "Earn",
    body: "Put idle assets to work with flexible savings, fixed terms and on-chain staking.",
    to: "/earn",
    cta: "Start earning",
  },
  {
    icon: Lock,
    title: "Investment plans",
    body: "Choose a short-term plan with daily returns and a clear capital range.",
    to: "/earn",
    cta: "View plans",
  },
  {
    icon: Wallet,
    title: "Web3 wallet",
    body: "Self-custody across 100+ networks with built-in DEX aggregator and bridge.",
    to: "/web3",
    cta: "Explore Web3",
  },
];

function ProductsSection() {
  return (
    <section className="border-y border-border bg-surface py-20">
      <Container>
        <SectionTitle
          title="Everything you need to trade and invest"
        />
        <div className="grid gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.map((p) => (
            <Link
              key={p.title}
              to={p.to}
              className="group flex flex-col bg-background p-8 transition-colors hover:bg-card"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-foreground text-background">
                <p.icon className="size-5" />
              </span>
              <h3 className="mt-6 text-xl font-bold tracking-tight">{p.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{p.body}</p>
              <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium">
                {p.cta}{" "}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}

const INVESTMENT_PLANS = [
  {
    name: "Basic plan",
    daily: "2% Daily for 5 days",
    minimum: "Minimum 100$",
    maximum: "Maximum 4,999$",
    bonus: "10% bonus",
    featured: false,
  },
  {
    name: "Advanced plan",
    daily: "2.5% daily for 5 days",
    minimum: "Minimum 5,000$",
    maximum: "Maximum 9,999$",
    bonus: "10% bonus",
    featured: false,
  },
  {
    name: "Gold plan",
    daily: "3% daily for 5 days",
    minimum: "Minimum 10,000$",
    maximum: "Maximum 19,000$",
    bonus: "10% bonus",
    featured: true,
  },
  {
    name: "Diamond plan",
    daily: "4% daily for 5 days",
    minimum: "Minimum 20,000$",
    maximum: "Maximum 49,999$",
    bonus: "Unlimited 10% bonus",
    featured: false,
  },
];

function InvestmentPlansSection() {
  return (
    <section className="border-y border-border bg-surface py-20">
      <Container>
        <SectionTitle
          title="Investment plans"
          subtitle="Choose a short-term plan designed for simple, predictable daily growth."
          action={
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/earn">Explore plans</Link>
            </Button>
          }
        />

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {INVESTMENT_PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-3xl border p-6 shadow-sm ${
                plan.featured
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-bold tracking-tight">{plan.name}</h3>
                {plan.featured && (
                  <span className="rounded-full border border-background/20 bg-background/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-background">
                    Popular
                  </span>
                )}
              </div>

              <div className={`mt-5 rounded-2xl px-4 py-3 text-sm font-medium ${plan.featured ? "bg-background/10 text-background" : "bg-surface text-foreground"}`}>
                {plan.daily}
              </div>

              <div className="mt-6 space-y-3 text-sm">
                <p className={plan.featured ? "text-background/80" : "text-muted-foreground"}>{plan.minimum}</p>
                <p className={plan.featured ? "text-background/80" : "text-muted-foreground"}>{plan.maximum}</p>
                <p className={plan.featured ? "font-semibold text-background" : "font-semibold text-foreground"}>{plan.bonus}</p>
              </div>

              <Button
                asChild
                size="lg"
                className={`mt-8 w-full rounded-full ${plan.featured ? "bg-background text-foreground hover:bg-background/90" : ""}`}
              >
                <Link to="/signup">Select plan</Link>
              </Button>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function TrustSection() {
  return (
    <section className="border-y border-border bg-foreground py-20 text-background">
      <Container className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <ShieldCheck className="size-10" />
          <h2 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl">
            Your assets, verifiably safe.
          </h2>
          <p className="mt-4 max-w-md opacity-70">
            1:1 reserves published monthly with Merkle-tree proofs. Cold storage, multi-sig and
            real-time risk controls protect every account.
          </p>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="mt-8 rounded-full border-background/30 bg-transparent text-background hover:bg-background hover:text-foreground"
          >
            <Link to="/proof-of-reserves">View proof of reserves</Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-background/15">
          {[
            ["103%", "Average reserve ratio"],
            ["95%", "Assets in cold storage"],
            ["24/7", "Risk monitoring & support"],
            ["0", "Security incidents affecting user funds"],
          ].map(([v, l]) => (
            <div key={l} className="bg-foreground p-8">
              <div className="text-4xl font-bold tracking-tight">{v}</div>
              <div className="mt-2 text-sm opacity-70">{l}</div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

const FAQ: [string, string][] = [
   [
    "How do I buy my first crypto?",
    "Sign up in seconds - you get access to digital wallet. Then use Express buy, receive crypto, or place a market order."
  ],
  [
    "What are the trading fees?",
    "Regular users pay 0.08% maker / 0.10% taker on spot and 0.02% maker / 0.05% taker on perpetual futures."
  ]
];
function FaqSection() {
  return (
    <section className="py-20">
      <Container className="grid gap-10 lg:grid-cols-[1fr_2fr]">
        <div>
          <h2 className="text-4xl font-bold tracking-tight">FAQ</h2>
          <p className="mt-3 text-muted-foreground">
            More questions? Visit the{" "}
            <Link to="/help" className="underline underline-offset-4">
              support center
            </Link>
            .
          </p>
        </div>
        <Accordion type="single" collapsible>
          {FAQ.map(([q, a]) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger className="text-left text-base font-semibold">{q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Container>
    </section>
  );
}

function FinalCta() {
  const account = useAccount();
  return (
    <section className="border-t border-border py-24">
      <Container className="text-center">
        <h2 className="mx-auto max-w-3xl text-5xl font-extrabold tracking-tighter md:text-7xl">
          Start your crypto journey now.
        </h2>
        <div className="mt-10 flex justify-center gap-3">
          <Button asChild size="lg" className="h-12 rounded-full px-10 text-base">
            {account ? (
              <Link to="/trade/$instId" params={{ instId: "BTC-USDT" }}>
                Trade now
              </Link>
            ) : (
              <Link to="/signup" search={{}}>
                Sign up now
              </Link>
            )}
          </Button>
        </div>
      </Container>
    </section>
  );
}
