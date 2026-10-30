import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Wallet, ArrowLeftRight, Image, Layers, Globe, ScanLine } from "lucide-react";
import { toast } from "sonner";
import {
  Page,
  Modal,
  Heading,
  Metric,
  primary,
  secondary,
  card,
  metadata,
} from "@/components/investing/ui";
export const Route = createFileRoute("/web3/")({
  head: () =>
    metadata(
      "Web3 Wallet",
      "Explore a multichain world with OK Trade Wallet. Discover DeFi, NFTs and cross-chain swaps.",
    ),
  component: Web3,
});
const networks = [
  "Ethereum",
  "Bitcoin",
  "Solana",
  "BNB Chain",
  "Polygon",
  "Arbitrum",
  "Base",
  "X Layer",
  "TON",
  "Tron",
  "Avalanche",
  "Optimism",
];
function Web3() {
  const [open, setOpen] = useState(false),
    [wallet, setWallet] = useState("");
  return (
    <Page
      title="One wallet. A world of possibilities."
      eyebrow="OK Trade WEB3"
      description="Your gateway to a multichain world. Discover tokens, digital collectibles and decentralized finance — all in one place."
      hero={
        <div className="flex flex-wrap gap-3">
          <button className={primary} onClick={() => setOpen(true)}>
            <Wallet className="mr-2 size-4" />
            {wallet ? "Manage connection" : "Connect wallet"}
          </button>
          <Link to="/web3/dex" className={secondary}>
            Explore DEX →
          </Link>
        </div>
      }
    >
      {wallet && (
        <section className={`${card} space-y-6`}>
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Connected wallet · {wallet}</p>
              <h2 className="mt-2 break-all font-mono">
                0x71C7656EC7ab88b098defB751B7401B5f6d8976F
              </h2>
            </div>
            <button className={secondary} onClick={() => setWallet("")}>
              Disconnect
            </button>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <Metric label="Illustrative portfolio" value="$12,480.00" />
            <Metric label="ETH · 2.4" value="$8,400.00" />
            <Metric label="USDC · 4,080" value="$4,080.00" />
          </div>
          <p className="text-xs text-muted-foreground">
            No real wallet is connected. This address and portfolio are preview data; never send assets
            here.
          </p>
        </section>
      )}
      <section>
        <Heading>Built for every chain you explore</Heading>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {networks.map((n, i) => (
            <div key={n} className={`${card} flex flex-col items-center gap-4 text-center`}>
              <span className="grid size-12 place-items-center rounded-full border border-border text-lg font-bold">
                {n.slice(0, 2).toUpperCase()}
              </span>
              <span className="text-sm font-medium">{n}</span>
            </div>
          ))}
        </div>
      </section>
      <section>
        <Heading>Everything Web3, connected</Heading>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            [ArrowLeftRight, "DEX aggregator", "Find a path across decentralized liquidity."],
            [Image, "NFT marketplace", "Explore digital art and collectibles across networks."],
            [Layers, "DeFi discovery", "Learn about lending, staking and liquidity protocols."],
            [Globe, "Cross-chain bridge", "Explore moving assets between supported networks."],
            [ScanLine, "Inscriptions & Ordinals", "Discover Bitcoin-native digital collectibles."],
            [
              Wallet,
              "Self-custody by design",
              "Stay in control of your keys with a compatible wallet.",
            ],
          ].map(([Icon, title, desc]) => {
            const I = Icon as typeof Wallet;
            return (
              <div key={String(title)} className={card}>
                <I className="mb-6 size-7" />
                <h3 className="text-lg font-semibold">{String(title)}</h3>
                <p className="mb-5 mt-3 text-sm text-muted-foreground">{String(desc)}</p>
                {title === "DEX aggregator" || title === "Cross-chain bridge" ? (
                  <Link className={secondary} to="/web3/dex">
                    Explore swaps
                  </Link>
                ) : (
                  <Link className={secondary} to="/learn">
                    Explore guides
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <Modal
        title="Connect a wallet"
        description="Explore the connection flow. We never request a seed phrase or private key."
        open={open}
        onClose={() => setOpen(false)}
      >
        {["OK Trade Wallet extension", "MetaMask", "WalletConnect", "Phantom"].map((w) => (
          <button
            key={w}
            className={`${secondary} justify-between py-4`}
            onClick={() => {
              setWallet(w);
              setOpen(false);
              toast.success(`${w} connected`);
            }}
          >
            {w}
            <span>→</span>
          </button>
        ))}
      </Modal>
    </Page>
  );
}
