import { useQuery } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback } from "react";
import { toast } from "sonner";
import { priceMap, tickersQuery } from "@/lib/market";
import { getAccount, run, usePrefs } from "@/lib/store";
import { FIAT } from "@/lib/coins";
import type { AccountState, Result } from "@/lib/account";

/** Live spot tickers (USDT pairs), polled. Non-suspending. */
export function useSpotTickers() {
  return useQuery(tickersQuery("SPOT"));
}
export function useSwapTickers() {
  return useQuery(tickersQuery("SWAP"));
}

/** Symbol → USD price map from live spot tickers. */
export function usePrices(): Record<string, number> {
  const { data } = useSpotTickers();
  return priceMap(data);
}

/**
 * Returns a guard: call `guard()` before an action that needs a signed-in user.
 * If signed out it routes to /login?redirect=<current path> and returns false.
 */
export function useAuthGuard() {
  const navigate = useNavigate();
  const href = useRouterState({ select: (s) => s.location.href });
  return useCallback(() => {
    if (getAccount()) return true;
    toast("Log in to continue", { description: "Create your account in seconds." });
    navigate({ to: "/login", search: { redirect: href } });
    return false;
  }, [navigate, href]);
}

/** Runs an account action with auth guard + toast feedback. Returns true on success. */
export function useAction() {
  const guard = useAuthGuard();
  return useCallback(
    (fn: (s: AccountState) => Result, successMsg?: string) => {
      if (!guard()) return false;
      const r = run(fn);
      if (r.ok) toast.success(successMsg ?? r.message ?? "Done");
      else toast.error(r.error);
      return r.ok;
    },
    [guard],
  );
}

/** Formats a USD value in the user's chosen display currency. */
export function useFiat() {
  const prefs = usePrefs();
  const fiat = FIAT.find((f) => f.code === prefs.currency) ?? FIAT[0];
  return {
    fiat,
    hide: prefs.hideBalances,
    format: (usd: number, opts?: { decimals?: number; mask?: boolean }) => {
      if (opts?.mask && prefs.hideBalances) return "******";
      const v = usd * fiat.rate;
      const d = opts?.decimals ?? (Math.abs(v) >= 1 || v === 0 ? 2 : 6);
      return `${fiat.symbol}${v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
    },
  };
}
