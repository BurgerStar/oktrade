import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { COINS, FIAT } from "@/lib/coins";
import { useAccount } from "@/lib/store";
import { usePrices } from "@/components/site/hooks";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
export const primary =
  "rounded-full bg-foreground text-background px-6 py-3 font-semibold disabled:opacity-40 transition-opacity hover:opacity-80";
export const field =
  "w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-foreground";
export const methods = [
  "Visa / Mastercard",
  "Apple Pay",
  "Google Pay",
  "Bank transfer",
  "Banxa",
  "MoonPay",
];
export function meta(title: string, description: string) {
  return {
    meta: [
      { title: `${title} — OK Trade` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} — OK Trade` },
      { property: "og:description", content: description },
    ],
  };
}
export function Page({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl px-5 py-12 md:px-10 md:py-20">
      <nav className="mb-12 flex gap-7 border-b border-border pb-5 text-sm">
        <Link to="/buy-crypto">Express buy</Link>
        <Link to="/convert">Convert</Link>
      </nav>
      <h1 className="text-4xl font-bold tracking-tight md:text-6xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">{subtitle}</p>
      {children}
    </div>
  );
}
export function Modal({
  open,
  close,
  title,
  description,
  children,
}: {
  open: boolean;
  close: () => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) close();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
export function FiatSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      aria-label="Fiat currency"
      className={field}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {FIAT.map((f) => (
        <option key={f.code}>{f.code}</option>
      ))}
    </select>
  );
}
export function AssetSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const account = useAccount();
  const prices = usePrices();
  return (
    <>
      <button
        type="button"
        className="rounded-full border border-border px-4 py-2 font-semibold"
        onClick={() => {
          setSearch("");
          setOpen(true);
        }}
      >
        {value} ⌄
      </button>
      <Modal
        open={open}
        close={() => setOpen(false)}
        title="Select an asset"
        description="Live USD prices and your available balances."
      >
        <input
          className={field}
          aria-label="Search assets"
          placeholder="Search name or symbol"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="max-h-80 overflow-y-auto">
          {COINS.filter((c) =>
            `${c.symbol} ${c.name}`.toLowerCase().includes(search.toLowerCase()),
          ).map((c) => (
            <button
              type="button"
              key={c.symbol}
              onClick={() => {
                onChange(c.symbol);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-xl p-3 text-left hover:bg-surface"
            >
              <span>
                <b>{c.symbol}</b>
                <span className="block text-sm text-muted-foreground">{c.name}</span>
              </span>
              <span className="text-right tabular">
                ${(prices[c.symbol] ?? c.fallbackPrice).toLocaleString()}
                <span className="block text-xs text-muted-foreground">
                  Balance: {account?.balances[c.symbol]?.available ?? 0}
                </span>
              </span>
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}
export function useCountdown(open: boolean, seconds: number) {
  const [expires, setExpires] = useState(0);
  const [left, setLeft] = useState(seconds);
  const refresh = () => {
    setExpires(Date.now() + seconds * 1000);
    setLeft(seconds);
  };
  useEffect(() => {
    if (open) refresh();
  }, [open, seconds]);
  useEffect(() => {
    if (!open) return;
    const timer = setInterval(
      () => setLeft(Math.max(0, Math.ceil((expires - Date.now()) / 1000))),
      250,
    );
    return () => clearInterval(timer);
  }, [open, expires]);
  return { left, refresh };
}
export function FAQ({ items }: { items: [string, string][] }) {
  return (
    <section className="mt-24 border-t border-border pt-12">
      <h2 className="mb-7 text-3xl font-bold tracking-tight">Your questions, answered</h2>
      {items.map(([q, a]) => (
        <details key={q} className="border-b border-border py-5">
          <summary className="cursor-pointer text-lg font-medium">{q}</summary>
          <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">{a}</p>
        </details>
      ))}
    </section>
  );
}
export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-6 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular text-right">{children}</span>
    </div>
  );
}
export function finite(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
