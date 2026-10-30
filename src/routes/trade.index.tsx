import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/trade/")({
  beforeLoad: () => {
    throw redirect({ to: "/trade/$instId", params: { instId: "BTC-USDT" } });
  },
});
