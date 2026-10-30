import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Search, ArrowUpRight, MessageCircle } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Page, Section, Filters, Missing, button, input, card } from "./ui";
import { lessons, helpArticles, announcements, type Article } from "./articles";
type Kind = "learn" | "help" | "announcements";
const data = { learn: lessons, help: helpArticles, announcements };
export function ArticleLink({ kind, item }: { kind: Kind; item: Article }) {
  return (
    <Link
      to={
        kind === "learn" ? "/learn/$slug" : kind === "help" ? "/help/$slug" : "/announcements/$slug"
      }
      params={{ slug: item.slug }}
      className={`${card} group flex h-full flex-col gap-4 transition-colors hover:bg-accent`}
    >
      <span className="text-xs uppercase tracking-widest text-muted-foreground">
        {item.category} · {item.date ?? item.level}
      </span>
      <h3 className="text-xl font-semibold tracking-tight">{item.title}</h3>
      <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
        {item.sections[0]?.text}
      </p>
      <span className="mt-auto flex items-center justify-between text-sm">
        {item.minutes} min read
        <ArrowUpRight size={18} />
      </span>
    </Link>
  );
}
export function Library({ kind }: { kind: Kind }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState(1);
  const items = data[kind];
  const filtered = items.filter(
    (a) =>
      (category === "All" || a.category === category) &&
      `${a.title} ${a.sections.map((s) => s.text).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 9));
  return (
    <Page
      title={
        kind === "learn"
          ? "Learn today. Lead tomorrow."
          : kind === "help"
            ? "How can we help?"
            : "The latest from OK Trade"
      }
      subtitle={
        kind === "learn"
          ? "Clear ideas for a complex market. Build your knowledge, one guide at a time."
          : kind === "help"
            ? "Find answers, solve problems, and trade with confidence."
            : "Product news, market additions, and important service notices."
      }
      eyebrow={kind === "learn" ? "OK Trade Academy" : kind === "help" ? "Support center" : "Newsroom"}
    >
      <div className="flex gap-3">
        <label className="relative w-full max-w-2xl">
          <Search className="absolute left-4 top-4 text-muted-foreground" size={18} />
          <input
            aria-label="Search articles"
            className={`${input} pl-12`}
            placeholder="Search articles and topics"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
        {kind === "help" && <SupportChat />}
      </div>
      {kind === "learn" && !query && category === "All" && (
        <Section title="Start here">
          <ArticleLink kind={kind} item={items[0]!} />
        </Section>
      )}
      <Filters
        items={["All", ...new Set(items.map((a) => a.category))]}
        value={category}
        onChange={(c) => {
          setCategory(c);
          setPage(1);
        }}
      />
      <Section title={kind === "help" ? "Popular answers" : "Explore articles"}>
        <p className="text-sm text-muted-foreground">{filtered.length} articles</p>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.slice((page - 1) * 9, page * 9).map((a) => (
            <ArticleLink key={a.slug} kind={kind} item={a} />
          ))}
        </div>
        {!filtered.length && <p>No matching articles. Try a different phrase or category.</p>}
        <div className="flex items-center gap-4">
          <button className={button} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="tabular">
            {page} / {pages}
          </span>
          <button className={button} disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      </Section>
    </Page>
  );
}
export function ArticlePage({ kind, slug }: { kind: Kind; slug: string }) {
  const a = data[kind].find((x) => x.slug === slug);
  const [vote, setVote] = useState("");
  if (!a) return <Missing kind="Article" />;
  return (
    <Page title={a.title} subtitle={`${a.category} · ${a.date ?? a.level} · ${a.minutes} min read`}>
      <Link
        to={kind === "learn" ? "/learn" : kind === "help" ? "/help" : "/announcements"}
        className="text-sm underline underline-offset-4"
      >
        ← All {kind === "learn" ? "guides" : kind === "help" ? "help articles" : "announcements"}
      </Link>
      <div className="grid gap-12 lg:grid-cols-[220px_1fr]">
        <aside>
          <p className="mb-4 font-semibold">On this page</p>
          <nav className="sticky top-24 space-y-3">
            {a.sections.map((s, i) => (
              <a
                key={s.title}
                href={`#section-${i}`}
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                {s.title}
              </a>
            ))}
          </nav>
        </aside>
        <article className="max-w-3xl space-y-10">
          {a.sections.map((s, i) => (
            <section key={s.title} id={`section-${i}`} className="scroll-mt-24">
              <h2 className="mb-4 text-2xl font-bold tracking-tight">{s.title}</h2>
              <p className="text-base leading-8 text-muted-foreground">{s.text}</p>
            </section>
          ))}
          {kind === "help" && (
            <div className={card}>
              <p className="mb-4 font-semibold">Was this helpful?</p>
              <div className="flex gap-3">
                {["Yes", "No"].map((v) => (
                  <button
                    key={v}
                    className={button}
                    disabled={!!vote}
                    onClick={() => {
                      setVote(v);
                      toast.success(
                        v === "Yes"
                          ? "Thanks for your feedback"
                          : "Thanks. Try chat for more guidance.",
                      );
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
              {vote && <p className="mt-4 text-sm">Your feedback was recorded for this session.</p>}
            </div>
          )}
        </article>
      </div>
      <Section title="Keep exploring">
        <div className="grid gap-5 md:grid-cols-3">
          {data[kind]
            .filter((x) => x.slug !== slug)
            .sort((x, y) => Number(y.category === a.category) - Number(x.category === a.category))
            .slice(0, 3)
            .map((x) => (
              <ArticleLink key={x.slug} kind={kind} item={x} />
            ))}
        </div>
      </Section>
    </Page>
  );
}
export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hi, I’m the OK Trade assistant. Ask about deposits, orders, fees, or account security. Never send passwords or private keys.",
    },
  ]);
  const [typing, setTyping] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);
  function send() {
    if (!draft.trim() || typing) return;
    const q = draft.trim();
    setDraft("");
    setMessages((m) => [...m, { role: "you", text: q }]);
    setTyping(true);
    timer.current = setTimeout(() => {
      const words = q
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3);
      const ranked = helpArticles
        .map((a) => ({
          a,
          score: words.filter((w) => `${a.title} ${a.category}`.toLowerCase().includes(w)).length,
        }))
        .sort((a, b) => b.score - a.score);
      const match = ranked[0];
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text:
            match && match.score > 0
              ? `${match.a.title}: ${match.a.sections[0]?.text}`
              : "Try a specific question about deposits, withdrawals, identity, fees, P2P, or security. This assistant cannot access your account or open a support case.",
        },
      ]);
      setTyping(false);
    }, 800);
  }
  return (
    <>
      <button className={button} onClick={() => setOpen(true)}>
        <MessageCircle size={18} />
        <span>Chat with us</span>
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col sm:max-w-lg">
          <SheetTitle>OK Trade support</SheetTitle>
          <SheetDescription>Automated assistant · no account access</SheetDescription>
          <div className="flex-1 space-y-4 overflow-y-auto py-4" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`${card} ${m.role === "you" ? "ml-8" : "mr-8 bg-surface"}`}>
                <p className="mb-2 text-xs uppercase text-muted-foreground">{m.role}</p>
                <p className="text-sm leading-6">{m.text}</p>
              </div>
            ))}
            {typing && (
              <p className="animate-pulse text-sm text-muted-foreground">Assistant is typing…</p>
            )}
            <div ref={end} />
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              className={input}
              aria-label="Your question"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={1000}
            />
            <button className={button} disabled={typing || !draft.trim()}>
              Send
            </button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
