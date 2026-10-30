import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, Eye, EyeOff, ShieldCheck, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { signIn, signUp, useAccount } from "@/lib/store";
import { usePrices } from "@/components/site/hooks";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
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
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reset, setReset] = useState(false);
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
    if (signup && !step) {
      setStep(true);
      return;
    }
    if (signup && !/^\d{6}$/.test(otp)) {
      setError("Enter any 6 digits to verify your account.");
      return;
    }
    setBusy(true);
    try {
      const result = signup ? await signUp(email, password) : await signIn(email, password);
      if (!result.ok) {
        setError(result.error ?? "Unable to continue. Please try again.");
        return;
      }
      toast.success(signup ? "Welcome! 10,000 USDT added to your account" : "Welcome back to OK Trade");
      await navigate({ to: destination });
    } catch {
      setError("Unable to access local accounts. Please try again in this browser.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto grid min-h-[780px] max-w-7xl lg:grid-cols-2">
      <section className="hidden flex-col justify-between border-r border-border bg-surface px-12 py-20 lg:flex">
        <div>
          <div className="text-sm font-bold uppercase tracking-[0.3em]">OK Trade / Your next move</div>
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
              "10,000 USDT in your account",
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
              {signup ? (step ? "Verify your email" : "Create your account") : "Welcome back"}
            </h2>
            <p className="mb-8 mt-3 text-sm text-muted-foreground">
              {signup ? "Your crypto journey starts here." : "Log in to your OK Trade account."}
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
            {!signup && tab === "QR code" ? (
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
                  On a live exchange, open the app and scan to sign in. This QR preview is decorative.
                </p>
                <button onClick={() => setTab("Email")} className={primary}>
                  Use email instead
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                {step ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Enter the verification code for <b className="text-foreground">{email}</b>.
                    </p>
                    <div className="rounded-xl bg-surface p-4 text-sm">
                      Verification code: <b className="tabular">123456</b>. Any 6 digits work.
                    </div>
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={(v) => setOtp(v.replace(/\D/g, ""))}
                      aria-label="Email verification code"
                    >
                      <InputOTPGroup>
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <InputOTPSlot key={i} index={i} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                    <button
                      type="button"
                      className="text-sm underline"
                      onClick={() => {
                        setStep(false);
                        setError("");
                      }}
                    >
                      Edit email
                    </button>
                  </>
                ) : (
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
                        pattern={tab === "Phone" ? "\+?[0-9 ()-]{7,20}" : undefined}
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
                  </>
                )}
                {error && (
                  <p role="alert" className="text-sm text-down">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={busy || (step && otp.length !== 6)}
                  className={`${primary} w-full`}
                >
                  {busy
                    ? "Please wait…"
                    : signup
                      ? step
                        ? "Verify and create account"
                        : "Create account"
                      : "Log in"}
                </button>
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
        description="Accounts are stored locally on this device."
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          If you forgot your password, create a new account with a different email address. Your
          existing local account remains unchanged.
        </p>
        <Link to="/signup" search={redirect ? { redirect } : {}} className={`${primary} inline-block`}>
          Create a new account
        </Link>
      </Modal>
    </div>
  );
}
