import { createFileRoute, redirect } from "@tanstack/react-router";
import { TradeTerminal } from "@/components/trade/TradeTerminal";

export const Route = createFileRoute("/futures/$instId")({
  beforeLoad: ({ params }) => {
    const norm = params.instId.toUpperCase();
    const base = norm.split("-")[0];
    const fixed = `${base}-USDT-SWAP`;
    if (fixed !== params.instId)
      throw redirect({ to: "/futures/$instId", params: { instId: fixed } });
  },
  head: ({ params }) => {
    const name = `${params.instId.split("-")[0]}USDT perpetual`;
    return {
      meta: [
        { title: `${name} futures — OK Trade` },
        {
          name: "description",
          content: `Trade ${name} with up to 125x leverage, cross or isolated margin, live funding rate and order book.`,
        },
        { property: "og:title", content: `${name} futures — OK Trade` },
        { property: "og:description", content: `Leveraged ${name} trading with live data.` },
      ],
    };
  },
  component: FuturesPage,
});

function FuturesPage() {
  const { instId } = Route.useParams();
  return <TradeTerminal key={instId} instId={instId} kind="futures" />;
}
