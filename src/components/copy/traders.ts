export interface Trader {
  id: string;
  name: string;
  initials: string;
  followers: number;
  max: number;
  roi7: number;
  roi30: number;
  roi90: number;
  pnl: number;
  winRate: number;
  aum: number;
  drawdown: number;
  sharpe: number;
  days: number;
  tags: string[];
  market: string;
  series: { day: number; value: number }[];
}
const names = [
  "Atlas Capital",
  "Quiet Alpha",
  "Satoshi North",
  "Delta Neutral",
  "Luna Quant",
  "Stonebridge",
  "Wave Rider",
  "Momentum Lab",
  "The Patient Bull",
  "Nova Strategies",
  "Apex Signals",
  "Orbit Capital",
  "Silk Road Quant",
  "Zenith Trading",
  "Cedar Macro",
  "Vector Edge",
];
export const traders: Trader[] = names.map((name, i) => {
  const roi30 = 18.4 + i * 3.73;
  return {
    id: name.toLowerCase().replaceAll(" ", "-"),
    name,
    initials: name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join(""),
    followers: 987 - i * 43,
    max: 1200,
    roi7: roi30 * 0.23,
    roi30,
    roi90: roi30 * 2.14,
    pnl: 78000 + i * 16243,
    winRate: 67 + (i % 7) * 3.1,
    aum: 410000 + i * 97843,
    drawdown: 4.2 + (i % 6) * 1.7,
    sharpe: 1.4 + (i % 8) * 0.19,
    days: 240 + i * 27,
    tags: [
      ["Trend following", "BTC specialist", "Low frequency", "Quantitative"][i % 4]!,
      i % 3 === 0 ? "Conservative" : "Balanced",
    ],
    market: i % 4 === 0 ? "Spot" : "Futures",
    series: Array.from({ length: 30 }, (_, j) => ({
      day: j + 1,
      value: (roi30 * j) / 29 + Math.sin(j * 1.7 + i) * roi30 * 0.065,
    })),
  };
});
export function copyPnl(amount: number, startedAt: number, roi: number, now: number) {
  return amount * (roi / 100) * Math.min(1, Math.max(0, now - startedAt) / (30 * 86400000));
}
