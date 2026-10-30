import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { COINS } from "@/lib/coins";
import type { Activity } from "@/lib/account";
import { field, secondary } from "./AccountShell";
import { toast } from "sonner";
export function Modal({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger className={secondary}>{label}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Manage your OK Trade account.</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
export function CoinSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [q, setQ] = useState("");
  return (
    <div className="space-y-3">
      <input
        aria-label="Search coins"
        placeholder="Search coin or name"
        className={field}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <select
        aria-label="Coin"
        className={field}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {COINS.filter(
          (c) =>
            c.symbol === value || `${c.symbol} ${c.name}`.toLowerCase().includes(q.toLowerCase()),
        ).map((c) => (
          <option key={c.symbol} value={c.symbol}>
            {c.symbol} · {c.name}
          </option>
        ))}
      </select>
      <div className="flex flex-wrap gap-2">
        {["USDT", "BTC", "ETH", "SOL"].map((c) => (
          <button
            key={c}
            className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent"
            onClick={() => onChange(c)}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
export function ActivityTable({ items }: { items: Activity[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full whitespace-nowrap text-left text-sm">
        <thead className="border-b border-border text-xs text-muted-foreground">
          <tr>
            {["Date", "Type", "Asset", "Amount", "Details", "Status"].map((t) => (
              <th className="px-3 py-4 font-normal" key={t}>
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.id} className="border-b border-border">
              <td className="p-3 text-muted-foreground">{new Date(a.ts).toLocaleString()}</td>
              <td className="p-3 capitalize">{a.type}</td>
              <td className="p-3">{a.ccy}</td>
              <td className="tabular p-3">
                {a.amount.toLocaleString(undefined, { maximumFractionDigits: 8 })}
              </td>
              <td className="max-w-64 truncate p-3" title={a.detail}>
                {a.detail}
              </td>
              <td className="p-3 capitalize">{a.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!items.length && (
        <div className="py-16 text-center">
          <p className="font-medium">No transactions yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Your activity will appear here after your first transaction.
          </p>
        </div>
      )}
    </div>
  );
}
export async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  } catch {
    toast.error("Clipboard unavailable. Select and copy the text manually.");
  }
}
export const networks = (ccy: string) =>
  ccy === "USDT"
    ? ["TRC20", "ERC20", "Solana", "X Layer", "Polygon"]
    : ccy === "BTC"
      ? ["Bitcoin"]
      : ccy === "SOL"
        ? ["Solana"]
        : ccy === "XRP"
          ? ["XRP Ledger"]
          : ["ERC20", "X Layer"];
export const feeFor = (c: string, n: string) =>
  c === "BTC"
    ? 0.00002
    : c === "ETH"
      ? 0.0005
      : c === "SOL"
        ? 0.001
        : c === "XRP"
          ? 0.2
          : n === "ERC20"
            ? 3
            : 1;
export function demoAddress(c: string, n: string, uid: string) {
  let h = 2166136261;
  for (const x of c + n + uid) h = Math.imul(h ^ x.charCodeAt(0), 16777619);
  const hex = Array.from({ length: 40 }, (_, i) => {
    h = Math.imul(h ^ i, 16777619);
    return ((h >>> 0) % 16).toString(16);
  }).join("");
  return (
    (c === "BTC"
      ? "bc1q"
      : c === "XRP"
        ? "r"
        : n === "TRC20"
          ? "T"
          : n === "Solana"
            ? "So"
            : "0x") + hex
  );
}
