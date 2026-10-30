import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown, Search, Star } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { CoinIcon, PctChange, PillTabs, Stat } from "@/components/site/primitives";
import { useAuthGuard, useSpotTickers, useSwapTickers } from "@/components/site/hooks";
import { coinName, coinSlug } from "@/lib/coins";
import { formatCompact, formatPrice, formatPct } from "@/lib/format";
import type { Ticker } from "@/lib/market";
import { toggleFavorite } from "@/lib/account";
import { update, useAccount } from "@/lib/store";
import { cn } from "@/lib/utils";

export function PairHeader({
  instId,
  ticker,
  kind,
  extra,
}: {
  instId: string;
  ticker: Ticker | null;
  kind: "spot" | "futures";
  extra?: React.ReactNode;
}) {
  const [base = "", quote = "USDT"] = instId.split("-");
  const account = useAccount();
  const guard = useAuthGuard();
  const spotId = `${base}-${quote}`;
  const isFav = account?.favorites.includes(spotId);

  return (
    <div className="no-scrollbar flex items-center gap-6 overflow-x-auto border-b border-border px-4 py-2.5">
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => guard() && update((s) => toggleFavorite(s, spotId))}
          aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
          className="text-muted-foreground hover:text-foreground"
        >
          <Star className={cn("size-4", isFav && "fill-foreground text-foreground")} />
        </button>
        <PairPicker kind={kind} current={instId}>
          <button className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-accent">
            <CoinIcon symbol={base} size={26} />
            <span className="text-left">
              <span className="block text-base font-bold leading-tight">
                {base}/{quote}
                {kind === "futures" && (
                  <span className="ml-1 text-xs font-medium text-muted-foreground">Perp</span>
                )}
              </span>
              <Link
                to="/price/$coin"
                params={{ coin: coinSlug(base) }}
                onClick={(e) => e.stopPropagation()}
                className="block text-[11px] text-muted-foreground underline-offset-2 hover:underline"
              >
                {coinName(base)}
              </Link>
            </span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>
        </PairPicker>
      </div>
      <div className="shrink-0">
        <div
          className={cn(
            "tabular text-xl font-semibold",
            (ticker?.change24h ?? 0) >= 0 ? "text-up" : "text-down",
          )}
        >
          {formatPrice(ticker?.last)}
        </div>
        <div className="tabular text-[11px] text-muted-foreground">
          ≈ ${formatPrice(ticker?.last)}
        </div>
      </div>
      <Stat
        className="shrink-0"
        label="24h change"
        value={<PctChange value={ticker?.change24h} />}
      />
      <Stat className="shrink-0" label="24h high" value={formatPrice(ticker?.high24h)} />
      <Stat className="shrink-0" label="24h low" value={formatPrice(ticker?.low24h)} />
      <Stat
        className="shrink-0"
        label={`24h volume (${base})`}
        value={formatCompact(ticker?.vol24h)}
      />
      <Stat
        className="shrink-0"
        label={`24h turnover (${quote})`}
        value={formatCompact(ticker?.volQuote24h)}
      />
      {extra}
    </div>
  );
}

function PairPicker({
  children,
  kind,
  current,
}: {
  children: React.ReactNode;
  kind: "spot" | "futures";
  current: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "fav">("all");
  const navigate = useNavigate();
  const spot = useSpotTickers();
  const swap = useSwapTickers();
  const account = useAccount();
  const data = kind === "futures" ? swap.data : spot.data;

  const rows = useMemo(() => {
    let r = data ?? [];
    if (tab === "fav") r = r.filter((t) => account?.favorites.includes(`${t.base}-${t.quote}`));
    const s = q.trim().toLowerCase();
    if (s)
      r = r.filter(
        (t) => t.base.toLowerCase().includes(s) || coinName(t.base).toLowerCase().includes(s),
      );
    return r.slice(0, 120);
  }, [data, q, tab, account?.favorites]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-[380px] rounded-2xl p-0">
        <div className="space-y-3 p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              className="rounded-full pl-9"
            />
          </div>
          <PillTabs
            size="sm"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "all", label: kind === "futures" ? "USDT perpetual" : "USDT" },
              { value: "fav", label: "Favorites" },
            ]}
          />
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-y border-border px-4 py-1.5 text-[11px] text-muted-foreground">
          <span>Pair</span>
          <span className="text-right">Last price</span>
          <span className="w-16 text-right">Change</span>
        </div>
        <div className="max-h-[360px] overflow-y-auto scrollbar-thin">
          {rows.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">No pairs found</p>
          )}
          {rows.map((t) => (
            <button
              key={t.instId}
              onClick={() => {
                setOpen(false);
                setQ("");
                if (kind === "futures")
                  navigate({ to: "/futures/$instId", params: { instId: t.instId } });
                else navigate({ to: "/trade/$instId", params: { instId: t.instId } });
              }}
              className={cn(
                "grid w-full grid-cols-[1fr_auto_auto] items-center gap-x-4 px-4 py-2 text-left text-sm hover:bg-accent",
                t.instId === current && "bg-accent",
              )}
            >
              <span className="flex items-center gap-2">
                <CoinIcon symbol={t.base} size={18} />
                <span className="font-medium">{t.base}</span>
                <span className="text-xs text-muted-foreground">/{t.quote}</span>
              </span>
              <span className="tabular text-right">{formatPrice(t.last)}</span>
              <span
                className={cn(
                  "tabular w-16 text-right text-xs",
                  t.change24h >= 0 ? "text-up" : "text-down",
                )}
              >
                {formatPct(t.change24h)}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
