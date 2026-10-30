import { Link } from "@tanstack/react-router";
import { FOOTER_NAV } from "@/lib/nav";
import { Container, Logo } from "./primitives";

const SOCIALS = [
  { label: "X", href: "https://x.com" },
  { label: "Telegram", href: "https://telegram.org" },
  { label: "Discord", href: "https://discord.com" },
  { label: "YouTube", href: "https://youtube.com" },
  { label: "Instagram", href: "https://instagram.com" },
  { label: "LinkedIn", href: "https://linkedin.com" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <Container className="py-16">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_3fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-xs text-sm text-muted-foreground">
              Trade, earn and build on a black-and-white exchange designed for clarity.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {FOOTER_NAV.map((col) => (
              <div key={col.title}>
                <p className="text-sm font-semibold">{col.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {col.items.map((i) => (
                    <li key={i.to + i.label}>
                      <Link
                        to={i.to}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {i.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} OK Trade Investment Limited</p>
          <p className="text-[11px] opacity-70">investment platform</p>
        </div>
      </Container>
    </footer>
  );
}
