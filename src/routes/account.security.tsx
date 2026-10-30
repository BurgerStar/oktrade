import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAccount, update, changePassword } from "@/lib/store";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  AccountShell,
  accountMeta,
  panel,
  primary,
  secondary,
  field,
} from "@/components/account/AccountShell";
import { Modal, copy } from "@/components/account/Shared";
import { toast } from "sonner";
export const Route = createFileRoute("/account/security")({
  head: () => accountMeta("Security"),
  component: Page,
});
function Page() {
  return (
    <AccountShell title="Security">
      <Security />
    </AccountShell>
  );
}
function Security() {
  const a = useAccount();
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [savedPhone, setSavedPhone] = useState("");
  const [old, setOld] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [anti, setAnti] = useState("");
  const [whitelist, setWhitelist] = useState(false);
  if (!a) return null;
  const score =
    40 + (a.user.twoFA ? 30 : 0) + (a.user.antiPhishing ? 20 : 0) + (whitelist ? 10 : 0);
  const secret = `OK Trade${a.user.uid}2FAKEY`;
  return (
    <div className="space-y-7">
      <section className={panel}>
        <div className="mb-4 flex justify-between">
          <h2 className="font-semibold">Security score</h2>
          <strong className="tabular">{score}/100</strong>
        </div>
        <Progress value={score} />
        <p className="mt-4 text-sm text-muted-foreground">
          Enable an authenticator and anti-phishing code to strengthen your account security.
        </p>
      </section>
      <section className={`${panel} divide-y divide-border`}>
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
          <div>
            <h3 className="font-semibold">Authenticator app</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {a.user.twoFA ? "Enabled" : "Not enabled"} · Two-factor verification
            </p>
          </div>
          {a.user.twoFA ? (
            <button
              className={secondary}
              onClick={() => {
                update((s) => ({ ...s, user: { ...s.user, twoFA: false } }));
                toast.success("Authenticator disabled");
              }}
            >
              Disable
            </button>
          ) : (
            <Modal label="Set up" title="Set up authenticator">
              <p className="text-sm text-muted-foreground">
                Secret only — do not add this to a real authenticator. Any six digits confirm
                setup.
              </p>
              <p className="break-all rounded-lg bg-surface p-4 font-mono">{secret}</p>
              <button className={secondary} onClick={() => copy(secret)}>
                Copy key
              </button>
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
                  update((s) => ({ ...s, user: { ...s.user, twoFA: true } }));
                  toast.success("Authenticator enabled");
                }}
              >
                Confirm setup
              </button>
            </Modal>
          )}
        </div>
        <div className="flex justify-between py-6">
          <div>
            <h3 className="font-semibold">Email</h3>
            <p className="mt-1 text-sm text-muted-foreground">{a.user.email}</p>
          </div>
          <span className="text-sm">Verified</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 py-6">
          <div>
            <h3 className="font-semibold">Phone</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {savedPhone || "Not added · session-only setting"}
            </p>
          </div>
          <Modal label={savedPhone ? "Change" : "Add phone"} title="Add phone number">
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setSavedPhone(phone);
                toast.success("Phone saved for this session");
              }}
            >
              <input
                type="tel"
                required
                pattern="\+?[0-9 ()-]{7,20}"
                aria-label="Phone number"
                className={field}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 010 2040"
              />
              <button className={primary}>Save phone</button>
            </form>
          </Modal>
        </div>
        <div className="flex items-center justify-between py-6">
          <h3 className="font-semibold">Login password</h3>
          <Modal label="Change" title="Change login password">
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (pw !== confirm) {
                  toast.error("New passwords do not match");
                  return;
                }
                const r = await changePassword(old, pw);
                if (r.ok) {
                  setOld("");
                  setPw("");
                  setConfirm("");
                  toast.success("Password changed");
                } else toast.error(r.error);
              }}
            >
              {[
                ["Current password", old, setOld],
                ["New password", pw, setPw],
                ["Confirm new password", confirm, setConfirm],
              ].map(([label, v, set]) => (
                <label key={label as string} className="block text-sm">
                  {label as string}
                  <input
                    type="password"
                    autoComplete={
                      label === "Current password" ? "current-password" : "new-password"
                    }
                    required
                    minLength={label === "Current password" ? 1 : 8}
                    className={`${field} mt-2`}
                    value={v as string}
                    onChange={(e) => (set as (s: string) => void)(e.target.value)}
                  />
                </label>
              ))}
              <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
              <button className={primary}>Update password</button>
            </form>
          </Modal>
        </div>
        <div className="flex items-center justify-between py-6">
          <div>
            <h3 className="font-semibold">Anti-phishing code</h3>
            <p className="mt-1 text-sm text-muted-foreground">{a.user.antiPhishing || "Not set"}</p>
          </div>
          <Modal label="Set code" title="Set anti-phishing code">
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                update((s) => ({ ...s, user: { ...s.user, antiPhishing: anti } }));
                toast.success("Anti-phishing code updated");
              }}
            >
              <input
                required
                minLength={4}
                maxLength={20}
                className={field}
                aria-label="Anti-phishing code"
                value={anti}
                onChange={(e) => setAnti(e.target.value)}
                placeholder="4–20 characters"
              />
              <button className={primary}>Save code</button>
            </form>
          </Modal>
        </div>
        <div className="flex items-center justify-between pt-6">
          <div>
            <h3 className="font-semibold">Withdrawal whitelist</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Session-only preference; does not restrict withdrawals.
            </p>
          </div>
          <Switch
            aria-label="Withdrawal whitelist"
            checked={whitelist}
            onCheckedChange={(v) => {
              setWhitelist(v);
              toast.success(`Whitelist ${v ? "enabled" : "disabled"}`);
            }}
          />
        </div>
      </section>
      <section className={panel}>
        <h2 className="font-semibold">Devices</h2>
        <div className="mt-5 flex justify-between text-sm">
          <div>
            Current browser
            <p className="mt-1 text-xs text-muted-foreground">This device · Active session</p>
          </div>
          <span>Current device</span>
        </div>
      </section>
      <section className={panel}>
        <h2 className="font-semibold">Login history</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Illustrative records, not a security audit log.
        </p>
        {[
          ["Current session", "Browser · This device"],
          ["Yesterday, 18:42", "Browser · Successful"],
          ["3 days ago, 09:15", "Browser · Successful"],
        ].map(([date, detail]) => (
          <div className="flex justify-between border-b border-border py-4 text-sm" key={date}>
            <span>{date}</span>
            <span className="text-muted-foreground">{detail}</span>
          </div>
        ))}
      </section>
      <Modal label="Freeze account" title="Freeze account?">
        <p className="text-sm text-muted-foreground">
          This action is a security request only and does not affect your account balances.
        </p>
        <button
          className={primary}
          onClick={() => toast.success("Freeze request recorded. Your account remains accessible.")}
        >
          Confirm request
        </button>
      </Modal>
    </div>
  );
}
