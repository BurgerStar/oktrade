import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LineTabs } from "@/components/site/primitives";
import {
  getBalance,
  placeSpotOrder,
  SPOT_MAKER_FEE,
  SPOT_TAKER_FEE,
  type Side,
} from "@/lib/account";
import { formatAmount, formatNumber, formatPrice, priceDecimals } from "@/lib/format";
import { run, useAccount } from "@/lib/store";
import { cn } from "@/lib/utils";
import { NumField, PctSlider } from "./NumField";

const trim = (n: number, d: number) => (isFinite(n) && n > 0 ? String(+n.toFixed(d)) : "");

export function SpotOrderForm({
  instId,
  last,
  presetPrice,
}: {
  instId: string;
  last?: number | undefined;
  presetPrice?: { px: number; n: number } | undefined;
}) {
  const [base = "", quote = "USDT"] = instId.split("-");
  const account = useAccount();
  const href = useRouterState({ select: (s) => s.location.href });
  const [side, setSide] = useState<Side>("buy");
  const [type, setType] = useState<"limit" | "market">("limit");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [total, setTotal] = useState("");
  const [pct, setPct] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [skipConfirm, setSkipConfirm] = useState(false);
  const d = priceDecimals(last ?? 1);
  const amtD = (last ?? 1) >= 1000 ? 6 : (last ?? 1) >= 1 ? 4 : 2;

  // Seed price with the live price once per pair.
  useEffect(() => {
    setPrice("");
    setAmount("");
    setTotal("");
    setPct(0);
  }, [instId]);
  useEffect(() => {
    if (!price && last) setPrice(last.toFixed(d));
  }, [last, price, d]);
  useEffect(() => {
    if (presetPrice) {
      setType("limit");
      setPrice(presetPrice.px.toFixed(d));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetPrice?.n]);

  const px = type === "market" ? (last ?? 0) : +price || 0;
  const availQuote = account ? getBalance(account, quote).available : 0;
  const availBase = account ? getBalance(account, base).available : 0;

  const fromAmount = (v: string) => {
    setAmount(v);
    setTotal(v && px ? trim(+v * px, 2) : "");
    setPct(0);
  };
  const fromTotal = (v: string) => {
    setTotal(v);
    setAmount(v && px ? trim(+v / px, amtD) : "");
    setPct(0);
  };
  const fromPct = (p: number) => {
    setPct(p);
    if (!px) return;
    if (side === "buy") {
      const t = (availQuote * p) / 100;
      setTotal(trim(t, 2));
      setAmount(trim(Math.floor((t / px) * 10 ** amtD) / 10 ** amtD, amtD));
    } else {
      const a = Math.floor(((availBase * p) / 100) * 10 ** amtD) / 10 ** amtD;
      setAmount(trim(a, amtD));
      setTotal(trim(a * px, 2));
    }
  };
  useEffect(() => {
    if (amount && px) setTotal(trim(+amount * px, 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price, type]);

  const size = +amount || 0;
  const submit = () => {
    const r = run((s) =>
      placeSpotOrder(
        s,
        { instId, side, type, size, ...(type === "limit" ? { price: +price } : {}) },
        last ?? 0,
      ),
    );
    setConfirm(false);
    if (r.ok) {
      toast.success(r.message ?? "Order placed", {
        description: `${side === "buy" ? "Buy" : "Sell"} ${size} ${base}${type === "limit" ? ` @ ${price}` : " at market"}`,
      });
      setAmount("");
      setTotal("");
      setPct(0);
    } else toast.error(r.error);
  };
  const onSubmit = () => {
    if (!(size > 0)) {
      toast.error("Enter an amount");
      return;
    }
    if (type === "limit" && !(+price > 0)) {
      toast.error("Enter a price");
      return;
    }
    if (skipConfirm) submit();
    else setConfirm(true);
  };

  const fee = type === "market" ? SPOT_TAKER_FEE : SPOT_MAKER_FEE;
  const maxBuy = px ? availQuote / px : 0;

  return (
    <div className="flex h-full flex-col p-4">
      <div className="grid grid-cols-2 rounded-full bg-muted p-1">
        {(["buy", "sell"] as Side[]).map((s) => (
          <button
            key={s}
            onClick={() => {
              setSide(s);
              setPct(0);
            }}
            className={cn(
              "rounded-full py-1.5 text-sm font-semibold capitalize transition-colors",
              side === s
                ? s === "buy"
                  ? "bg-up text-background"
                  : "bg-down text-background"
                : "text-muted-foreground",
            )}
          >
            {s}
          </button>
        ))}
      </div>
      <LineTabs
        className="mt-2"
        value={type}
        onChange={setType}
        tabs={[
          { value: "limit", label: "Limit" },
          { value: "market", label: "Market" },
        ]}
      />
      <div className="mt-3 space-y-3">
        {type === "limit" ? (
          <NumField
            label="Price"
            unit={quote}
            value={price}
            onChange={setPrice}
            right={
              <button
                type="button"
                onClick={() => last && setPrice(last.toFixed(d))}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Last
              </button>
            }
          />
        ) : (
          <NumField
            label="Price"
            unit={quote}
            value=""
            onChange={() => {}}
            disabled
            placeholder="Market price"
          />
        )}
        <NumField label="Amount" unit={base} value={amount} onChange={fromAmount} />
        <PctSlider value={pct} onChange={fromPct} />
        <NumField label="Total" unit={quote} value={total} onChange={fromTotal} />
      </div>
      <div className="mt-3 space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Available</span>
          <span className="tabular flex items-center gap-1">
            {account
              ? formatAmount(side === "buy" ? availQuote : availBase, side === "buy" ? quote : base)
              : "--"}
            {account && (
              <Link
                to="/assets/deposit"
                search={{ ccy: side === "buy" ? quote : base }}
                aria-label="Deposit"
                className="text-muted-foreground hover:text-foreground"
              >
                <PlusCircle className="size-3.5" />
              </Link>
            )}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Max {side}</span>
          <span className="tabular">
            {account ? formatAmount(side === "buy" ? maxBuy : availBase, base) : "--"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Est. fee ({(fee * 100).toFixed(2)}%)</span>
          <span className="tabular">
            {size
              ? formatAmount(
                  side === "buy" ? size * fee : size * px * fee,
                  side === "buy" ? base : quote,
                )
              : "--"}
          </span>
        </div>
      </div>
      <div className="mt-4">
        {account ? (
          <Button
            onClick={onSubmit}
            className={cn(
              "h-11 w-full rounded-full text-sm font-semibold text-background",
              side === "buy" ? "bg-up hover:bg-up/90" : "bg-down hover:bg-down/90",
            )}
          >
            {side === "buy" ? "Buy" : "Sell"} {base}
          </Button>
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
      {account && (
        <div className="mt-5 rounded-xl border border-border p-3 text-xs">
          <p className="mb-2 font-semibold">Assets</p>
          {[base, quote].map((c) => (
            <div key={c} className="flex justify-between py-0.5">
              <span className="text-muted-foreground">{c}</span>
              <span className="tabular">
                {formatAmount(getBalance(account, c).available + getBalance(account, c).frozen)}
              </span>
            </div>
          ))}
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <Button asChild size="sm" variant="secondary" className="h-7 rounded-full text-[11px]">
              <Link to="/assets/deposit" search={{}}>
                Deposit
              </Link>
            </Button>
            <Button asChild size="sm" variant="secondary" className="h-7 rounded-full text-[11px]">
              <Link to="/convert">Convert</Link>
            </Button>
            <Button asChild size="sm" variant="secondary" className="h-7 rounded-full text-[11px]">
              <Link to="/buy-crypto">Buy</Link>
            </Button>
          </div>
        </div>
      )}

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {side === "buy" ? "Buy" : "Sell"} {base}/{quote}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {[
              ["Order type", type === "limit" ? "Limit" : "Market"],
              ["Price", type === "limit" ? `${formatPrice(+price)} ${quote}` : "Market"],
              ["Amount", `${amount} ${base}`],
              ["Total", `≈ ${formatNumber(size * px, 2)} ${quote}`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-muted-foreground">{k}</span>
                <span
                  className={cn(
                    "tabular font-medium",
                    k === "Order type" && (side === "buy" ? "text-up" : "text-down"),
                  )}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox checked={skipConfirm} onCheckedChange={(v) => setSkipConfirm(!!v)} /> Don't
            show again this session
          </label>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button className="rounded-full" onClick={submit}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
