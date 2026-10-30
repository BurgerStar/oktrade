import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, KeyRound, Trash2, Terminal, Radio, Network } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Page, Section, Filters, button, input, card, meta } from "@/components/content/ui";
import { useAuthGuard } from "@/components/site/hooks";
import { useAccount } from "@/lib/store";
export const Route = createFileRoute("/api-docs")({
  head: () =>
    meta(
      "API documentation",
      "Build with OK Trade REST, WebSocket and FIX interfaces. Explore authentication, endpoints and API keys.",
    ),
  component: ApiDocs,
});
const samples = {
  curl: `curl 'https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT'`,
  Python: `import urllib.request\nimport json\n\nurl = "https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT"\nwith urllib.request.urlopen(url, timeout=10) as response:\n    ticker = json.load(response)\n    print(ticker["data"][0]["last"])`,
  JavaScript: `const response = await fetch(\n  'https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT'\n);\nif (!response.ok) throw new Error('Market request failed');\nconst { data } = await response.json();\nconsole.log(data[0].last);`,
};
type ApiKey = { id: string; name: string; permissions: string[]; ip: string };
async function copy(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard");
  } catch {
    toast.error("Clipboard unavailable. Select and copy the text manually.");
  }
}
function randomHex(bytes: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
function ApiDocs() {
  const guard = useAuthGuard();
  const account = useAccount();
  const [language, setLanguage] = useState("curl");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState(["Read"]);
  const [ip, setIp] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [created, setCreated] = useState<{ key: string; secret: string } | null>(null);
  function close(value: boolean) {
    setOpen(value);
    if (!value) {
      setCreated(null);
      setPassphrase("");
    }
  }
  return (
    <Page
      title="Build your edge."
      eyebrow="OK Trade Developer platform"
      subtitle="Market data, automated strategies and real-time connections. The tools to turn your ideas into execution."
    >
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center gap-3">
          <Terminal />
          <div>
            <p className="font-bold">API v5 reference</p>
            <p className="text-sm text-muted-foreground">
              Public examples use OKX market data. OK Trade key examples are for development and testing.
            </p>
          </div>
        </div>
        <button
          className={button}
          onClick={() => {
            if (guard()) {
              setName("");
              setIp("");
              setPermissions(["Read"]);
              setCreated(null);
              setOpen(true);
            }
          }}
        >
          <KeyRound size={17} />
          Create API key
        </button>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {[
          [
            Terminal,
            "REST",
            "Request-response access to tickers, order books, account balances and order management.",
          ],
          [
            Radio,
            "WebSocket",
            "Stream public market channels and receive incremental updates without polling.",
          ],
          [
            Network,
            "FIX",
            "Institutional session-based connectivity for order entry and execution reports.",
          ],
        ].map(([Icon, title, body]) => {
          const I = Icon as typeof Terminal;
          return (
            <a
              href={`#${String(title).toLowerCase()}`}
              className={`${card} transition-colors hover:bg-accent`}
              key={String(title)}
            >
              <I className="mb-6" />
              <h2 className="text-xl font-bold">{String(title)}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{String(body)}</p>
            </a>
          );
        })}
      </div>
      <section id="rest" className="scroll-mt-24 space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">REST • Start with a ticker</h2>
        <p className="max-w-3xl text-muted-foreground">
          Public market endpoints need no authentication. The examples below call the actual OKX v5
          public API. Inspect the response code as well as HTTP status; code “0” indicates success.
        </p>
        <Filters items={Object.keys(samples)} value={language} onChange={setLanguage} />
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <span className="text-xs text-muted-foreground">GET /api/v5/market/ticker</span>
            <button
              className="flex items-center gap-2 rounded-full px-3 py-2 text-sm hover:bg-accent"
              onClick={() => copy(samples[language as keyof typeof samples])}
            >
              <Copy size={15} />
              Copy
            </button>
          </div>
          <pre className="overflow-x-auto p-6 text-sm leading-7">
            <code>{samples[language as keyof typeof samples]}</code>
          </pre>
        </div>
        <div className={card}>
          <h3 className="text-lg font-bold">Authenticated requests</h3>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Private requests use OK-ACCESS-KEY, OK-ACCESS-SIGN, OK-ACCESS-TIMESTAMP and
            OK-ACCESS-PASSPHRASE headers. The signature is Base64-encoded HMAC-SHA256 of timestamp +
            uppercase method + request path (including query) + body, signed with your secret. Use
            the exact transmitted body and keep clocks synchronized. Never put credentials in
            browser code or URLs.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Keys created here are for local testing only and cannot authenticate to OKX or place real orders.
          </p>
        </div>
      </section>
      <Section title="Endpoint directory">
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-surface">
              <tr>
                {["Method", "Endpoint", "Purpose", "Access"].map((h) => (
                  <th key={h} className="p-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["GET", "/api/v5/market/ticker", "Single instrument ticker", "Public"],
                ["GET", "/api/v5/market/books", "Order book depth", "Public"],
                ["GET", "/api/v5/market/candles", "Historical OHLCV", "Public"],
                ["GET", "/api/v5/public/instruments", "Instrument specifications", "Public"],
                ["GET", "/api/v5/account/balance", "Account balances", "Read"],
                ["POST", "/api/v5/trade/order", "Place an order", "Trade"],
                ["POST", "/api/v5/trade/cancel-order", "Cancel an order", "Trade"],
                ["POST", "/api/v5/asset/withdrawal", "Request withdrawal", "Withdraw"],
              ].map((r) => (
                <tr key={r[1]} className="border-t border-border">
                  {r.map((c, i) => (
                    <td key={i} className={`p-4 ${i === 1 ? "font-mono text-xs" : ""}`}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <section id="websocket" className="scroll-mt-24 space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">WebSocket • Stay in sync</h2>
        <p className="max-w-3xl text-muted-foreground">
          Connect to the public endpoint below, then send the subscription message. Send “ping”
          after an idle period and expect “pong”. Reconnect with exponential backoff and resubscribe
          after interruptions. Book consumers should validate sequence numbers and rebuild state
          after a gap.
        </p>
        <div className={card}>
          <p className="break-all font-mono text-sm">wss://ws.okx.com:8443/ws/v5/public</p>
          <pre className="mt-5 overflow-x-auto text-sm">
            <code>
              {JSON.stringify(
                { op: "subscribe", args: [{ channel: "tickers", instId: "BTC-USDT" }] },
                null,
                2,
              )}
            </code>
          </pre>
          <button
            className="mt-5 flex items-center gap-2 text-sm font-semibold"
            onClick={() =>
              copy(
                JSON.stringify({
                  op: "subscribe",
                  args: [{ channel: "tickers", instId: "BTC-USDT" }],
                }),
              )
            }
          >
            <Copy size={15} />
            Copy subscription
          </button>
        </div>
      </section>
      <section id="fix" className="scroll-mt-24 space-y-5">
        <h2 className="text-3xl font-bold tracking-tight">FIX • Institutional workflows</h2>
        <div className={card}>
          <p className="leading-relaxed text-muted-foreground">
            FIX connectivity requires institutional onboarding, approved network access and
            separately provisioned session credentials. Negotiate sender/target IDs, heartbeat
            intervals and sequence recovery before certification. Use unique client order IDs,
            reconcile execution reports and never treat a network timeout as an order rejection.
          </p>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            This product does not operate a FIX gateway. Ask support about eligibility, certification
            environments, supported message types and production access before integration.
          </p>
        </div>
      </section>
      <Section title="Rate limits & resilient clients">
        <p className="text-sm text-muted-foreground">
          Illustrative planning limits based on common v5 endpoints. Limits vary by endpoint and
          account tier; verify current provider documentation before deployment.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-surface">
              <tr>
                {["Operation", "Limit", "Scope"].map((h) => (
                  <th className="p-5" key={h}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Market ticker", "20 requests / 2 seconds", "IP address"],
                ["Order book", "40 requests / 2 seconds", "IP address"],
                ["Account balance", "10 requests / 2 seconds", "User ID"],
                ["Place order", "60 requests / 2 seconds", "User + instrument"],
                ["WS subscribe / login", "480 requests / hour", "Connection"],
              ].map((r) => (
                <tr className="border-t border-border" key={r[0]}>
                  {r.map((c) => (
                    <td className="tabular p-5" key={c}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted-foreground">
          Queue requests, apply backoff with jitter, and reconcile order state before retrying a
          timed-out write. A successful transport response is not a guarantee of an accepted order.
        </p>
      </Section>
      <Section title="Your API keys">
        <p className="text-sm text-muted-foreground">
          Keys exist only in this page's memory and disappear on reload. Never enter a real
          passphrase or use these credentials in production.
        </p>
        {account && keys.length ? (
          <div className="space-y-3">
            {keys.map((k) => (
              <div className={`${card} flex flex-wrap items-center gap-4`} key={k.id}>
                <KeyRound size={22} />
                <div className="flex-1">
                  <p className="font-bold">{k.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {k.permissions.join(", ")} • IP: {k.ip || "Not restricted"} • …{k.id.slice(-8)}
                  </p>
                </div>
                <button
                  aria-label={`Delete ${k.name}`}
                  className="rounded-full border border-border p-3 hover:bg-accent"
                  onClick={() => {
                    if (guard()) {
                      setKeys((old) => old.filter((x) => x.id !== k.id));
                      toast.success("API key deleted");
                    }
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className={`${card} text-center text-muted-foreground`}>
            No API keys to display. Create a key to explore permission controls.
          </div>
        )}
      </Section>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {created ? "Save your API credentials" : "Create an API key"}
            </DialogTitle>
            <DialogDescription>
              {created
                ? "The secret is displayed only until you close this dialog. These credentials cannot access real funds."
                : "Choose the minimum permissions needed. No real API access is granted."}
            </DialogDescription>
          </DialogHeader>
          {created ? (
            <div className="space-y-5">
              {[
                ["API key", created.key],
                ["Secret", created.secret],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="mb-2 text-sm font-semibold">{label}</p>
                  <code className="block break-all rounded-xl bg-surface p-3 text-xs">{value}</code>
                  <button
                    className="mt-2 flex items-center gap-2 text-sm"
                    onClick={() => copy(value ?? "")}
                  >
                    <Copy size={14} />
                    Copy {label?.toLowerCase()}
                  </button>
                </div>
              ))}
              <button className={`${button} w-full`} onClick={() => close(false)}>
                I have saved my credentials
              </button>
            </div>
          ) : (
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!guard()) return;
                if (!permissions.length) {
                  toast.error("Choose at least one permission");
                  return;
                }
                const addresses = ip
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean);
                if (
                  addresses.some(
                    (a) =>
                      !/^((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$/.test(
                        a,
                      ),
                  )
                ) {
                  toast.error("Enter comma-separated IPv4 addresses");
                  return;
                }
                const key = "onyx_demo_" + randomHex(16);
                setKeys((old) => [
                  ...old,
                  {
                    id: key,
                    name: name.trim(),
                    permissions: [...permissions],
                    ip: addresses.join(", "),
                  },
                ]);
                setCreated({ key, secret: randomHex(32) });
                setPassphrase("");
                toast.success("API key created");
              }}
            >
              <label className="block text-sm font-semibold">
                Key name
                <input
                  required
                  maxLength={50}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`${input} mt-2`}
                  placeholder="My market research"
                  pattern=".*\S.*"
                />
              </label>
              <fieldset>
                <legend className="mb-3 text-sm font-semibold">Permissions</legend>
                <div className="flex gap-5">
                  {["Read", "Trade", "Withdraw"].map((p) => (
                    <label key={p} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={permissions.includes(p)}
                        onChange={(e) =>
                          setPermissions((old) =>
                            e.target.checked ? [...old, p] : old.filter((x) => x !== p),
                          )
                        }
                      />
                      {p}
                    </label>
                  ))}
                </div>
                {permissions.includes("Withdraw") && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Withdrawal access is sensitive. Use IP restrictions and a dedicated key in real
                    integrations.
                  </p>
                )}
              </fieldset>
              <label className="block text-sm font-semibold">
                IP whitelist (optional)
                <input
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  className={`${input} mt-2`}
                  placeholder="203.0.113.10, 198.51.100.20"
                />
              </label>
              <label className="block text-sm font-semibold">
                Passphrase
                <input
                  required
                  type="password"
                  minLength={8}
                  maxLength={64}
                  autoComplete="new-password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className={`${input} mt-2`}
                  placeholder="8–64 characters; do not reuse a real password"
                />
              </label>
              <p className="text-xs text-muted-foreground">
                The passphrase is discarded after creation.
              </p>
              <button className={`${button} w-full`} type="submit">
                Create API key
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Page>
  );
}
