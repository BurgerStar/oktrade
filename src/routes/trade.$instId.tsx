import { createFileRoute, redirect } from "@tanstack/react-router";
import { TradeTerminal } from "@/components/trade/TradeTerminal";

export const Route = createFileRoute("/trade/$instId")({
  beforeLoad: ({ params }) => {
    const norm = params.instId.toUpperCase().replace("_", "-");
    const fixed = norm.includes("-") ? norm.replace(/-SWAP$/, "") : `${norm}-USDT`;
    if (fixed !== params.instId)
      throw redirect({ to: "/trade/$instId", params: { instId: fixed } });
  },
  head: ({ params }) => {
    const pair = params.instId.replace("-", "/");
    return {
      meta: [
        { title: `${pair} spot trading — OK Trade` },
        {
          name: "description",
          content: `Trade ${pair} with a live chart, real-time order book, recent trades and limit / market orders on OK Trade.`,
        },
        { property: "og:title", content: `${pair} spot trading — OK Trade` },
        { property: "og:description", content: `Live ${pair} chart, order book and trading.` },
      ],
    };
  },
  component: SpotTradePage,
});

function SpotTradePage() {
  const { instId } = Route.useParams();
  return <TradeTerminal key={instId} instId={instId} kind="spot" />;
}
