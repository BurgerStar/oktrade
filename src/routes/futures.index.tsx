import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/futures/")({
  beforeLoad: () => {
    throw redirect({ to: "/futures/$instId", params: { instId: "BTC-USDT-SWAP" } });
  },
});
