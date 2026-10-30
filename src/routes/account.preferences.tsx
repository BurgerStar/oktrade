import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Moon, Sun, Check } from "lucide-react";
import { usePrefs, setPrefs } from "@/lib/store";
import { FIAT } from "@/lib/coins";
import { Switch } from "@/components/ui/switch";
import { AccountShell, accountMeta, panel, field } from "@/components/account/AccountShell";
import { toast } from "sonner";
export const Route = createFileRoute("/account/preferences")({
  head: () => accountMeta("Preferences"),
  component: Page,
});
function Page() {
  return (
    <AccountShell title="Preferences">
      <Preferences />
    </AccountShell>
  );
}
function Preferences() {
  const p = usePrefs();
  const [settings, setSettings] = useState<Record<string, boolean>>({
    "Price alerts": true,
    "Order updates": true,
    "Product announcements": false,
    "Marketing emails": false,
    "Spot order confirmation": true,
    "Futures order confirmation": true,
    "Close position confirmation": true,
  });
  function toggle(key: string, v: boolean) {
    setSettings((s) => ({ ...s, [key]: v }));
    toast.success(`${key} ${v ? "enabled" : "disabled"} for this session`);
  }
  return (
    <div className="max-w-3xl space-y-7">
      <section className={panel}>
        <h2 className="mb-5 font-semibold">Appearance</h2>
        <div className="grid grid-cols-2 gap-4">
          {(["dark", "light"] as const).map((t) => (
            <button
              key={t}
              aria-pressed={p.theme === t}
              className={`relative rounded-xl border p-6 text-left ${p.theme === t ? "border-foreground bg-accent" : "border-border"}`}
              onClick={() => {
                setPrefs({ theme: t });
                toast.success(`${t === "dark" ? "Dark" : "Light"} theme applied`);
              }}
            >
              {t === "dark" ? <Moon className="mb-4" /> : <Sun className="mb-4" />}
              <span className="capitalize">{t}</span>
              {p.theme === t && <Check className="absolute right-4 top-4" size={17} />}
              <div className="mt-4 space-y-2 rounded-lg border border-border p-3">
                <div className="h-2 w-2/3 rounded bg-foreground opacity-40" />
                <div className="h-2 w-1/2 rounded bg-foreground opacity-20" />
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className={`${panel} space-y-6`}>
        <h2 className="font-semibold">Display settings</h2>
        <label className="block text-sm">
          Language
          <select
            className={`${field} mt-2`}
            value={p.language}
            onChange={(e) => {
              setPrefs({ language: e.target.value });
              toast.success("Language preference saved; interface remains in English");
            }}
          >
            {[
              "English",
              "简体中文",
              "繁體中文",
              "Español",
              "Français",
              "Deutsch",
              "日本語",
              "한국어",
              "Português",
            ].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Display currency
          <select
            className={`${field} mt-2`}
            value={p.currency}
            onChange={(e) => {
              setPrefs({ currency: e.target.value });
              toast.success("Display currency updated");
            }}
          >
            {FIAT.map((f) => (
              <option key={f.code} value={f.code}>
                {f.code} · {f.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Hide balances</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Mask balances across your asset overview.
            </p>
          </div>
          <Switch
            aria-label="Hide balances"
            checked={p.hideBalances}
            onCheckedChange={(v) => setPrefs({ hideBalances: v })}
          />
        </div>
        <div className="border-t border-border pt-5 text-sm">
          <h3 className="font-medium">Color convention</h3>
          <p className="mt-2 text-muted-foreground">
            <span className="text-up">Green</span> for price up / buy ·{" "}
            <span className="text-down">Red</span> for price down / sell
          </p>
        </div>
      </section>
      {[
        [
          "Notifications",
          ["Price alerts", "Order updates", "Product announcements", "Marketing emails"],
        ],
        [
          "Order confirmations",
          ["Spot order confirmation", "Futures order confirmation", "Close position confirmation"],
        ],
      ].map(([title, keys]) => (
        <section className={panel} key={title as string}>
          <h2 className="font-semibold">{title as string}</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Session-only preferences. These controls do not alter trading execution or send
            messages.
          </p>
          <div className="mt-3 divide-y divide-border">
            {(keys as string[]).map((k) => (
              <div key={k} className="flex items-center justify-between gap-4 py-4 text-sm">
                <label htmlFor={k}>{k}</label>
                <Switch
                  id={k}
                  checked={settings[k] ?? false}
                  onCheckedChange={(v) => toggle(k, v)}
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
