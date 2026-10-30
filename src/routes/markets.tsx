import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CoinIcon, Container, EmptyState, PctChange, PillTabs } from "@/components/site/primitives";
import { useAuthGuard, useSpotTickers, useSwapTickers } from "@/components/site/hooks";
import { coinMeta, coinName, coinSlug, type CoinMeta } from "@/lib/coins";
import { formatCompact, formatPrice } from "@/lib/format";
import { toggleFavorite } from "@/lib/account";
import { update, useAccount } from "@/lib/store";
import type { Ticker } from "@/lib/market";
import { cn } from "@/lib/utils";

type Tab = "favorites" | "spot" | "futures";
type Cat = "all" | CoinMeta["category"][number];
type SortKey = "volume" | "price" | "change" | "name";

export const Route = createFileRoute("/markets")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => {
    const t = s["tab"];
    return t === "favorites" || t === "futures" || t === "spot" ? { tab: t } : {};
  },
  head: () => ({
    meta: [
      { title: "Crypto markets & live prices — OK Trade" },
      {
        name: "description",
        content:
          "Live prices, 24h change and volume for 300+ spot and perpetual futures markets. Top gainers, losers and new listings.",
      },
      { property: "og:title", content: "Crypto markets & live prices — OK Trade" },
      {
        property: "og:description",
        content: "Live crypto prices, gainers, losers and volume across spot and futures.",
      },
    ],
  }),
  component: MarketsPage,
});

const PAGE = 30;

function MarketsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const tab: Tab = search.tab ?? "spot";
  const [cat, setCat] = useState<Cat>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "volume", dir: -1 });
  const [page, setPage] = useState(0);
  const spot = useSpotTickers();
  const swap = useSwapTickers();
  const account = useAccount();
  const guard = useAuthGuard();
  const favorites = account?.favorites ?? [];

  const source = tab === "futures" ? swap.data : spot.data;
  const loading = tab === "futures" ? swap.isLoading : spot.isLoading;

  const rows = useMemo(() => {
    let r = source ?? [];
    if (tab === "favorites") r = (spot.data ?? []).filter((t) => favorites.includes(t.instId));
    if (cat !== "all") r = r.filter((t) => coinMeta(t.base)?.category.includes(cat));
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      r = r.filter(
        (t) => t.base.toLowerCase().includes(s) || coinName(t.base).toLowerCase().includes(s),
      );
    }
    const val = (t: Ticker) =>
      sort.key === "volume"
        ? t.volQuote24h
        : sort.key === "price"
          ? t.last
          : sort.key === "change"
            ? t.change24h
            : 0;
    return [...r].sort((a, b) =>
      sort.key === "name" ? a.base.localeCompare(b.base) * sort.dir : (val(a) - val(b)) * sort.dir,
    );
  }, [source, spot.data, tab, cat, q, sort, favorites]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const visible = rows.slice(page * PAGE, page * PAGE + PAGE);

  const highlights = useMemo(() => {
    const t = (spot.data ?? []).filter((x) => x.volQuote24h > 5e5 && x.base !== "USDC");
    return {
      hot: ["BTC", "ETH", "SOL"]
        .map((s) => t.find((x) => x.base === s))
        .filter(Boolean) as Ticker[],
      gainers: [...t].sort((a, b) => b.change24h - a.change24h).slice(0, 3),
      losers: [...t].sort((a, b) => a.change24h - b.change24h).slice(0, 3),
      volume: t.slice(0, 3),
    };
  }, [spot.data]);

  const setSortKey = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key ? ((s.dir * -1) as 1 | -1) : -1 }));
  const fav = (instId: string) => {
    if (!guard()) return;
    const spotId = instId.replace("-SWAP", "");
    update((s) => toggleFavorite(s, spotId));
  };

  return (
    <div>
      <section className="border-b border-border">
        <Container className="py-10">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Markets</h1>
          <p className="mt-2 text-muted-foreground">
            Live prices for every market on OK Trade, updated in real time.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["Hot", highlights.hot],
                ["Top gainers", highlights.gainers],
                ["Top losers", highlights.losers],
                ["Top volume", highlights.volume],
              ] as const
            ).map(([title, list]) => (
              <div key={title} className="rounded-2xl border border-border p-4">
                <p className="mb-2 text-sm font-semibold">{title}</p>
                {list.length === 0
                  ? Array.from({ length: 3 }, (_, i) => (
                      <div key={i} className="my-2 h-6 animate-pulse rounded bg-muted" />
                    ))
                  : list.map((t) => (
                      <Link
                        key={t.instId}
                        to="/trade/$instId"
                        params={{ instId: t.instId }}
                        className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent"
                      >
                        <CoinIcon symbol={t.base} size={18} />
                        <span className="flex-1 font-medium">{t.base}</span>
                        <span className="tabular">{formatPrice(t.last)}</span>
                        <PctChange value={t.change24h} className="w-16 text-right text-xs" />
                      </Link>
                    ))}
              </div>
            ))}
          </div>
        </Container>
      </section>

      <Container className="py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PillTabs
            value={tab}
            onChange={(v) => {
              setPage(0);
              navigate({ search: { tab: v } });
            }}
            tabs={[
              { value: "favorites", label: "Favorites" },
              { value: "spot", label: "Spot" },
              { value: "futures", label: "Futures" },
            ]}
          />
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Search coin"
              className="rounded-full pl-9"
              aria-label="Search coin"
            />
          </div>
        </div>
        <PillTabs
          size="sm"
          className="mt-4"
          value={cat}
          onChange={(v) => {
            setCat(v);
            setPage(0);
          }}
          tabs={[
            { value: "all", label: "All" },
            { value: "layer1", label: "Layer 1" },
            { value: "layer2", label: "Layer 2" },
            { value: "defi", label: "DeFi" },
            { value: "meme", label: "Meme" },
            { value: "ai", label: "AI" },
            { value: "gaming", label: "Gaming" },
            { value: "infra", label: "Infrastructure" },
            { value: "exchange", label: "Exchange tokens" },
          ]}
        />

        <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="w-10 px-4 py-3" />
                <Th onClick={() => setSortKey("name")} active={sort.key === "name"} dir={sort.dir}>
                  Name
                </Th>
                <Th
                  right
                  onClick={() => setSortKey("price")}
                  active={sort.key === "price"}
                  dir={sort.dir}
                >
                  Price
                </Th>
                <Th
                  right
                  onClick={() => setSortKey("change")}
                  active={sort.key === "change"}
                  dir={sort.dir}
                >
                  24h change
                </Th>
                <th className="hidden px-4 py-3 text-right font-normal lg:table-cell">24h high</th>
                <th className="hidden px-4 py-3 text-right font-normal lg:table-cell">24h low</th>
                <Th
                  right
                  onClick={() => setSortKey("volume")}
                  active={sort.key === "volume"}
                  dir={sort.dir}
                >
                  24h volume
                </Th>
                <th className="px-4 py-3 text-right font-normal">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 10 }, (_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td colSpan={8} className="px-4 py-4">
                      <div className="h-5 animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))}
              {visible.map((t) => {
                const spotId = t.instId.replace("-SWAP", "");
                const isFav = favorites.includes(spotId);
                const tradeLink =
                  t.instType === "SWAP" ? (
                    <Link to="/futures/$instId" params={{ instId: t.instId }}>
                      Trade
                    </Link>
                  ) : (
                    <Link to="/trade/$instId" params={{ instId: t.instId }}>
                      Trade
                    </Link>
                  );
                return (
                  <tr
                    key={t.instId}
                    className="border-b border-border last:border-0 hover:bg-accent/40"
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => fav(t.instId)}
                        aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Star
                          className={cn("size-4", isFav && "fill-foreground text-foreground")}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to="/price/$coin"
                        params={{ coin: coinSlug(t.base) }}
                        className="flex items-center gap-3"
                      >
                        <CoinIcon symbol={t.base} size={26} />
                        <span>
                          <span className="font-semibold">{t.base}</span>
                          <span className="text-muted-foreground">
                            {t.instType === "SWAP" ? "USDT Perp" : "/USDT"}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {coinName(t.base)}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="tabular px-4 py-3 text-right font-medium">
                      {formatPrice(t.last)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PctChange value={t.change24h} pill />
                    </td>
                    <td className="tabular hidden px-4 py-3 text-right text-muted-foreground lg:table-cell">
                      {formatPrice(t.high24h)}
                    </td>
                    <td className="tabular hidden px-4 py-3 text-right text-muted-foreground lg:table-cell">
                      {formatPrice(t.low24h)}
                    </td>
                    <td className="tabular px-4 py-3 text-right text-muted-foreground">
                      {formatCompact(t.volQuote24h, "$")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild size="sm" variant="outline" className="rounded-full">
                        {tradeLink}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && visible.length === 0 && (
            <EmptyState
              title={
                tab === "favorites"
                  ? account
                    ? "No favorites yet"
                    : "Log in to see your favorites"
                  : "No markets found"
              }
              body={
                tab === "favorites"
                  ? "Tap the star next to any market to add it here."
                  : "Try a different search or category."
              }
              action={
                tab === "favorites" && !account ? (
                  <Button asChild className="rounded-full">
                    <Link to="/login" search={{ redirect: "/markets?tab=favorites" }}>
                      Log in
                    </Link>
                  </Button>
                ) : undefined
              }
            />
          )}
        </div>

        {pages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft />
            </Button>
            {Array.from({ length: pages }, (_, i) => i)
              .filter((i) => i === 0 || i === pages - 1 || Math.abs(i - page) <= 1)
              .map((i, idx, arr) => (
                <span key={i} className="flex items-center gap-2">
                  {idx > 0 && arr[idx - 1] !== i - 1 && (
                    <span className="text-muted-foreground">…</span>
                  )}
                  <button
                    onClick={() => setPage(i)}
                    className={cn(
                      "size-9 rounded-full text-sm",
                      i === page ? "bg-foreground text-background" : "hover:bg-accent",
                    )}
                  >
                    {i + 1}
                  </button>
                </span>
              ))}
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              disabled={page >= pages - 1}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              <ChevronRight />
            </Button>
          </div>
        )}
      </Container>
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  dir,
  right,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  dir: 1 | -1;
  right?: boolean;
}) {
  return (
    <th className={cn("px-4 py-3 font-normal", right && "text-right")}>
      <button
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          active && "text-foreground",
        )}
      >
        {children}
        {active && (dir === -1 ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
      </button>
    </th>
  );
}
