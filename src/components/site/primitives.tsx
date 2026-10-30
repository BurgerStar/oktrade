import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { coinIconUrl } from "@/lib/coins";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

/** OK Trade brand mark: a 3x3 grid with an onyx "O" ring of squares. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 30" className={cn("size-7", className)} aria-hidden>
      <rect x="0" y="0" width="9" height="9" fill="currentColor" />
      <rect x="10.5" y="0" width="9" height="9" fill="currentColor" />
      <rect x="21" y="0" width="9" height="9" fill="currentColor" />
      <rect x="0" y="10.5" width="9" height="9" fill="currentColor" />
      <rect x="21" y="10.5" width="9" height="9" fill="currentColor" />
      <rect x="0" y="21" width="9" height="9" fill="currentColor" />
      <rect x="10.5" y="21" width="9" height="9" fill="currentColor" />
      <rect x="21" y="21" width="9" height="9" fill="currentColor" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn("flex items-center gap-2 text-foreground", className)}
      aria-label="OK Trade home"
    >
      <LogoMark />
      <span className="flex flex-col leading-none"><span className="text-[17px] font-bold tracking-[0.12em]">OK TRADE</span><span className="mt-0.5 text-[8.5px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Investment Limited</span></span>
    </Link>
  );
}

export function CoinIcon({
  symbol,
  size = 24,
  className,
}: {
  symbol: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed || !symbol) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-foreground font-semibold text-background",
          className,
        )}
        style={{ width: size, height: size, fontSize: size * 0.42 }}
        aria-hidden
      >
        {symbol?.[0] ?? "?"}
      </span>
    );
  }
  return (
    <img
      src={coinIconUrl(symbol)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("shrink-0 rounded-full", className)}
      style={{ width: size, height: size }}
    />
  );
}

export function PctChange({
  value,
  className,
  pill,
}: {
  value: number | undefined;
  className?: string;
  pill?: boolean;
}) {
  const up = (value ?? 0) >= 0;
  return (
    <span
      className={cn(
        "tabular",
        up ? "text-up" : "text-down",
        pill && (up ? "rounded-md bg-up-muted px-2 py-1" : "rounded-md bg-down-muted px-2 py-1"),
        className,
      )}
    >
      {formatPct(value)}
    </span>
  );
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  subtitle,
  children,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-b border-border", className)}>
      <Container className="py-14 md:py-20">
        {eyebrow && (
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">{title}</h1>
        {subtitle && (
          <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">{subtitle}</p>
        )}
        {children && <div className="mt-8">{children}</div>}
      </Container>
    </section>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight md:text-4xl">{title}</h2>
        {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Pill-style tab bar used across pages (OKX look). */
export function PillTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
  size = "md",
}: {
  tabs: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="tablist"
      className={cn("no-scrollbar flex items-center gap-1 overflow-x-auto", className)}
    >
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "shrink-0 rounded-full font-medium transition-colors",
            size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm",
            value === t.value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Underline-style tab bar (used in trade panels). */
export function LineTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn("no-scrollbar flex items-center gap-5 overflow-x-auto", className)}
    >
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "relative shrink-0 py-2.5 text-sm font-medium transition-colors",
            value === t.value
              ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-full border border-dashed border-border">
        <LogoMark className="size-5 text-muted-foreground" />
      </div>
      <p className="font-medium">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="tabular mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
