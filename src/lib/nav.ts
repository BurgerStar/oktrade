import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Banknote,
  BarChart3,
  Bot,
  BookOpen,
  Building2,
  CandlestickChart,
  Code2,
  Coins,
  Copy,
  CreditCard,
  Gift,
  HandCoins,
  LineChart,
  Megaphone,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  Percent,
  LifeBuoy,
  Download,
  Info,
  Briefcase,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  description?: string;
  icon?: LucideIcon;
  badge?: string;
}
export interface NavGroup {
  label: string;
  sections: { title?: string; items: NavItem[] }[];
}

export const MAIN_NAV: NavGroup[] = [
  {
    label: "Buy crypto",
    sections: [
      {
        items: [
          {
            label: "Express buy",
            to: "/buy-crypto",
            icon: CreditCard,
            description: "Buy crypto with card, Apple Pay or bank transfer",
          },
          {
            label: "Convert",
            to: "/convert",
            icon: ArrowLeftRight,
            description: "Swap between 300+ assets instantly at zero fees",
          },
        ],
      },
    ],
  },
  {
    label: "Discover",
    sections: [
      {
        items: [
          {
            label: "Markets",
            to: "/markets",
            icon: BarChart3,
            description: "Live prices, gainers, losers and new listings",
          },
          {
            label: "Crypto prices",
            to: "/price/bitcoin-btc",
            icon: LineChart,
            description: "Charts, stats and news for every coin",
          },
          {
            label: "Announcements",
            to: "/announcements",
            icon: Megaphone,
            description: "New listings, promotions and product updates",
          },
        ],
      },
    ],
  },
  {
    label: "Trade",
    sections: [
      {
        title: "Basic",
        items: [
          {
            label: "Spot",
            to: "/trade/BTC-USDT",
            icon: CandlestickChart,
            description: "Buy and sell crypto with advanced tools",
          },
          {
            label: "Convert",
            to: "/convert",
            icon: ArrowLeftRight,
            description: "Quick conversion, zero fees",
          },
        ],
      },
      {
        title: "Advanced",
        items: [
          {
            label: "Futures",
            to: "/futures/BTC-USDT-SWAP",
            icon: LineChart,
            description: "Perpetual swaps with up to 125x leverage",
          },
          {
            label: "Trading bots",
            to: "/trading-bots",
            icon: Bot,
            description: "Grid, DCA and arbitrage bots, 24/7",
          },
          {
            label: "Copy trading",
            to: "/copy-trading",
            icon: Copy,
            description: "Follow top traders automatically",
            badge: "Hot",
          },
        ],
      },
    ],
  },
  {
    label: "Grow",
    sections: [
      {
        items: [
          {
            label: "Simple Earn",
            to: "/earn",
            icon: Percent,
            description: "Earn yield on idle assets, flexible or fixed",
          },
          {
            label: "Loan",
            to: "/loan",
            icon: HandCoins,
            description: "Borrow crypto against your holdings",
          },
          {
            label: "Jumpstart",
            to: "/jumpstart",
            icon: Rocket,
            description: "Get early access to new token launches",
            badge: "New",
          },
        ],
      },
    ],
  },
  {
    label: "Web3",
    sections: [
      {
        items: [
          {
            label: "Web3 wallet",
            to: "/web3",
            icon: Wallet,
            description: "Self-custody wallet for 100+ networks",
          },
          {
            label: "DEX swap",
            to: "/web3/dex",
            icon: Sparkles,
            description: "Best rates across 400+ DEXs",
          },
        ],
      },
    ],
  },
  {
    label: "Institutional",
    sections: [
      {
        items: [
          {
            label: "Institutional services",
            to: "/institutional",
            icon: Building2,
            description: "Liquidity, custody and prime services",
          },
          {
            label: "API",
            to: "/api-docs",
            icon: Code2,
            description: "REST & WebSocket APIs for algorithmic trading",
          },
        ],
      },
    ],
  },
  {
    label: "Learn",
    sections: [
      {
        items: [
          {
            label: "Learn",
            to: "/learn",
            icon: BookOpen,
            description: "Guides and courses from beginner to pro",
          },
          {
            label: "Support center",
            to: "/help",
            icon: LifeBuoy,
            description: "FAQs, guides and 24/7 support",
          },
        ],
      },
    ],
  },
  {
    label: "More",
    sections: [
      {
        items: [
          {
            label: "Rewards hub",
            to: "/rewards",
            icon: Gift,
            description: "Complete tasks and claim rewards",
          },
          {
            label: "Referral",
            to: "/rewards/referral",
            icon: Users,
            description: "Invite friends, earn commission",
          },
          {
            label: "Proof of reserves",
            to: "/proof-of-reserves",
            icon: ShieldCheck,
            description: "1:1 backed, verified monthly",
          },
          {
            label: "Fees",
            to: "/fees",
            icon: Coins,
            description: "Trading and withdrawal fee schedule",
          },
          { label: "About us", to: "/about", icon: Info, description: "Our mission and story" },
          { label: "Careers", to: "/careers", icon: Briefcase, description: "Join the team" },
          { label: "Learn", to: "/learn", icon: BookOpen, description: "Guides from beginner to pro" },
          { label: "Institutional", to: "/institutional", icon: Building2, description: "Liquidity, custody, prime" },
          {
            label: "Deposit & withdraw",
            to: "/assets",
            icon: Banknote,
            description: "Manage your funds",
          },
        ],
      },
    ],
  },
];

export const FOOTER_NAV: { title: string; items: { label: string; to: string }[] }[] = [
  {
    title: "More about OK Trade",
    items: [
      { label: "About us", to: "/about" },
      { label: "Careers", to: "/careers" },
      { label: "Announcements", to: "/announcements" },
      { label: "Proof of reserves", to: "/proof-of-reserves" },
      { label: "Terms of service", to: "/legal/terms" },
      { label: "Privacy policy", to: "/legal/privacy" },
      { label: "Risk disclosure", to: "/legal/risk" },
      { label: "Cookie policy", to: "/legal/cookies" },
    ],
  },
  {
    title: "Products",
    items: [
      { label: "Buy crypto", to: "/buy-crypto" },
      { label: "Convert", to: "/convert" },
      { label: "Spot trading", to: "/trade/BTC-USDT" },
      { label: "Futures", to: "/futures/BTC-USDT-SWAP" },
      { label: "Trading bots", to: "/trading-bots" },
      { label: "Copy trading", to: "/copy-trading" },
      { label: "Earn", to: "/earn" },
      { label: "Loan", to: "/loan" },
      { label: "Jumpstart", to: "/jumpstart" },
      { label: "Web3 wallet", to: "/web3" },
    ],
  },
  {
    title: "Services",
    items: [
      { label: "Rewards hub", to: "/rewards" },
      { label: "Referral", to: "/rewards/referral" },
      { label: "Fees", to: "/fees" },
      { label: "API", to: "/api-docs" },
      { label: "Institutional", to: "/institutional" },
    ],
  },
  {
    title: "Support",
    items: [
      { label: "Support center", to: "/help" },
      { label: "Learn", to: "/learn" },
      { label: "Markets", to: "/markets" },
      { label: "Bitcoin price", to: "/price/bitcoin-btc" },
      { label: "Ethereum price", to: "/price/ethereum-eth" },
      { label: "Solana price", to: "/price/solana-sol" },
    ],
  },
];
