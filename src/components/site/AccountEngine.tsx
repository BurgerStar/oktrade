import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { checkLiquidations, matchOrders } from "@/lib/account";
import { tickersQuery } from "@/lib/market";
import { hydrateStore, update, useAccount } from "@/lib/store";

/** Loads persisted state after hydration and keeps open orders / positions in sync with live prices. */
export function AccountEngine() {
  useEffect(() => {
    hydrateStore();
  }, []);

  const account = useAccount();
  const hasOrders = !!account?.orders.some((o) => o.status === "open");
  const hasPositions = !!account?.positions.length;
  const spot = useQuery({ ...tickersQuery("SPOT"), enabled: hasOrders });
  const swap = useQuery({ ...tickersQuery("SWAP"), enabled: hasPositions });

  useEffect(() => {
    if (!hasOrders || !spot.data) return;
    update((s) => {
      let next = s;
      const ids = new Set(s.orders.filter((o) => o.status === "open").map((o) => o.instId));
      for (const t of spot.data) if (ids.has(t.instId)) next = matchOrders(next, t.instId, t.last);
      return next;
    });
  }, [spot.data, hasOrders]);

  useEffect(() => {
    if (!hasPositions || !swap.data) return;
    update((s) => {
      let next = s;
      const ids = new Set(s.positions.map((p) => p.instId));
      for (const t of swap.data)
        if (ids.has(t.instId)) next = checkLiquidations(next, t.instId, t.last);
      return next;
    });
  }, [swap.data, hasPositions]);

  return null;
}
