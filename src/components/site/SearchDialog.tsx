import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { MAIN_NAV } from "@/lib/nav";
import { coinName } from "@/lib/coins";
import { formatPrice } from "@/lib/format";
import { CoinIcon, PctChange } from "./primitives";
import { useSpotTickers } from "./hooks";

export function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const navigate = useNavigate();
  const { data: tickers } = useSpotTickers();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.key === "k" && (e.metaKey || e.ctrlKey)) ||
        (e.key === "/" &&
          !(e.target instanceof HTMLInputElement) &&
          !(e.target instanceof HTMLTextAreaElement))
      ) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const go = (to: string) => {
    onOpenChange(false);
    navigate({ to });
  };

  const pages = MAIN_NAV.flatMap((g) => g.sections.flatMap((s) => s.items));
  const uniquePages = pages.filter((p, i) => pages.findIndex((x) => x.to === p.to) === i);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search crypto, products and pages" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Crypto">
          {(tickers ?? []).slice(0, 80).map((t) => (
            <CommandItem
              key={t.instId}
              value={`${t.base} ${coinName(t.base)} ${t.instId}`}
              onSelect={() => go(`/trade/${t.instId}`)}
              className="flex items-center gap-3"
            >
              <CoinIcon symbol={t.base} size={20} />
              <span className="font-medium">{t.base}</span>
              <span className="text-muted-foreground">{coinName(t.base)}</span>
              <span className="tabular ml-auto">{formatPrice(t.last)}</span>
              <PctChange value={t.change24h} className="w-16 text-right text-xs" />
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Products & pages">
          {uniquePages.map((p) => (
            <CommandItem
              key={p.to}
              value={`${p.label} ${p.description ?? ""}`}
              onSelect={() => go(p.to)}
            >
              {p.icon && <p.icon className="mr-2 size-4" />}
              {p.label}
              <span className="ml-2 truncate text-xs text-muted-foreground">{p.description}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
