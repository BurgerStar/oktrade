import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Shield, Building2, Layers, Users, Briefcase } from "lucide-react";
import { Page, Section, meta, card } from "@/components/content/ui";
import { ContactForm } from "@/components/content/forms";
export const Route = createFileRoute("/institutional")({
  head: () =>
    meta(
      "Institutional services",
      "Explore liquidity, OTC, custody and prime services for professional market participants.",
    ),
  component: Institutional,
});
function Institutional() {
  return (
    <Page
      title="Infrastructure for your next advantage."
      subtitle="A connected approach to liquidity, execution and asset operations. Built around the needs of professional market participants."
      eyebrow="OK Trade Institutional"
    >
      <ContactForm />
      <div className="grid gap-5 md:grid-cols-3">
        {[
          ["24/7", "Digital market access"],
          ["6", "Service verticals"],
          ["1", "Connected experience"],
        ].map(([v, l]) => (
          <div className={card} key={l}>
            <p className="tabular text-4xl font-bold">{v}</p>
            <p className="mt-3 text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>
      <Section title="Your strategy. Our focus.">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              Icon: BarChart3,
              t: "Liquidity",
              d: "Explore order-book access, execution analytics and market-making workflows across digital asset pairs.",
            },
            {
              Icon: Briefcase,
              t: "OTC & block trading",
              d: "Discuss large-order execution requirements, quote workflows and settlement planning with a dedicated team.",
            },
            {
              Icon: Shield,
              t: "Custody",
              d: "Design asset controls around access policies, separation of duties and transparent operational reporting.",
            },
            {
              Icon: Layers,
              t: "Prime brokerage",
              d: "Coordinate portfolio, execution and collateral workflows with a consolidated view of exposures.",
            },
            {
              Icon: Users,
              t: "Broker program",
              d: "Integrate client trading experiences with API connectivity, attribution and operational support.",
            },
            {
              Icon: Building2,
              t: "VIP services",
              d: "Discuss tier eligibility, fee schedules and service needs with relationship-focused support.",
            },
          ].map(({ Icon, t, d }) => (
            <div key={t} className={card}>
              <Icon size={30} />
              <h2 className="mt-6 text-xl font-semibold">{t}</h2>
              <p className="mt-3 leading-7 text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </Section>
      <div className={`${card} flex flex-wrap items-center justify-between gap-6`}>
        <div>
          <h2 className="text-2xl font-bold">Let’s understand your requirements.</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Services are illustrative and subject to eligibility, jurisdiction and agreed terms.
            This product does not provide brokerage or custody.
          </p>
        </div>
        <ContactForm />
      </div>
    </Page>
  );
}
