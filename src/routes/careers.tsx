import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Page, Section, Filters, meta, card } from "@/components/content/ui";
import { ContactForm } from "@/components/content/forms";
export const Route = createFileRoute("/careers")({
  head: () =>
    meta("Careers", "Explore engineering, product, security and operations roles at OK Trade."),
  component: Careers,
});
const jobs = [
  ["Senior Frontend Engineer", "Engineering", "Remote · EMEA"],
  ["Distributed Systems Engineer", "Engineering", "Singapore"],
  ["Site Reliability Engineer", "Engineering", "Remote · Global"],
  ["Product Designer", "Design", "Hong Kong"],
  ["Senior Product Manager, Trading", "Product", "Singapore"],
  ["Security Researcher", "Security", "Remote · Global"],
  ["Compliance Operations Lead", "Compliance", "Dubai"],
  ["Institutional Account Manager", "Sales", "London"],
  ["Customer Experience Specialist", "Operations", "Remote · APAC"],
  ["Data Scientist, Market Quality", "Data", "Singapore"],
];
function Careers() {
  const [department, setDepartment] = useState("All");
  return (
    <Page
      title="Build what comes next."
      subtitle="Bring your curiosity. Take ownership. Help make digital markets more accessible."
      eyebrow="Careers at OK Trade"
    >
      <div className="grid gap-5 md:grid-cols-3">
        {[
          ["Own the outcome", "Small teams, meaningful problems and room to make a difference."],
          ["Keep learning", "Dedicated development time and cross-functional collaboration."],
          ["Work sustainably", "Flexible working practices and time to recharge."],
        ].map(([t, d]) => (
          <div className={card} key={t}>
            <h2 className="text-xl font-semibold">{t}</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>
      <Section title="Find your team">
        <p className="text-sm text-muted-foreground">
          Illustrative openings for OK Trade. Applications are not transmitted.
        </p>
        <Filters
          items={["All", ...new Set(jobs.map((j) => j[1]!))]}
          value={department}
          onChange={setDepartment}
        />
        <div className="space-y-3">
          {jobs
            .filter((j) => department === "All" || j[1] === department)
            .map(([title, dept, location]) => (
              <div
                className={`${card} flex flex-wrap items-center justify-between gap-5`}
                key={title}
              >
                <div>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {dept} · {location} · Full time
                  </p>
                </div>
                <ContactForm label="Apply" job={title!} />
              </div>
            ))}
        </div>
      </Section>
    </Page>
  );
}
