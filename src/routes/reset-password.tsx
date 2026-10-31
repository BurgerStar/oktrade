import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  AccountShell,
  accountMeta,
  field,
  primary,
  panel,
} from "@/components/account/AccountShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => accountMeta("Reset password"),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [sessionReady, setSessionReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setHasSession(!!data.session);
      setSessionReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (
      password.length < 8 ||
      password.length > 32 ||
      !/\d/.test(password) ||
      !/[A-Z]/.test(password)
    ) {
      setError("Use 8–32 characters, at least one number, and one uppercase letter.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    toast.success("Password updated");
    await navigate({ to: "/assets" });
  }

  return (
    <AccountShell title="Reset password">
      <div className="mx-auto max-w-lg">
        <section className={panel}>
          <h2 className="text-xl font-semibold">Choose a new password</h2>
          {!sessionReady ? (
            <p className="mt-4 text-sm text-muted-foreground">Checking reset link…</p>
          ) : !hasSession ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                This password reset link is invalid or has expired. Request a new link to continue.
              </p>
              <Link to="/login" className={`${primary} inline-flex`}>
                Return to sign in
              </Link>
            </div>
          ) : (
            <form className="mt-5 space-y-4" onSubmit={submit}>
              <label className="block text-sm">
                New password
                <input
                  className={`${field} mt-2`}
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={32}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <label className="block text-sm">
                Confirm new password
                <input
                  className={`${field} mt-2`}
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={32}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>
              {error && (
                <p role="alert" className="text-sm text-down">
                  {error}
                </p>
              )}
              <button type="submit" disabled={busy} className={`${primary} w-full`}>
                {busy ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
        </section>
      </div>
    </AccountShell>
  );
}
