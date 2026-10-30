import { useEffect, useState, type ReactNode } from "react";
import { Container, PageHero, EmptyState } from "@/components/site/primitives";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
export const primary =
  "inline-flex items-center justify-center rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed";
export const secondary =
  "inline-flex items-center justify-center rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-accent disabled:opacity-40";
export const input =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-ring";
export const card = "rounded-2xl border border-border bg-card p-6";
export function useClock() {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}
export function fmt(n: number, d = 2) {
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d })
    : "—";
}
export function duration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 86400)}d ${String(Math.floor(s / 3600) % 24).padStart(2, "0")}h ${String(Math.floor(s / 60) % 60).padStart(2, "0")}m ${String(s % 60).padStart(2, "0")}s`;
}
export function Page({
  title,
  eyebrow = "GROW WITH OK Trade",
  description,
  children,
  hero,
}: {
  title: string;
  eyebrow?: string;
  description: string;
  children: ReactNode;
  hero?: ReactNode;
}) {
  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} subtitle={description}>
        {hero}
      </PageHero>
      <Container className="space-y-14 py-12 md:py-16">
        {children}
        <p className="border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
          This environment uses preview data. All balances, strategies and rewards are for
          estimates, not guarantees. Crypto assets carry risk, including loss of principal.
        </p>
      </Container>
    </>
  );
}
export function Tabs({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <div role="tablist" className="flex flex-wrap gap-2">
      {items.map((s) => (
        <button
          key={s}
          role="tab"
          aria-selected={s === value}
          className={s === value ? primary : secondary}
          onClick={() => onChange(s)}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  options: string[];
}) {
  return (
    <Field label={label}>
      <select className={input} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
    </Field>
  );
}
export function Modal({
  title,
  description = "Review the details before confirming your transaction.",
  open,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-border bg-background">
        <DialogTitle className="text-2xl font-bold tracking-tight">{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}
export function FAQ({ items }: { items: [string, string][] }) {
  return (
    <section>
      <h2 className="mb-6 text-3xl font-bold tracking-tight">Your questions, answered</h2>
      {items.map(([q, a]) => (
        <details key={q} className="border-b border-border py-5">
          <summary className="cursor-pointer font-medium">{q}</summary>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{a}</p>
        </details>
      ))}
    </section>
  );
}
export function Empty({ text }: { text: string }) {
  return (
    <EmptyState
      title={text}
      body="Explore the products above to get started with your account."
    />
  );
}
export function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="tabular mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
export function Heading({ children }: { children: ReactNode }) {
  return <h2 className="mb-6 text-3xl font-bold tracking-tight">{children}</h2>;
}
export function metadata(title: string, description: string) {
  return {
    meta: [
      { title: `${title} — OK Trade` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} — OK Trade` },
      { property: "og:description", content: description },
    ],
  };
}
