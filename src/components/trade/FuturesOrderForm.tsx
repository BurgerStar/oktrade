import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import {
  closePosition,
  FUTURES_TAKER_FEE,
  getBalance,
  liquidationPrice,
  MAX_LEVERAGE,
  openPosition,
} from "@/lib/account";
import { formatAmount, formatNumber, formatPrice } from "@/lib/format";
import { run, useAccount } from "@/lib/store";
import { cn } from "@/lib/utils";
import { NumField, PctSlider } from "./NumField";

export function FuturesOrderForm({ instId, mark }: { instId: string; mark?: number | undefined }) {
  const base = instId.split("-")[0] ?? "";
  const account = useAccount();
  const href = useRouterState({ select: (s) => s.location.href });
  const [mode, setMode] = useState<"open" | "close">("open");
  const [marginMode, setMarginMode] = useState<"cross" | "isolated">("cross");
  const [leverage, setLeverage] = useState(10);
  const [levOpen, setLevOpen] = useState(false);
  const [levDraft, setLevDraft] = useState(10);
  const [margin, setMargin] = useState("");
  const [pct, setPct] = useState(0);

  const avail = account ? getBalance(account, "USDT").available : 0;
  const m = +margin || 0;
  const notional = m * leverage;
  const size = mark ? notional / mark : 0;
  const fee = notional * FUTURES_TAKER_FEE;
  const positions = account?.positions.filter((p) => p.instId === instId) ?? [];

  const fromPct = (p: number) => {
    setPct(p);
    // Leave room for the opening fee.
    const max = avail / (1 + leverage * FUTURES_TAKER_FEE);
    setMargin(p ? String(Math.floor(((max * p) / 100) * 100) / 100) : "");
  };

  const open = (side: "long" | "short") => {
    const r = run((s) =>
      openPosition(s, { instId, side, leverage, margin: m, marginMode }, mark ?? 0),
    );
    if (r.ok) {
      toast.success(`${side === "long" ? "Long" : "Short"} ${leverage}x opened`, {
        description: `${formatAmount(size, base)} @ ${formatPrice(mark)}`,
      });
      setMargin("");
      setPct(0);
    } else toast.error(r.error);
  };

  return (
    <div className="flex h-full flex-col p-4">
      <div className="grid grid-cols-2 gap-2">
        <select
          value={marginMode}
          onChange={(e) => setMarginMode(e.target.value as "cross" | "isolated")}
          className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
          aria-label="Margin mode"
        >
          <option value="cross">Cross</option>
          <option value="isolated">Isolated</option>
        </select>
        <button
          onClick={() => {
            setLevDraft(leverage);
            setLevOpen(true);
          }}
          className="tabular h-9 rounded-lg border border-input text-sm font-semibold hover:bg-accent"
        >
          {leverage.toFixed(0)}x
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 rounded-full bg-muted p-1">
        {(["open", "close"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setMode(v)}
            className={cn(
              "rounded-full py-1.5 text-sm font-semibold capitalize",
              mode === v ? "bg-background text-foreground shadow" : "text-muted-foreground",
            )}
          >
            {v}
          </button>
        ))}
      </div>

      {mode === "open" ? (
        <>
          <p className="mt-3 text-xs font-medium">Market order</p>
          <div className="mt-2 space-y-3">
            <NumField
              label="Price"
              unit="USDT"
              value=""
              onChange={() => {}}
              disabled
              placeholder={`Market ≈ ${formatPrice(mark)}`}
            />
            <NumField
              label="Margin"
              unit="USDT"
              value={margin}
              onChange={(v) => {
                setMargin(v);
                setPct(0);
              }}
            />
            <PctSlider value={pct} onChange={fromPct} />
          </div>
          <div className="mt-2 space-y-1.5 text-xs">
            {[
              ["Available", account ? `${formatNumber(avail, 2)} USDT` : "--"],
              [
                "Position size",
                size ? `${formatAmount(size, base)} (${formatNumber(notional, 2)} USDT)` : "--",
              ],
              ["Est. fee (0.05%)", fee ? `${formatNumber(fee, 4)} USDT` : "--"],
              [
                "Est. liq. price (long)",
                mark && m
                  ? formatPrice(liquidationPrice({ side: "long", entryPx: mark, leverage }))
                  : "--",
              ],
              [
                "Est. liq. price (short)",
                mark && m
                  ? formatPrice(liquidationPrice({ side: "short", entryPx: mark, leverage }))
                  : "--",
              ],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{k}</span>
                <span className="tabular text-right">{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-4">
            {account ? (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => open("long")}
                  className="h-11 rounded-full bg-up font-semibold text-background hover:bg-up/90"
                >
                  Buy / Long
                </Button>
                <Button
                  onClick={() => open("short")}
                  className="h-11 rounded-full bg-down font-semibold text-background hover:bg-down/90"
                >
                  Sell / Short
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button asChild className="h-11 rounded-full">
                  <Link to="/signup" search={{ redirect: href }}>
                    Sign up
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-full">
                  <Link to="/login" search={{ redirect: href }}>
                    Log in
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="mt-4 space-y-2">
          {positions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No open {base} positions to close.
            </p>
          ) : (
            positions.map((p) => (
              <div key={p.id} className="rounded-xl border border-border p-3 text-xs">
                <div className="flex justify-between">
                  <span
                    className={cn("font-semibold", p.side === "long" ? "text-up" : "text-down")}
                  >
                    {p.side === "long" ? "Long" : "Short"} {p.leverage}x
                  </span>
                  <span className="tabular">{formatAmount(p.size, base)}</span>
                </div>
                <div className="mt-1 flex justify-between text-muted-foreground">
                  <span>Entry {formatPrice(p.entryPx)}</span>
                  <span>Margin {formatNumber(p.margin, 2)}</span>
                </div>
                <Button
                  size="sm"
                  className="mt-2 h-8 w-full rounded-full"
                  onClick={() => {
                    const r = run((s) => closePosition(s, p.id, mark ?? p.entryPx));
                    r.ok ? toast.success("Position closed") : toast.error(r.error);
                  }}
                >
                  Close at market
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      <div className="mt-5 rounded-xl border border-border p-3 text-xs text-muted-foreground">
        Perpetual futures are high risk. Positions are liquidated when the mark price reaches the
        liquidation price (maintenance margin 0.4%).
      </div>

      <Dialog open={levOpen} onOpenChange={setLevOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Adjust leverage</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={() => setLevDraft((l) => Math.max(1, l - 1))}
              aria-label="Decrease leverage"
            >
              −
            </Button>
            <span className="tabular w-20 text-center text-3xl font-bold">{levDraft}x</span>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={() => setLevDraft((l) => Math.min(MAX_LEVERAGE, l + 1))}
              aria-label="Increase leverage"
            >
              +
            </Button>
          </div>
          <Slider
            value={[levDraft]}
            min={1}
            max={MAX_LEVERAGE}
            step={1}
            onValueChange={([v]) => setLevDraft(v ?? 1)}
          />
          <div className="flex flex-wrap justify-between gap-1">
            {[1, 5, 10, 20, 50, 75, 100, 125].map((v) => (
              <button
                key={v}
                onClick={() => setLevDraft(v)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs",
                  levDraft === v ? "border-foreground" : "border-border text-muted-foreground",
                )}
              >
                {v}x
              </button>
            ))}
          </div>
          {levDraft >= 50 && (
            <p className="text-xs text-down">High leverage greatly increases liquidation risk.</p>
          )}
          <DialogFooter>
            <Button
              className="w-full rounded-full"
              onClick={() => {
                setLeverage(levDraft);
                setLevOpen(false);
                setPct(0);
                toast.success(`Leverage set to ${levDraft}x`);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
