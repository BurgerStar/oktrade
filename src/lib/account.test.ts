import { describe, expect, it } from "vitest";
import {
  cancelOrder,
  checkLiquidations,
  closePosition,
  convert,
  createAccount,
  getBalance,
  liquidationPrice,
  matchOrders,
  openPosition,
  placeSpotOrder,
  positionPnl,
  redeemEarn,
  subscribeEarn,
  withdraw,
  type AccountState,
} from "./account";

const fresh = () => createAccount("demo@onyx.test", "hash");
const funded = () => {
  const s = fresh();
  return {
    ...s,
    balances: {
      ...s.balances,
      USDT: { available: 10_000, frozen: 0 },
    },
  };
};
function ok(r: ReturnType<typeof placeSpotOrder>): AccountState {
  if (!r.ok) throw new Error(r.error);
  return r.state;
}

describe("account", () => {
  it("starts with zero USDT balance", () => {
    const account = fresh();
    expect(getBalance(account, "USDT")).toEqual({ available: 0, frozen: 0 });
    expect(account.activity).toEqual([]);
  });

  it("market buy charges 0.10% taker fee in the received coin", () => {
    const s = ok(
      placeSpotOrder(
        funded(),
        { instId: "BTC-USDT", side: "buy", type: "market", size: 0.1 },
        50_000,
      ),
    );
    expect(getBalance(s, "USDT").available).toBeCloseTo(5_000);
    expect(getBalance(s, "BTC").available).toBeCloseTo(0.0999);
  });

  it("rejects a buy larger than the USDT balance", () => {
    const r = placeSpotOrder(
      funded(),
      { instId: "BTC-USDT", side: "buy", type: "market", size: 1 },
      50_000,
    );
    expect(r.ok).toBe(false);
  });

  it("resting limit buy freezes funds and cancel releases them", () => {
    const s = ok(
      placeSpotOrder(
        funded(),
        { instId: "BTC-USDT", side: "buy", type: "limit", price: 40_000, size: 0.1 },
        50_000,
      ),
    );
    expect(getBalance(s, "USDT")).toEqual({ available: 6_000, frozen: 4_000 });
    const c = cancelOrder(s, s.orders[0]!.id);
    expect(c.ok && getBalance(c.state, "USDT")).toEqual({ available: 10_000, frozen: 0 });
  });

  it("limit buy fills as maker (0.08%) when price drops to it", () => {
    const s = ok(
      placeSpotOrder(
        funded(),
        { instId: "BTC-USDT", side: "buy", type: "limit", price: 40_000, size: 0.1 },
        50_000,
      ),
    );
    const m = matchOrders(s, "BTC-USDT", 39_900);
    expect(m.orders[0]!.status).toBe("filled");
    expect(getBalance(m, "USDT").frozen).toBeCloseTo(0);
    expect(getBalance(m, "BTC").available).toBeCloseTo(0.09992);
  });

  it("10x long liquidation price sits ~9.6% below entry", () => {
    expect(liquidationPrice({ side: "long", entryPx: 100, leverage: 10 })).toBeCloseTo(90.4);
    expect(liquidationPrice({ side: "short", entryPx: 100, leverage: 10 })).toBeCloseTo(109.6);
  });

  it("opening a 10x long locks margin + 0.05% fee and pays PnL on close", () => {
    const r = openPosition(
      funded(),
      { instId: "BTC-USDT-SWAP", side: "long", leverage: 10, margin: 1_000 },
      50_000,
    );
    if (!r.ok) throw new Error(r.error);
    expect(getBalance(r.state, "USDT").available).toBeCloseTo(10_000 - 1_000 - 5);
    const p = r.state.positions[0]!;
    expect(positionPnl(p, 55_000)).toBeCloseTo(1_000);
    const c = closePosition(r.state, p.id, 55_000);
    // payout = margin 1000 + pnl 1000 - close fee (0.2 BTC * 55k * 0.05% = 5.5)
    expect(c.ok && getBalance(c.state, "USDT").available).toBeCloseTo(8_995 + 1_994.5);
  });

  it("liquidates a position when mark crosses liquidation price", () => {
    const r = openPosition(
      funded(),
      { instId: "BTC-USDT-SWAP", side: "long", leverage: 10, margin: 1_000 },
      50_000,
    );
    if (!r.ok) throw new Error(r.error);
    const s = checkLiquidations(r.state, "BTC-USDT-SWAP", 45_000);
    expect(s.positions).toHaveLength(0);
    expect(s.closedPositions[0]!.reason).toBe("liquidated");
  });

  it("convert moves funds at the quoted rate", () => {
    const r = convert(funded(), "USDT", "ETH", 3_000, 1 / 3_000);
    expect(r.ok && getBalance(r.state, "ETH").available).toBeCloseTo(1);
  });

  it("withdraw requires amount above the network fee", () => {
    expect(withdraw(funded(), "USDT", 1, 1, "TXYZabcdef1234567").ok).toBe(false);
  });

  it("fixed-term earn cannot be redeemed before the term ends", () => {
    const r = subscribeEarn(funded(), {
      product: "USDT 30D",
      ccy: "USDT",
      amount: 1_000,
      apr: 0.1,
      termDays: 30,
    });
    if (!r.ok) throw new Error(r.error);
    expect(redeemEarn(r.state, r.state.earn[0]!.id).ok).toBe(false);
    const later = redeemEarn(
      r.state,
      r.state.earn[0]!.id,
      r.state.earn[0]!.startedAt + 365 * 86_400_000,
    );
    expect(later.ok && getBalance(later.state, "USDT").available).toBeCloseTo(9_000 + 1_100);
  });
});
