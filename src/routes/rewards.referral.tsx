import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, Users } from "lucide-react";
import { toast } from "sonner";
import { useAccount } from "@/lib/store";
import { useAuthGuard } from "@/components/site/hooks";
import {
  Page,
  FAQ,
  Heading,
  Metric,
  primary,
  secondary,
  card,
  metadata,
} from "@/components/investing/ui";
export const Route = createFileRoute("/rewards/referral")({
  head: () =>
    metadata(
      "Referral Program",
      "Invite your friends and discover OK Trade referral commission tiers.",
    ),
  component: Referral,
});
function Referral() {
  const a = useAccount(),
    guard = useAuthGuard();
  const code = a ? `OK Trade${a.user.uid}` : "Log in to reveal";
  const link = a ? `https://onyx.exchange/signup?ref=${encodeURIComponent(code)}` : "";
  async function copy(value: string) {
    if (!guard()) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Clipboard unavailable. Select and copy the text manually.");
    }
  }
  function share(platform: string) {
    if (!guard()) return;
    const text = encodeURIComponent("Explore crypto with me on OK Trade.");
    const url = encodeURIComponent(link);
    const target =
      platform === "X"
        ? `https://twitter.com/intent/tweet?text=${text}&url=${url}`
        : platform === "Telegram"
          ? `https://t.me/share/url?url=${url}&text=${text}`
          : `https://wa.me/?text=${text}%20${url}`;
    window.open(target, "_blank", "noopener,noreferrer");
  }
  return (
    <Page
      title="Good things are better shared."
      description="Invite your circle to discover OK Trade. Explore referral commissions of up to 50% of eligible trading fees."
      hero={
        <div className="flex items-center gap-4">
          <Users className="size-10" />
          <p className="text-sm text-muted-foreground">
            A bigger community.
            <br />
            More possibilities.
          </p>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${card} space-y-6`}>
          <Heading>Your invitation starts here</Heading>
          <div>
            <p className="text-sm text-muted-foreground">Referral code</p>
            <div className="mt-2 flex items-center justify-between gap-4">
              <code className="break-all text-2xl font-semibold">{code}</code>
              <button
                className={secondary}
                aria-label="Copy referral code"
                onClick={() => copy(code)}
              >
                <Copy className="size-4" />
              </button>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Referral link</p>
            <p className="mt-2 break-all rounded-xl bg-surface p-4 text-sm">
              {link || "Sign in to get your personal invitation link."}
            </p>
            <button className={`${primary} mt-4`} onClick={() => copy(link)}>
              Copy invitation link
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {["X", "Telegram", "WhatsApp"].map((p) => (
              <button key={p} className={secondary} onClick={() => share(p)}>
                Share on {p}
              </button>
            ))}
          </div>
          <p className="text-xs leading-6 text-muted-foreground">
            Referral links use an illustrative domain. No real referral attribution or commission
            payouts are processed here.
          </p>
        </section>
        <section className={`${card} flex min-h-80 flex-col justify-between bg-surface`}>
          <p className="text-sm font-bold tracking-[.25em]">OK Trade / INVITE & EXPLORE</p>
          <h2 className="my-8 text-5xl font-bold tracking-tight">
            Your next chapter.
            <br />
            Our shared future.
          </h2>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Invitation code</p>
              <p className="mt-2 break-all text-lg font-semibold">{code}</p>
            </div>
            <span className="rounded-full border border-border px-4 py-2 text-sm">Up to 50%</span>
          </div>
        </section>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <div className={card}>
          <Metric label="Qualified invitees" value="0" />
        </div>
        <div className={card}>
          <Metric label="Commission earned" value="0.00 USDT" />
        </div>
        <div className={card}>
          <Metric label="Current tier" value="Explorer · 20%" />
        </div>
      </div>
      <section>
        <Heading>A tier for every community</Heading>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-muted-foreground">
              <tr>
                {["Tier", "Qualified invitees", "Commission rate"].map((t) => (
                  <th className="p-5" key={t}>
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Explorer", "0–9", "20%"],
                ["Builder", "10–49", "30%"],
                ["Ambassador", "50–199", "40%"],
                ["Partner", "200+", "50%"],
              ].map((r) => (
                <tr key={r[0]} className="border-t border-border">
                  {r.map((v) => (
                    <td key={v} className="tabular p-5">
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <Heading>Community preview · sample invitees</Heading>
        <p className="mb-4 text-sm text-muted-foreground">
          Illustrative records only. These do not count toward your account statistics.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {["alex***@mail.com", "river***@mail.com", "sam***@mail.com"].map((email, i) => (
            <div key={email} className={card}>
              <p className="font-medium">{email}</p>
              <p className="mt-3 text-sm text-muted-foreground">
                {i === 0
                  ? "Verified · sample"
                  : i === 1
                    ? "First trade complete · sample"
                    : "Registered · sample"}
              </p>
            </div>
          ))}
        </div>
      </section>
      <FAQ
        items={[
          [
            "How does commission work?",
            "In a real referral program, eligible trading fees paid by qualified invitees determine commissions. The sample tiers above illustrate rates; this preview does not track referrals or pay commissions.",
          ],
          [
            "What makes an invitee qualified?",
            "A typical program requires a new account, identity verification and eligible trading activity. Campaign and regional rules may vary.",
          ],
          [
            "Can I invite myself?",
            "Self-referrals, duplicate accounts and abuse are not eligible. Never promise guaranteed returns or misrepresent the risks of crypto.",
          ],
          ["Where can I learn more?", "Visit the help center for account and platform guidance."],
        ]}
      />
      <Link to="/help" className={secondary}>
        Visit help center
      </Link>
    </Page>
  );
}
