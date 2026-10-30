import type { ReactNode } from "react";
import { Container, PageHero } from "@/components/site/primitives";
export const button =
  "inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-80 disabled:opacity-40";
export const input =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-foreground";
export const card = "rounded-2xl border border-border bg-card p-6";
export function Page({
  title,
  subtitle,
  eyebrow = "OK Trade",
  children,
}: {
  title: string;
  subtitle: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <>
      <PageHero title={title} subtitle={subtitle} eyebrow={eyebrow} />
      <Container className="space-y-12 py-12 md:py-16">{children}</Container>
    </>
  );
}
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
      {children}
    </section>
  );
}
export function Filters({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((x) => (
        <button
          key={x}
          onClick={() => onChange(x)}
          aria-pressed={x === value}
          className={`rounded-full border border-border px-4 py-2 text-sm ${x === value ? "bg-foreground text-background" : "hover:bg-accent"}`}
        >
          {x}
        </button>
      ))}
    </div>
  );
}
export function Missing({ kind }: { kind: string }) {
  return (
    <Page
      title={`${kind} not found`}
      subtitle="This address does not match an available OK Trade resource."
    >
      <p>Use the navigation to return to markets, learning, or support.</p>
    </Page>
  );
}
export const meta = (title: string, description: string) => ({
  meta: [
    { title: `${title} — OK Trade` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — OK Trade` },
    { property: "og:description", content: description },
  ],
});
