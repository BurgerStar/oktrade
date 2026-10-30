import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Shield, Globe, Lightbulb } from "lucide-react";
import { Page, Section, meta, button, card } from "@/components/content/ui";
export const Route = createFileRoute("/about")({
  head: () =>
    meta(
      "About us",
      "Meet OK Trade: our mission, values, people and approach to open digital markets.",
    ),
  component: About,
});
function About() {
  return (
    <Page
      title="A world of opportunity. Open to everyone."
      subtitle="We’re building intuitive tools for people to explore digital assets—with transparency, thoughtful design and security at the core."
      eyebrow="About OK Trade"
    >
      <Section title="Our mission">
        <p className="max-w-3xl text-xl leading-9 text-muted-foreground">
          Make complex markets feel clear. OK Trade brings trading, learning and portfolio tools
          together so every decision starts with better information. This exchange is a
          preview experience, not a regulated financial service.
        </p>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ["10M+", "Illustrative user community"],
            ["100+", "Illustrative markets served"],
            ["$2B+", "Illustrative daily volume"],
          ].map(([v, l]) => (
            <div key={v} className={card}>
              <p className="tabular text-4xl font-bold">{v}</p>
              <p className="mt-3 text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Progress, one step at a time">
        <div className="grid gap-5 md:grid-cols-4">
          {[
            ["2021", "The idea", "A simpler way to discover digital markets."],
            ["2022", "The foundation", "Spot trading and account tools take shape."],
            ["2023", "A broader perspective", "Learning and portfolio experiences expand."],
            ["2025", "The next chapter", "A unified view of transparent exchange design."],
          ].map(([y, t, d]) => (
            <div className={card} key={y}>
              <p className="tabular text-muted-foreground">{y}</p>
              <h3 className="my-3 text-xl font-semibold">{t}</h3>
              <p className="text-sm leading-7 text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Principles in practice">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              Icon: Shield,
              t: "Trust through clarity",
              d: "Explain costs and risks before asking for a decision.",
            },
            {
              Icon: Globe,
              t: "Access with responsibility",
              d: "Build understandable tools and respect regional requirements.",
            },
            {
              Icon: Lightbulb,
              t: "Progress through curiosity",
              d: "Listen carefully, test assumptions and keep improving.",
            },
          ].map(({ Icon, t, d }) => (
            <div key={t} className={card}>
              <Icon size={30} />
              <h3 className="mt-6 text-xl font-semibold">{t}</h3>
              <p className="mt-3 leading-7 text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Meet the leadership">
        <p className="text-sm text-muted-foreground">Illustrative team profiles for this product preview.</p>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ["AL", "Alex Lin", "Chief Executive Officer"],
            ["MR", "Morgan Reed", "Chief Technology Officer"],
            ["SK", "Samira Khan", "Chief Risk Officer"],
          ].map(([i, n, r]) => (
            <div key={i} className={card}>
              <span className="grid size-20 place-items-center rounded-full bg-surface-2 text-2xl font-bold">
                {i}
              </span>
              <h3 className="mt-5 text-xl font-semibold">{n}</h3>
              <p className="mt-2 text-muted-foreground">{r}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section title="From the newsroom">
        <Link to="/announcements" className={`${card} flex justify-between text-xl font-semibold`}>
          Product stories and company updates
          <ArrowUpRight />
        </Link>
      </Section>
      <Section title="A global perspective">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ["Singapore", "Product & engineering"],
            ["Dubai", "Institutional & operations"],
            ["London", "Research & partnerships"],
          ].map(([c, d]) => (
            <div key={c} className={card}>
              <h3 className="text-xl font-semibold">{c}</h3>
              <p className="mt-2 text-muted-foreground">{d}</p>
              <p className="mt-4 text-xs text-muted-foreground">
                Illustrative team hub · not a customer service office
              </p>
            </div>
          ))}
        </div>
        <Link className={button} to="/careers">
          Explore careers <ArrowUpRight size={18} />
        </Link>
      </Section>
    </Page>
  );
}
