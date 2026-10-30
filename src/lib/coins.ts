/** Static coin metadata (names, rough fallback prices, short descriptions). */

export interface CoinMeta {
  symbol: string;
  name: string;
  /** Used only when live market data is unreachable. */
  fallbackPrice: number;
  category: (
    "layer1" | "layer2" | "defi" | "meme" | "ai" | "gaming" | "stable" | "exchange" | "infra"
  )[];
  description?: string;
}

export const COINS: CoinMeta[] = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    fallbackPrice: 80500,
    category: ["layer1"],
    description:
      "Bitcoin is the first decentralized digital currency, a peer-to-peer electronic cash system secured by proof-of-work mining and capped at 21 million coins.",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    fallbackPrice: 3100,
    category: ["layer1", "defi"],
    description:
      "Ethereum is a programmable blockchain that runs smart contracts and powers most of decentralized finance, NFTs and layer-2 networks.",
  },
  {
    symbol: "SOL",
    name: "Solana",
    fallbackPrice: 180,
    category: ["layer1"],
    description:
      "Solana is a high-throughput layer-1 blockchain known for fast confirmation times and low fees.",
  },
  {
    symbol: "XRP",
    name: "XRP",
    fallbackPrice: 2.4,
    category: ["layer1"],
    description:
      "XRP is the native asset of the XRP Ledger, designed for fast, low-cost cross-border payments.",
  },
  { symbol: "BNB", name: "BNB", fallbackPrice: 620, category: ["layer1", "exchange"] },
  { symbol: "OKB", name: "OKB", fallbackPrice: 52, category: ["exchange"] },
  {
    symbol: "DOGE",
    name: "Dogecoin",
    fallbackPrice: 0.18,
    category: ["meme"],
    description:
      "Dogecoin started as a meme in 2013 and became one of the most widely held proof-of-work cryptocurrencies.",
  },
  { symbol: "TON", name: "Toncoin", fallbackPrice: 5.2, category: ["layer1"] },
  { symbol: "ADA", name: "Cardano", fallbackPrice: 0.72, category: ["layer1"] },
  { symbol: "TRX", name: "TRON", fallbackPrice: 0.24, category: ["layer1"] },
  { symbol: "AVAX", name: "Avalanche", fallbackPrice: 36, category: ["layer1"] },
  { symbol: "SHIB", name: "Shiba Inu", fallbackPrice: 0.000022, category: ["meme"] },
  { symbol: "LINK", name: "Chainlink", fallbackPrice: 18, category: ["infra", "defi"] },
  { symbol: "DOT", name: "Polkadot", fallbackPrice: 6.8, category: ["layer1"] },
  { symbol: "BCH", name: "Bitcoin Cash", fallbackPrice: 420, category: ["layer1"] },
  { symbol: "LTC", name: "Litecoin", fallbackPrice: 95, category: ["layer1"] },
  { symbol: "NEAR", name: "NEAR Protocol", fallbackPrice: 5.4, category: ["layer1", "ai"] },
  { symbol: "UNI", name: "Uniswap", fallbackPrice: 11, category: ["defi"] },
  { symbol: "PEPE", name: "Pepe", fallbackPrice: 0.000012, category: ["meme"] },
  { symbol: "APT", name: "Aptos", fallbackPrice: 9.5, category: ["layer1"] },
  { symbol: "SUI", name: "Sui", fallbackPrice: 3.6, category: ["layer1"] },
  { symbol: "ICP", name: "Internet Computer", fallbackPrice: 10, category: ["layer1", "ai"] },
  { symbol: "ETC", name: "Ethereum Classic", fallbackPrice: 26, category: ["layer1"] },
  { symbol: "FIL", name: "Filecoin", fallbackPrice: 5.1, category: ["infra"] },
  { symbol: "ARB", name: "Arbitrum", fallbackPrice: 0.8, category: ["layer2"] },
  { symbol: "OP", name: "Optimism", fallbackPrice: 1.9, category: ["layer2"] },
  { symbol: "POL", name: "Polygon", fallbackPrice: 0.45, category: ["layer2"] },
  { symbol: "ATOM", name: "Cosmos", fallbackPrice: 6.5, category: ["layer1"] },
  { symbol: "AAVE", name: "Aave", fallbackPrice: 280, category: ["defi"] },
  { symbol: "INJ", name: "Injective", fallbackPrice: 24, category: ["defi"] },
  { symbol: "RENDER", name: "Render", fallbackPrice: 7.2, category: ["ai"] },
  {
    symbol: "FET",
    name: "Artificial Superintelligence Alliance",
    fallbackPrice: 1.3,
    category: ["ai"],
  },
  { symbol: "WLD", name: "Worldcoin", fallbackPrice: 2.2, category: ["ai"] },
  { symbol: "STX", name: "Stacks", fallbackPrice: 1.8, category: ["layer2"] },
  { symbol: "IMX", name: "Immutable", fallbackPrice: 1.5, category: ["gaming", "layer2"] },
  { symbol: "SAND", name: "The Sandbox", fallbackPrice: 0.45, category: ["gaming"] },
  { symbol: "MANA", name: "Decentraland", fallbackPrice: 0.42, category: ["gaming"] },
  { symbol: "AXS", name: "Axie Infinity", fallbackPrice: 6, category: ["gaming"] },
  { symbol: "GALA", name: "Gala", fallbackPrice: 0.03, category: ["gaming"] },
  { symbol: "CRV", name: "Curve DAO", fallbackPrice: 0.7, category: ["defi"] },
  { symbol: "LDO", name: "Lido DAO", fallbackPrice: 1.6, category: ["defi"] },
  { symbol: "MKR", name: "Maker", fallbackPrice: 1700, category: ["defi"] },
  { symbol: "WIF", name: "dogwifhat", fallbackPrice: 2.1, category: ["meme"] },
  { symbol: "BONK", name: "Bonk", fallbackPrice: 0.00003, category: ["meme"] },
  { symbol: "FLOKI", name: "FLOKI", fallbackPrice: 0.00015, category: ["meme"] },
  { symbol: "TRUMP", name: "Official Trump", fallbackPrice: 12, category: ["meme"] },
  { symbol: "HBAR", name: "Hedera", fallbackPrice: 0.2, category: ["layer1"] },
  { symbol: "ALGO", name: "Algorand", fallbackPrice: 0.3, category: ["layer1"] },
  { symbol: "XLM", name: "Stellar", fallbackPrice: 0.3, category: ["layer1"] },
  { symbol: "ENA", name: "Ethena", fallbackPrice: 0.6, category: ["defi"] },
  { symbol: "TIA", name: "Celestia", fallbackPrice: 4.2, category: ["infra"] },
  { symbol: "JUP", name: "Jupiter", fallbackPrice: 0.8, category: ["defi"] },
  { symbol: "PYTH", name: "Pyth Network", fallbackPrice: 0.3, category: ["infra"] },
  { symbol: "ORDI", name: "ORDI", fallbackPrice: 22, category: ["meme"] },
  { symbol: "USDC", name: "USD Coin", fallbackPrice: 1, category: ["stable"] },
  { symbol: "USDT", name: "Tether", fallbackPrice: 1, category: ["stable"] },
];

