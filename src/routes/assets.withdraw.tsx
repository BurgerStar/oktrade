import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAccount } from "@/lib/store";
import { withdraw } from "@/lib/account";
import { COINS } from "@/lib/coins";
import { useAction } from "@/components/site/hooks";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AccountShell,
  accountMeta,
  panel,
  primary,
  secondary,
  field,
} from "@/components/account/AccountShell";
import { CoinSelect, networks, feeFor, ActivityTable, Modal } from "@/components/account/Shared";
import { toast } from "sonner";
export const Route = createFileRoute("/assets/withdraw")({
  validateSearch: (s: Record<string, unknown>): { ccy?: string } =>
    COINS.some((c) => c.symbol === s["ccy"]) ? { ccy: String(s["ccy"]) } : {},
  head: () => accountMeta("Withdraw crypto"),
  component: Page,
});
function Page() {
  const ccy = Route.useSearch().ccy ?? "USDT";
  return (
    <AccountShell title="Withdraw crypto">
      <Withdraw initial={ccy} key={ccy} />
    </AccountShell>
  );
}
function Withdraw({ initial }: { initial: string }) {
  const a = useAccount();
  const act = useAction();
  const [ccy, setCcy] = useState(initial);
  const [network, setNetwork] = useState(networks(initial)[0]!);
  const [internal, setInternal] = useState(false);
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  if (!a) return null;
  const fee = internal ? 0 : feeFor(ccy, network);
  const available = a.balances[ccy]?.available ?? 0;
  const receive = Math.max(0, Number(amount) - fee);
  const used = a.activity
    .filter((x) => x.type === "withdraw" && x.ccy === ccy && Date.now() - x.ts < 86400000)
    .reduce((s, x) => s + x.amount, 0);
  return (
    <div className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <form
          className={`${panel} space-y-6`}
          onSubmit={(e) => {
            e.preventDefault();
            if (Number(amount) <= fee || Number(amount) > available) {
              toast.error("Enter an amount above the fee and within your available balance");
              return;
            }
            setCode("");
            setOpen(true);
          }}
        >
          <CoinSelect
            value={ccy}
            onChange={(c) => {
              setCcy(c);
              setNetwork(networks(c)[0]!);
              setAmount("");
            }}
          />
          <div className="flex gap-3">
            {["On-chain", "Internal transfer"].map((t, i) => (
              <button
                key={t}
                type="button"
                className={internal === !!i ? primary : secondary}
                onClick={() => setInternal(!!i)}
              >
                {t}
              </button>
            ))}
          </div>
          {!internal && (
            <label className="block text-sm">
              Network
              <select
                className={`${field} mt-2`}
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
              >
                {networks(ccy).map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
              <span className="mt-2 block text-xs text-muted-foreground">
                Network fee: {fee} {ccy}
              </span>
            </label>
          )}
          <label className="block text-sm">
            {internal ? "Recipient OK Trade email or UID" : "Withdrawal address"}
            <input
              required
              minLength={8}
              className={`${field} mt-2`}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={internal ? "Email or UID (8+ characters)" : "Enter recipient address"}
            />
          </label>
          <Modal label="Address book" title="Saved addresses">
            <p className="text-sm text-muted-foreground">
              Saved for this session only. Verify network compatibility before use.
            </p>
            {saved.map((s) => (
              <button
                type="button"
                className="break-all rounded-lg border border-border p-3 text-left font-mono text-xs"
                key={s}
                onClick={() => {
                  setAddress(s);
                  toast.success("Address selected");
                }}
              >
                {s}
              </button>
            ))}
            {!saved.length && <p className="text-sm">No saved addresses yet.</p>}
            <button
              type="button"
              className={primary}
              disabled={address.length < 8}
              onClick={() => {
                setSaved((s) => [...new Set([...s, address])]);
                toast.success("Address saved for this session");
              }}
            >
              Save current address
            </button>
          </Modal>
          <label className="block text-sm">
            Amount
            <div className="relative mt-2">
              <input
                required
                type="number"
                step="any"
                min="0"
                max={available}
                className={`${field} pr-20`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-3 text-sm font-semibold"
                onClick={() => setAmount(String(available))}
              >
                Max
              </button>
            </div>
            <span className="mt-2 block text-xs text-muted-foreground">
              Available: {available.toLocaleString()} {ccy}
            </span>
          </label>
          <div className="rounded-xl bg-surface p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Receive amount</span>
              <strong className="tabular">
                {receive.toLocaleString(undefined, { maximumFractionDigits: 8 })} {ccy}
              </strong>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Fee is deducted from your entered amount.
            </p>
          </div>
          <button className={`${primary} w-full`}>Review withdrawal</button>
        </form>
        <aside className={panel}>
          <h3 className="font-semibold">Withdrawal safety</h3>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Verify the recipient and selected network. Transfers cannot be reversed. No
            real funds leave OK Trade.
          </p>
          <div className="mt-6 border-t border-border pt-5">
            <p className="text-sm">24h limit</p>
            <p className="tabular mt-2 font-semibold">
              {used.toLocaleString()} / {a.user.verified ? "1,000,000" : "10,000"} {ccy}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Illustrative limit; not a real exchange allowance.
            </p>
          </div>
        </aside>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm withdrawal</DialogTitle>
            <DialogDescription>
              Transfer of {amount} {ccy}. Recipient receives {receive} {ccy} after fees.
            </DialogDescription>
          </DialogHeader>
          <p className="break-all text-sm">{address}</p>
          <label className="text-sm">
            {a.user.twoFA ? "Authenticator code" : "6-digit security code"}
            <p className="mt-1 text-xs text-muted-foreground">Enter any six digits.</p>
          </label>
          <InputOTP maxLength={6} pattern="[0-9]*" value={code} onChange={setCode}>
            <InputOTPGroup>
              {Array.from({ length: 6 }, (_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <button
            className={primary}
            disabled={!/^\d{6}$/.test(code)}
            onClick={() => {
              if (act((s) => withdraw(s, ccy, Number(amount), fee, address))) {
                setOpen(false);
                setAmount("");
              }
            }}
          >
            Confirm withdrawal
          </button>
        </DialogContent>
      </Dialog>
      <section>
        <h2 className="mb-4 text-xl font-semibold">Recent withdrawals</h2>
        <ActivityTable items={a.activity.filter((x) => x.type === "withdraw").slice(0, 10)} />
      </section>
    </div>
  );
}
