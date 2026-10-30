import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Check } from "lucide-react";
import { useAccount, update } from "@/lib/store";
import { notify } from "@/lib/account";
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
import { toast } from "sonner";
export const Route = createFileRoute("/account/verification")({
  head: () => accountMeta("Identity verification"),
  component: Page,
});
function Page() {
  return (
    <AccountShell title="Identity verification">
      <Verification />
    </AccountShell>
  );
}
function Verification() {
  const a = useAccount();
  const [institution, setInstitution] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [country, setCountry] = useState("United States");
  const [id, setId] = useState("Passport");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [dob, setDob] = useState("");
  const [file, setFile] = useState("");
  const [selfie, setSelfie] = useState(false);
  if (!a) return null;
  const next = () => setStep((s) => s + 1);
  return (
    <div className="space-y-7">
      <div className="flex gap-3">
        <button
          className={!institution ? primary : secondary}
          onClick={() => setInstitution(false)}
        >
          Individual
        </button>
        <button className={institution ? primary : secondary} onClick={() => setInstitution(true)}>
          Institutional
        </button>
      </div>
      {a.user.verified && (
        <div className={`${panel} flex items-center gap-4`}>
          <ShieldCheck size={30} />
          <div>
            <h2 className="font-semibold">Verified</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your individual identity verification is complete.
            </p>
          </div>
        </div>
      )}
      {institution ? (
        <section className={panel}>
          <h2 className="text-xl font-semibold">Institutional verification</h2>
          <p className="my-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Businesses require incorporation documents, beneficial ownership details and an
            authorized representative. Institutional onboarding is not performed in this local preview.
          </p>
          <button
            className={primary}
            onClick={() => {
              setInstitution(false);
              toast("Use individual verification to explore the account flow");
            }}
          >
            Explore individual verification
          </button>
        </section>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {["Basic", "Advanced"].map((level, i) => (
            <section key={level} className={panel}>
              <ShieldCheck className="mb-5" />
              <h2 className="text-xl font-semibold">{level}</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                {i
                  ? "Document and selfie review for expanded access."
                  : "Personal details and identity document."}
              </p>
              <ul className="my-5 space-y-3 text-sm">
                {[
                  "Crypto deposits enabled",
                  `${i ? "1,000,000" : "10,000"} USDT illustrative daily withdrawal limit`,
                  i ? "Expanded product access" : "Spot trading access",
                ].map((s) => (
                  <li className="flex gap-2" key={s}>
                    <Check size={16} />
                    {s}
                  </li>
                ))}
              </ul>
              <button
                className={a.user.verified ? secondary : primary}
                disabled={a.user.verified}
                onClick={() => {
                  setStep(0);
                  setOpen(true);
                }}
              >
                {a.user.verified ? "Verified" : "Verify now"}
              </button>
            </section>
          ))}
        </div>
      )}
      <section className={panel}>
        <h2 className="mb-5 font-semibold">Verification benefits</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted-foreground">
              <tr>
                {["Feature", "Unverified", "Basic", "Advanced"].map((h) => (
                  <th className="p-3 font-normal" key={h}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Crypto deposits", "Access", "Enabled", "Enabled"],
                ["24h withdrawals (USDT)", "10,000", "10,000", "1,000,000"],
                ["Spot & futures", "Access", "Enabled", "Enabled"],
              ].map((r) => (
                <tr className="border-t border-border" key={r[0]}>
                  {r.map((v, i) => (
                    <td className="tabular p-3" key={i}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          These benefits are illustrative. Basic and Advanced share one verified status. No
          identity data is sent to a server.
        </p>
      </section>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {
                [
                  "Country & document",
                  "Personal information",
                  "Upload document",
                  "Selfie check",
                  "Review & submit",
                ][step]
              }
            </DialogTitle>
            <DialogDescription>
              Step {step + 1} of 5 · Identity verification. Do not upload real identity documents.
            </DialogDescription>
          </DialogHeader>
          {step === 0 ? (
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                next();
              }}
            >
              <label className="block text-sm">
                Country of residence
                <select
                  className={`${field} mt-2`}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  {[
                    "United States",
                    "United Kingdom",
                    "Canada",
                    "Australia",
                    "France",
                    "Germany",
                    "Singapore",
                    "Japan",
                    "Other",
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                ID type
                <select
                  className={`${field} mt-2`}
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                >
                  {["Passport", "ID card", "Driver’s license"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <button className={primary}>Continue</button>
            </form>
          ) : step === 1 ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                next();
              }}
            >
              <label className="block text-sm">
                First name
                <input
                  className={`${field} mt-2`}
                  required
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Last name
                <input
                  className={`${field} mt-2`}
                  required
                  value={last}
                  onChange={(e) => setLast(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Date of birth
                <input
                  className={`${field} mt-2`}
                  required
                  type="date"
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18))
                    .toISOString()
                    .slice(0, 10)}
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </label>
              <button className={primary}>Continue</button>
            </form>
          ) : step === 2 ? (
            <>
              <label className="rounded-xl border border-dashed border-border p-8 text-center text-sm">
                Select a sample document
                <input
                  className="mt-4 block w-full text-xs"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && f.size > 10 * 1024 * 1024) {
                      toast.error("Maximum file size is 10 MB");
                      setFile("");
                    } else setFile(f?.name ?? "");
                  }}
                />
              </label>
              {file && <p className="break-all text-sm">Selected: {file}</p>}
              <button className={primary} disabled={!file} onClick={next}>
                Continue
              </button>
            </>
          ) : step === 3 ? (
            <>
              <p className="text-sm text-muted-foreground">
                Simulate a liveness check. No camera access or image collection is needed.
              </p>
              <button
                className={secondary}
                onClick={() => {
                  setSelfie(true);
                  toast.success("Selfie check complete");
                }}
              >
                {selfie ? "Selfie check complete" : "Simulate selfie capture"}
              </button>
              <button className={primary} disabled={!selfie} onClick={next}>
                Continue
              </button>
            </>
          ) : (
            <>
              <div className="space-y-3 rounded-xl bg-surface p-5 text-sm">
                <p>
                  {first} {last}
                </p>
                <p>
                  {country} · {id}
                </p>
                <p>Date of birth: {dob}</p>
                <p className="break-all">Sample file: {file}</p>
                <p>Selfie check complete</p>
              </div>
              <button
                className={primary}
                onClick={() => {
                  update((s) =>
                    notify(
                      { ...s, user: { ...s.user, verified: true } },
                      "Identity verified",
                      "Your identity verification is complete.",
                    ),
                  );
                  setOpen(false);
                  setFirst("");
                  setLast("");
                  setDob("");
                  setFile("");
                  setSelfie(false);
                  toast.success("Identity verified");
                }}
              >
                Submit verification
              </button>
            </>
          )}
          {step > 0 && (
            <button className={secondary} onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