const BY_SYMBOL = new Map(COINS.map((c) => [c.symbol, c]));

export function coinName(symbol: string): string {
  return BY_SYMBOL.get(symbol)?.name ?? symbol;
}

export function coinMeta(symbol: string): CoinMeta | undefined {
  return BY_SYMBOL.get(symbol);
}

export function coinIconUrl(symbol: string): string {
  return `https://static.okx.com/cdn/oksupport/asset/currency/icon/${symbol.toLowerCase()}.png`;
}

/** Slug used by /price/$coin pages, e.g. "bitcoin-btc". */
export function coinSlug(symbol: string): string {
  const name = coinName(symbol)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return name === symbol.toLowerCase() ? name : `${name}-${symbol.toLowerCase()}`;
}

export function symbolFromSlug(slug: string): string {
  const last = slug.split("-").pop() ?? slug;
  return last.toUpperCase();
}

export const FIAT = [
  { code: "USD", symbol: "$", name: "US Dollar", rate: 1 },
  { code: "EUR", symbol: "€", name: "Euro", rate: 0.92 },
  { code: "GBP", symbol: "£", name: "British Pound", rate: 0.79 },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira", rate: 1550 },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham", rate: 3.67 },
  { code: "TRY", symbol: "₺", name: "Turkish Lira", rate: 34.2 },
  { code: "BRL", symbol: "R$", name: "Brazilian Real", rate: 5.6 },
  { code: "INR", symbol: "₹", name: "Indian Rupee", rate: 84 },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", rate: 152 },
] as const;
