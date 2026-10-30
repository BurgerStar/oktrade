import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell,
  ChevronDown,
  Download,
  Globe,
  HelpCircle,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  User as UserIcon,
  Wallet,
  ShieldCheck,
  Gift,
  ClipboardList,
  Copy as CopyIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MAIN_NAV } from "@/lib/nav";
import { FIAT } from "@/lib/coins";
import { setPrefs, signOut, update, useAccount, usePrefs } from "@/lib/store";
import { totalEquityUsd } from "@/lib/account";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Logo, LogoMark } from "./primitives";
import { SearchDialog } from "./SearchDialog";
import { useFiat, usePrices } from "./hooks";

const LANGUAGES = [
  "English",
  "Français",
  "Español",
  "Português",
  "Deutsch",
  "Türkçe",
  "Русский",
  "Tiếng Việt",
  "Bahasa Indonesia",
  "العربية",
  "中文(简体)",
  "日本語",
];

export function Header({ compact }: { compact?: boolean }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const account = useAccount();
  const prefs = usePrefs();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className={cn("flex h-16 items-center gap-6 px-4 sm:px-6", compact && "h-14")}>
        <Logo />
        <nav className="hidden items-center xl:flex" aria-label="Main">
          {MAIN_NAV.map((g) => (
            <div
              key={g.label}
              className={cn(
                "group relative",
                (g.label === "Institutional" || g.label === "Learn") && "hidden 2xl:block",
              )}
            >
              <button className="flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium text-foreground/90 transition-colors hover:text-foreground">
                {g.label}
                <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-hover:rotate-180" />
              </button>
              <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition-all duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <div
                  className={cn(
                    "rounded-2xl border border-border bg-popover p-3 shadow-2xl",
                    g.sections.length > 1 || (g.sections[0]?.items.length ?? 0) > 6
                      ? "w-[640px]"
                      : "w-[340px]",
                    g.sections.length > 1 && "grid grid-cols-2 gap-2",
                  )}
                >
                  {g.sections.map((s, i) => (
                    <div key={i} className={cn(!s.title && s.items.length > 6 && "grid grid-cols-2 gap-1")}>
                      {s.title && (
                        <p className="px-3 pb-1 pt-2 text-xs text-muted-foreground">{s.title}</p>
                      )}
                      {s.items.map((it) => (
                        <Link
                          key={it.to + it.label}
                          to={it.to}
                          className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-accent"
                        >
                          {it.icon && (
                            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border">
                              <it.icon className="size-4" />
                            </span>
                          )}
                          <span>
                            <span className="flex items-center gap-2 text-sm font-medium">
                              {it.label}
                              {it.badge && (
                                <span className="rounded bg-foreground px-1.5 py-0.5 text-[10px] font-semibold leading-none text-background">
                                  {it.badge}
                                </span>
                              )}
                            </span>
                            {it.description && (
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                {it.description}
                              </span>
                            )}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden h-9 items-center gap-2 rounded-full border border-border px-3 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground md:flex"
            aria-label="Search"
          >
            <Search className="size-4" />
            <span className="hidden lg:inline">Search</span>
            <kbd className="hidden rounded border border-border px-1.5 text-[10px] lg:inline">
              /
            </kbd>
          </button>
          <IconBtn label="Search" className="md:hidden" onClick={() => setSearchOpen(true)}>
            <Search />
          </IconBtn>

          {account ? (
            <>
              <Button asChild size="sm" className="hidden rounded-full px-4 sm:inline-flex">
                <Link to="/assets/deposit" search={{}}>
                  Deposit
                </Link>
              </Button>
              <AssetsMenu />
              <Notifications />
              <ProfileMenu />
            </>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden rounded-full sm:inline-flex"
              >
                <Link to="/login" search={{}}>
                  Log in
                </Link>
              </Button>
              <Button asChild size="sm" className="rounded-full px-4">
                <Link to="/signup" search={{}}>
                  Sign up
                </Link>
              </Button>
            </>
          )}

          <IconBtn label="Support center" className="hidden lg:inline-flex" asLink="/help">
            <HelpCircle />
          </IconBtn>
          <IconBtn
            label="Language and currency"
            className="hidden lg:inline-flex"
            onClick={() => setPrefsOpen(true)}
          >
            <Globe />
          </IconBtn>
          <IconBtn
            label={prefs.theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="hidden sm:inline-flex"
            onClick={() => setPrefs({ theme: prefs.theme === "dark" ? "light" : "dark" })}
          >
            {prefs.theme === "dark" ? <Sun /> : <Moon />}
          </IconBtn>
          <MobileNav onPrefs={() => setPrefsOpen(true)} />
        </div>
      </div>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <PreferencesDialog open={prefsOpen} onOpenChange={setPrefsOpen} />
    </header>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  className,
  asLink,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
  asLink?: string;
}) {
  const cls = cn(
    "inline-flex size-9 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-accent hover:text-foreground [&_svg]:size-[18px]",
    className,
  );
  if (asLink)
    return (
      <Link to={asLink} aria-label={label} title={label} className={cls}>
        {children}
      </Link>
    );
  return (
    <button aria-label={label} title={label} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

function AssetsMenu() {
  const account = useAccount();
  const prices = usePrices();
  const { format } = useFiat();
  if (!account) return null;
  const total = totalEquityUsd(account, prices);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="hidden h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium hover:bg-accent lg:flex">
          <Wallet className="size-4" /> Assets{" "}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 rounded-2xl p-2">
        <div className="p-3">
          <p className="text-xs text-muted-foreground">Est. total value</p>
          <p className="tabular mt-1 text-xl font-semibold">{format(total, { mask: true })}</p>
        </div>
        {[
          { to: "/assets", label: "Overview" },
          { to: "/assets/deposit", label: "Deposit" },
          { to: "/assets/withdraw", label: "Withdraw" },
          { to: "/assets/history", label: "Transaction history" },
          { to: "/orders", label: "Order center" },
        ].map((l) => (
          <Link key={l.to} to={l.to} className="block rounded-lg px-3 py-2 text-sm hover:bg-accent">
            {l.label}
          </Link>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function Notifications() {
  const account = useAccount();
  if (!account) return null;
  const unread = account.notifications.filter((n) => !n.read).length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative inline-flex size-9 items-center justify-center rounded-full hover:bg-accent"
        >
          <Bell className="size-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-foreground px-1 text-[10px] font-bold leading-4 text-background">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-2xl p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          <button
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() =>
              update((s) => ({
                ...s,
                notifications: s.notifications.map((n) => ({ ...n, read: true })),
              }))
            }
          >
            Mark all as read
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto scrollbar-thin">
          {account.notifications.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No notifications yet</p>
          ) : (
            account.notifications.map((n) => (
              <div key={n.id} className="border-b border-border px-4 py-3 last:border-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {!n.read && <span className="size-1.5 rounded-full bg-foreground" />}
                  {n.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(n.ts)}</p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ProfileMenu() {
  const account = useAccount();
  const navigate = useNavigate();
  if (!account) return null;
  const u = account.user;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Account"
          className="inline-flex size-9 items-center justify-center rounded-full hover:bg-accent"
        >
          <span className="grid size-7 place-items-center rounded-full bg-foreground text-xs font-bold uppercase text-background">
            {u.nickname[0]}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 rounded-2xl p-2">
        <div className="p-3">
          <p className="truncate font-semibold">{u.email}</p>
          <button
            className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              navigator.clipboard?.writeText(u.uid);
              toast.success("UID copied");
            }}
          >
            UID: {u.uid} <CopyIcon className="size-3" />
          </button>
          <span
            className={cn(
              "mt-2 inline-flex rounded px-2 py-0.5 text-[11px] font-medium",
              u.verified ? "bg-up-muted text-up" : "bg-accent text-muted-foreground",
            )}
          >
            {u.verified ? "Verified" : "Unverified"}
          </span>
        </div>
        {[
          { to: "/account", label: "Profile", icon: UserIcon },
          { to: "/account/security", label: "Security", icon: ShieldCheck },
          { to: "/account/verification", label: "Verification", icon: ClipboardList },
          { to: "/rewards", label: "Rewards hub", icon: Gift },
          { to: "/account/preferences", label: "Preferences", icon: Settings },
        ].map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent"
          >
            <l.icon className="size-4 text-muted-foreground" /> {l.label}
          </Link>
        ))}
        <button
          onClick={() => {
            signOut();
            toast("Logged out");
            navigate({ to: "/" });
          }}
          className="mt-1 flex w-full items-center gap-3 rounded-lg border-t border-border px-3 py-2.5 text-sm hover:bg-accent"
        >
          <LogOut className="size-4 text-muted-foreground" /> Log out
        </button>
      </PopoverContent>
    </Popover>
  );
}

function MobileNav({ onPrefs }: { onPrefs: () => void }) {
  const [open, setOpen] = useState(false);
  const account = useAccount();
  const prefs = usePrefs();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Open menu"
          className="inline-flex size-9 items-center justify-center rounded-full hover:bg-accent xl:hidden"
        >
          <Menu className="size-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-sm">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <LogoMark className="size-6" /> OK Trade
          </SheetTitle>
        </SheetHeader>
        {!account && (
          <div className="mt-6 grid grid-cols-2 gap-2">
            <Button
              asChild
              variant="outline"
              className="rounded-full"
              onClick={() => setOpen(false)}
            >
              <Link to="/login" search={{}}>
                Log in
              </Link>
            </Button>
            <Button asChild className="rounded-full" onClick={() => setOpen(false)}>
              <Link to="/signup" search={{}}>
                Sign up
              </Link>
            </Button>
          </div>
        )}
        {account && (
          <div className="mt-6 grid grid-cols-2 gap-2">
            <Button asChild className="rounded-full" onClick={() => setOpen(false)}>
              <Link to="/assets/deposit" search={{}}>
                Deposit
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-full"
              onClick={() => setOpen(false)}
            >
              <Link to="/assets">Assets</Link>
            </Button>
          </div>
        )}
        <Accordion type="multiple" className="mt-4">
          {MAIN_NAV.map((g) => (
            <AccordionItem key={g.label} value={g.label}>
              <AccordionTrigger className="text-base">{g.label}</AccordionTrigger>
              <AccordionContent>
                {g.sections
                  .flatMap((s) => s.items)
                  .map((it) => (
                    <Link
                      key={it.to + it.label}
                      to={it.to}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm hover:bg-accent"
                    >
                      {it.icon && <it.icon className="size-4 text-muted-foreground" />}
                      {it.label}
                    </Link>
                  ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="mt-4 space-y-1">
          <button
            onClick={() => setPrefs({ theme: prefs.theme === "dark" ? "light" : "dark" })}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-sm hover:bg-accent"
          >
            {prefs.theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            {prefs.theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onPrefs();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-sm hover:bg-accent"
          >
            <Globe className="size-4" /> {prefs.language} / {prefs.currency}
          </button>
          <Link
            to="/help"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm hover:bg-accent"
          >
            <HelpCircle className="size-4" /> Support center
          </Link>
          {account && (
            <button
              onClick={() => {
                signOut();
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-sm hover:bg-accent"
            >
              <LogOut className="size-4" /> Log out
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PreferencesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const prefs = usePrefs();
  const [tab, setTab] = useState<"lang" | "ccy">("lang");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>Preferences</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          {(["lang", "ccy"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm",
                tab === t
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              {t === "lang" ? "Language" : "Currency"}
            </button>
          ))}
        </div>
        <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto scrollbar-thin">
          {tab === "lang"
            ? LANGUAGES.map((l) => (
                <button
                  key={l}
                  onClick={() => {
                    setPrefs({ language: l });
                    if (l !== "English")
                      toast("Translation preview", {
                        description: "Content is currently shown in English.",
                      });
                  }}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left text-sm",
                    prefs.language === l ? "border-foreground" : "border-border hover:bg-accent",
                  )}
                >
                  {l}
                </button>
              ))
            : FIAT.map((f) => (
                <button
                  key={f.code}
                  onClick={() => setPrefs({ currency: f.code })}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left text-sm",
                    prefs.currency === f.code
                      ? "border-foreground"
                      : "border-border hover:bg-accent",
                  )}
                >
                  <span className="font-medium">{f.code}</span>{" "}
                  <span className="text-muted-foreground">· {f.symbol}</span>
                  <span className="block text-xs text-muted-foreground">{f.name}</span>
                </button>
              ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
