import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, Eye, EyeOff, ShieldCheck, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { requestPasswordReset, signIn, signUp, useAccount } from "@/lib/store";
import { usePrices } from "@/components/site/hooks";
import { Modal, field, primary } from "./shared";
export function AuthPage({
  signup = false,
  redirect,
  initialEmail,
}: {
  signup?: boolean;
  redirect: string | undefined;
  initialEmail?: string | undefined;
}) {
  const account = useAccount();
  const prices = usePrices();
  const navigate = useNavigate();
  const [tab, setTab] = useState("Email");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [country, setCountry] = useState("United States");
  const [terms, setTerms] = useState(false);
  const [referral, setReferral] = useState("");
  const [step, setStep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reset, setReset] = useState(false);
  const [resetEmail, setResetEmail] = useState(initialEmail ?? "");
  const [resetBusy, setResetBusy] = useState(false);
  const rules = [
    password.length >= 8 && password.length <= 32,
    /\d/.test(password),
    /[A-Z]/.test(password),
  ];
  const destination =
    redirect?.startsWith("/") &&
    !redirect.startsWith("//") &&
    !redirect.includes("\\") &&
    !/^\/(login|signup)(?:[/?#]|$)/.test(redirect)
      ? redirect
      : "/assets";
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (signup && (!rules.every(Boolean) || !terms)) {
      setError("Meet all password rules and accept the terms.");
      return;
    }
    setBusy(true);
    try {
      const result = signup ? await signUp(email, password) : await signIn(email, password);
      if (!result.ok) {
        setError(result.error ?? "Unable to continue. Please try again.");
        return;
      }
      if (signup && result.emailConfirmationRequired) {
        setStep(true);
        toast.success("Check your email to confirm your account");
        return;
      }
      toast.success(signup ? "Welcome! Your account is ready." : "Welcome back to OK Trade");
      await navigate({ to: destination });
    } catch {
      setError("Unable to access your account. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto grid min-h-[780px] max-w-7xl lg:grid-cols-2">
      <section className="hidden flex-col justify-between border-r border-border bg-surface px-12 py-20 lg:flex">
        <div>
          <div className="text-sm font-bold uppercase tracking-[0.3em]">
            OK Trade / Your next move
          </div>
          <h1 className="mt-12 text-7xl font-bold leading-[1.03] tracking-tight">
            A world of
            <br />
            opportunity.
            <br />
            <span className="text-muted-foreground">Made yours.</span>
          </h1>
          <p className="mt-7 max-w-sm text-lg leading-relaxed text-muted-foreground">
            Explore crypto with the tools to turn curiosity into confidence.
          </p>
          <div className="mt-10 space-y-4">
            {[
              "Live markets. Real-time possibilities.",
              "One account. Your entire crypto journey.",
            ].map((t) => (
              <div key={t} className="flex items-center gap-3">
                <Check size={18} />
                {t}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-16 grid grid-cols-2 gap-5">
          {["BTC", "ETH"].map((s) => (
            <div key={s} className="rounded-2xl border border-border p-5">
              <div className="flex justify-between text-sm text-muted-foreground">
                {s} / USDT
                <ArrowUpRight size={16} />
              </div>
              <p className="mt-3 text-2xl font-semibold tabular">
                ${(prices[s] ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">Live market price</p>
            </div>
          ))}
        </div>
      </section>
      <section className="px-6 py-12 md:px-16 lg:py-20">
        <div className="mb-9 flex gap-3 rounded-xl border border-border bg-surface p-4 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="size-5 shrink-0" />
          Secure account access. Use a strong password and keep your device protected.
        </div>
        {account ? (
          <div className="py-14">
            <h2 className="text-3xl font-bold tracking-tight">You're already logged in</h2>
            <p className="my-6 text-muted-foreground">Your account is ready to explore.</p>
            <Link to="/assets" className={`${primary} inline-block`}>
              Go to assets
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-bold tracking-tight">
              {signup ? (step ? "Check your email" : "Create your account") : "Welcome back"}
            </h2>
            <p className="mb-8 mt-3 text-sm text-muted-foreground">
              {signup
                ? step
                  ? `Use the confirmation link sent to ${email} to finish creating your account.`
                  : "Your crypto journey starts here."
                : "Log in to your OK Trade account."}
            </p>
            {!signup && (
              <div className="mb-7 flex gap-6 border-b border-border">
                {["Email", "Phone", "QR code"].map((t) => (
                  <button
                    key={t}
                    className={`pb-3 text-sm ${tab === t ? "border-b-2 border-foreground font-semibold" : "text-muted-foreground"}`}
                    onClick={() => {
                      setTab(t);
                      setEmail("");
                      setError("");
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
            {signup && step ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-border bg-surface p-5">
                  <p className="font-medium">Email confirmation required</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your account and deposit access will be available after you confirm your email.
                  </p>
                </div>
                <Link
                  to="/login"
                  search={redirect ? { redirect } : {}}
                  className={`${primary} w-full`}
                >
                  Return to sign in
                </Link>
              </div>
            ) : !signup && tab === "QR code" ? (
              <div className="space-y-5 text-center">
                <div
                  aria-label="Decorative QR code, not scannable"
                  className="mx-auto grid w-48 grid-cols-[repeat(21,minmax(0,1fr))] border-8 border-background bg-background"
                >
                  {Array.from({ length: 441 }, (_, i) => (
                    <span
                      key={i}
                      className={`aspect-square ${(i * 17 + Math.floor(i / 21) * 13) % 7 < 4 ? "bg-foreground" : "bg-background"}`}
                    />
                  ))}
                </div>
                <h3 className="font-semibold">QR login preview</h3>
                <p className="text-sm text-muted-foreground">
                  On a live exchange, open the app and scan to sign in. This QR preview is
                  decorative.
                </p>
                <button onClick={() => setTab("Email")} className={primary}>
                  Use email instead
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <>
                  {signup && (
                    <label className="block text-sm">
                      Country of residence
                      <select
                        required
                        className={`${field} mt-2`}
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                      >
                        {[
                          "United States",
                          "United Kingdom",
                          "Germany",
                          "France",
                          "United Arab Emirates",
                          "Brazil",
                          "India",
                          "Japan",
                          "Nigeria",
                          "Türkiye",
                          "Canada",
                          "Australia",
                          "Singapore",
                        ].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="block text-sm">
                    {tab === "Phone" ? "Phone number" : "Email address"}
                    <input
                      required
                      type={tab === "Phone" ? "tel" : "email"}
                      autoComplete={tab === "Phone" ? "tel" : "email"}
                      pattern={tab === "Phone" ? "\\+?[0-9 ()-]{7,20}" : undefined}
                      className={`${field} mt-2`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={tab === "Phone" ? "+1 555 123 4567" : "you@example.com"}
                    />
                  </label>
                  <label className="block text-sm">
                    Password
                    <div className="relative mt-2">
                      <input
                        required
                        type={show ? "text" : "password"}
                        autoComplete={signup ? "new-password" : "current-password"}
                        className={`${field} pr-12`}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        aria-label={show ? "Hide password" : "Show password"}
                        className="absolute right-4 top-3.5 text-muted-foreground"
                        onClick={() => setShow(!show)}
                      >
                        {show ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </label>
                  {signup ? (
                    <>
                      <ul className="space-y-2 text-xs">
                        {[
                          "8–32 characters",
                          "At least one number",
                          "At least one uppercase letter",
                        ].map((r, i) => (
                          <li
                            key={r}
                            className={`flex items-center gap-2 ${rules[i] ? "text-foreground" : "text-muted-foreground"}`}
                          >
                            <Check size={14} className={rules[i] ? "" : "opacity-30"} />
                            {r}
                          </li>
                        ))}
                      </ul>
                      <label className="block text-sm">
                        Referral code <span className="text-muted-foreground">(optional)</span>
                        <input
                          className={`${field} mt-2`}
                          value={referral}
                          onChange={(e) => setReferral(e.target.value)}
                          maxLength={32}
                        />
                      </label>
                      <label className="flex items-start gap-3 text-xs leading-relaxed text-muted-foreground">
                        <input
                          type="checkbox"
                          required
                          checked={terms}
                          onChange={(e) => setTerms(e.target.checked)}
                          className="mt-1 accent-foreground"
                        />
                        <span>
                          I agree to the{" "}
                          <Link
                            to="/legal/$doc"
                            params={{ doc: "terms" }}
                            className="text-foreground underline"
                          >
                            Terms of service
                          </Link>{" "}
                          and{" "}
                          <Link
                            to="/legal/$doc"
                            params={{ doc: "privacy" }}
                            className="text-foreground underline"
                          >
                            Privacy notice
                          </Link>
                          .
                        </span>
                      </label>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="text-sm underline"
                      onClick={() => setReset(true)}
                    >
                      Forgot password?
                    </button>
                  )}
                  {error && (
                    <p role="alert" className="text-sm text-down">
                      {error}
                    </p>
                  )}
                  <button type="submit" disabled={busy} className={`${primary} w-full`}>
                    {busy ? "Please wait…" : signup ? "Create account" : "Log in"}
                  </button>
                </>
              </form>
            )}
            {!step && (
              <>
                <div className="my-7 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  Or continue with
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {["Google", "Apple", "Telegram", "Wallet"].map((s) => (
                    <button
                      key={s}
                      className="rounded-full border border-border py-3 text-sm hover:bg-surface"
                      onClick={() => toast("Use email to continue")}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <p className="mt-8 text-center text-sm text-muted-foreground">
                  {signup ? "Already have an account?" : "New to OK Trade?"}{" "}
                  <Link
                    className="font-semibold text-foreground underline"
                    to={signup ? "/login" : "/signup"}
                    search={redirect ? { redirect } : {}}
                  >
                    {signup ? "Log in" : "Sign up"}
                  </Link>
                </p>
              </>
            )}
          </>
        )}
      </section>
      <Modal
        open={reset}
        close={() => setReset(false)}
        title="Password recovery"
        description="We’ll send a password reset link if the account is eligible."
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setResetBusy(true);
            const result = await requestPasswordReset(resetEmail);
            setResetBusy(false);
            if (result.ok) {
              toast.success("If the account exists, a reset link has been sent.");
              setReset(false);
            } else {
              toast.error(result.error ?? "Unable to send a reset link.");
            }
          }}
        >
          <label className="block text-sm">
            Email address
            <input
              required
              type="email"
              className={`${field} mt-2`}
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
            />
          </label>
          <button type="submit" disabled={resetBusy} className={primary}>
            {resetBusy ? "Sending…" : "Send reset link"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
