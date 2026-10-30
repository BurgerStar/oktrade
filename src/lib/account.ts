/**
 * Trading account state — pure, framework-free state transitions.
 * Every function returns a NEW state (never mutates) so it is trivially testable.
 */

export const SPOT_MAKER_FEE = 0.0008; // 0.08%
export const SPOT_TAKER_FEE = 0.001; // 0.10%
export const FUTURES_MAKER_FEE = 0.0002; // 0.02%
export const FUTURES_TAKER_FEE = 0.0005; // 0.05%
export const MAINTENANCE_MARGIN_RATE = 0.004; // 0.4%
export const MAX_LEVERAGE = 125;

export interface Balance {
  available: number;
  frozen: number;
}

export type Side = "buy" | "sell";
export type OrderType = "limit" | "market";
export type OrderStatus = "open" | "filled" | "canceled";

export interface SpotOrder {
  id: string;
  instId: string;
  side: Side;
  type: OrderType;
  price: number; // limit price (or fill price for market)
  size: number; // base amount
  avgPx: number;
  fee: number;
  feeCcy: string;
  status: OrderStatus;
  role?: "maker" | "taker";
  createdAt: number;
  updatedAt: number;
}

export interface Position {
  id: string;
  instId: string; // e.g. BTC-USDT-SWAP
  side: "long" | "short";
  leverage: number;
  marginMode: "cross" | "isolated";
  size: number; // base qty
  entryPx: number;
  margin: number; // USDT
  createdAt: number;
}

export interface ClosedPosition extends Position {
  closePx: number;
  realizedPnl: number;
  closedAt: number;
  reason: "closed" | "liquidated";
}

export type ActivityType =
  | "deposit"
  | "withdraw"
  | "convert"
  | "buy"
  | "sell"
  | "earn-subscribe"
  | "earn-redeem"
  | "copy"
  | "bot"
  | "reward"
  | "p2p"
  | "loan";

export interface Activity {
  id: string;
  type: ActivityType;
  ccy: string;
  amount: number;
  detail: string;
  status: "completed" | "pending" | "failed";
  ts: number;
}

export interface EarnSub {
  id: string;
  product: string;
  ccy: string;
  amount: number;
  apr: number; // e.g. 0.05 = 5%
  termDays: number; // 0 = flexible
  startedAt: number;
}

export interface CopyFollow {
  id: string;
  traderId: string;
  traderName: string;
  amount: number;
  startedAt: number;
}

export interface Bot {
  id: string;
  kind: "spot-grid" | "futures-grid" | "dca" | "recurring" | "arbitrage";
  instId: string;
  investment: number;
  params: Record<string, number | string>;
  startedAt: number;
}

export interface Loan {
  id: string;
  borrowCcy: string;
  borrowAmount: number;
  collateralCcy: string;
  collateralAmount: number;
  apr: number;
  startedAt: number;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  ts: number;
  read: boolean;
}

export interface User {
  uid: string;
  email: string;
  nickname: string;
  createdAt: number;
  verified: boolean; // identity verification (demo)
  twoFA: boolean;
  antiPhishing: string;
  passwordHash: string;
}

export interface AccountState {
  user: User;
  balances: Record<string, Balance>;
  orders: SpotOrder[];
  positions: Position[];
  closedPositions: ClosedPosition[];
  activity: Activity[];
  earn: EarnSub[];
  copy: CopyFollow[];
  bots: Bot[];
  loans: Loan[];
  favorites: string[];
  notifications: Notification[];
  claimedRewards: string[];
}

export type Result =
  { ok: true; state: AccountState; message?: string } | { ok: false; error: string };

let idCounter = 0;
export function newId(prefix = ""): string {
  idCounter = (idCounter + 1) % 1000;
  return `${prefix}${Date.now().toString(36)}${idCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
}

/** Split "BTC-USDT" / "BTC-USDT-SWAP" into [base, quote]. */
export function pair(instId: string): [string, string] {
  const [b = "", q = "USDT"] = instId.split("-");
  return [b, q];
}

const round = (n: number) => Math.round(n * 1e10) / 1e10;

export function getBalance(state: AccountState, ccy: string): Balance {
  return state.balances[ccy] ?? { available: 0, frozen: 0 };
}

function withBalance(state: AccountState, ccy: string, dAvail: number, dFrozen = 0): AccountState {
  const b = getBalance(state, ccy);
  return {
    ...state,
    balances: {
      ...state.balances,
      [ccy]: { available: round(b.available + dAvail), frozen: round(b.frozen + dFrozen) },
    },
  };
}

function log(
  state: AccountState,
  a: Omit<Activity, "id" | "ts" | "status"> & { status?: Activity["status"] },
): AccountState {
  return {
    ...state,
    activity: [
      { id: newId("A"), ts: Date.now(), ...a, status: a.status ?? "completed" } as Activity,
      ...state.activity,
    ].slice(0, 300),
  };
}

export function notify(state: AccountState, title: string, body: string): AccountState {
  return {
    ...state,
    notifications: [
      { id: newId("N"), title, body, ts: Date.now(), read: false },
      ...state.notifications,
    ].slice(0, 50),
  };
}

export function createAccount(
  email: string,
  passwordHash: string,
  nickname?: string,
): AccountState {
  const now = Date.now();
  const base: AccountState = {
    user: {
      uid: String(Math.floor(100000000 + Math.random() * 899999999)),
      email: email.trim().toLowerCase(),
      nickname: nickname?.trim() || email.split("@")[0] || "trader",
      createdAt: now,
      verified: false,
      twoFA: false,
      antiPhishing: "",
      passwordHash,
    },
    balances: { USDT: { available: 0, frozen: 0 } },
    orders: [],
    positions: [],
    closedPositions: [],
    activity: [],
    earn: [],
    copy: [],
    bots: [],
    loans: [],
    favorites: ["BTC-USDT", "ETH-USDT", "SOL-USDT"],
    notifications: [],
    claimedRewards: [],
  };
  return notify(base, "Welcome to OK Trade", "Your account is ready for trading.");
}

/* -------------------------------- Spot --------------------------------- */

export interface SpotOrderInput {
  instId: string;
  side: Side;
  type: OrderType;
  price?: number;
  size: number;
}

export function placeSpotOrder(
  state: AccountState,
  input: SpotOrderInput,
  marketPx: number,
): Result {
  const [base, quote] = pair(input.instId);
  const size = input.size;
  if (!(size > 0)) return { ok: false, error: "Enter an amount greater than 0" };
  if (!(marketPx > 0)) return { ok: false, error: "Market price unavailable, try again" };
  if (input.type === "limit" && !((input.price ?? 0) > 0))
    return { ok: false, error: "Enter a valid price" };

  const limitPx = input.price ?? marketPx;
  const marketable =
    input.type === "market" || (input.side === "buy" ? limitPx >= marketPx : limitPx <= marketPx);
  const now = Date.now();

  if (input.side === "buy") {
    const reservePx = input.type === "market" ? marketPx : limitPx;
    const cost = reservePx * size;
    if (getBalance(state, quote).available + 1e-9 < cost)
      return { ok: false, error: `Insufficient ${quote} balance` };
  } else if (getBalance(state, base).available + 1e-9 < size) {
    return { ok: false, error: `Insufficient ${base} balance` };
  }

  const order: SpotOrder = {
    id: newId("O"),
    instId: input.instId,
    side: input.side,
    type: input.type,
    price: input.type === "market" ? marketPx : limitPx,
    size,
    avgPx: 0,
    fee: 0,
    feeCcy: input.side === "buy" ? base : quote,
    status: "open",
    createdAt: now,
    updatedAt: now,
  };

  if (marketable) {
    const fillPx = marketPx;
    let s = state;
    let fee: number;
    if (input.side === "buy") {
      fee = size * SPOT_TAKER_FEE;
      s = withBalance(s, quote, -fillPx * size);
      s = withBalance(s, base, size - fee);
    } else {
      fee = fillPx * size * SPOT_TAKER_FEE;
      s = withBalance(s, base, -size);
      s = withBalance(s, quote, fillPx * size - fee);
    }
    const filled: SpotOrder = {
      ...order,
      avgPx: fillPx,
      fee: round(fee),
      status: "filled",
      role: "taker",
    };
    s = { ...s, orders: [filled, ...s.orders] };
    s = log(s, {
      type: input.side,
      ccy: base,
      amount: size,
      detail: `${input.side === "buy" ? "Bought" : "Sold"} ${size} ${base} @ ${fillPx}`,
    });
    return { ok: true, state: s, message: "Order filled" };
  }

  // Resting limit order: freeze funds.
  let s = state;
  if (input.side === "buy") s = withBalance(s, quote, -limitPx * size, limitPx * size);
  else s = withBalance(s, base, -size, size);
  s = { ...s, orders: [order, ...s.orders] };
  return { ok: true, state: s, message: "Order placed" };
}

export function cancelOrder(state: AccountState, id: string): Result {
  const o = state.orders.find((x) => x.id === id);
  if (!o || o.status !== "open") return { ok: false, error: "Order is no longer open" };
  const [base, quote] = pair(o.instId);
  let s = state;
  if (o.side === "buy") s = withBalance(s, quote, o.price * o.size, -o.price * o.size);
  else s = withBalance(s, base, o.size, -o.size);
  s = {
    ...s,
    orders: s.orders.map((x) =>
      x.id === id ? { ...x, status: "canceled", updatedAt: Date.now() } : x,
    ),
  };
  return { ok: true, state: s, message: "Order canceled" };
}

/** Fill resting limit orders that the latest price crossed (maker fills at limit price). */
export function matchOrders(state: AccountState, instId: string, lastPx: number): AccountState {
  let s = state;
  let changed = false;
  for (const o of state.orders) {
    if (o.status !== "open" || o.instId !== instId) continue;
    const hit = o.side === "buy" ? lastPx <= o.price : lastPx >= o.price;
    if (!hit) continue;
    changed = true;
    const [base, quote] = pair(o.instId);
    let fee: number;
    if (o.side === "buy") {
      fee = o.size * SPOT_MAKER_FEE;
      s = withBalance(s, quote, 0, -o.price * o.size);
      s = withBalance(s, base, o.size - fee);
    } else {
      fee = o.price * o.size * SPOT_MAKER_FEE;
      s = withBalance(s, base, 0, -o.size);
      s = withBalance(s, quote, o.price * o.size - fee);
    }
    s = {
      ...s,
      orders: s.orders.map((x) =>
        x.id === o.id
          ? {
              ...x,
              status: "filled",
              avgPx: o.price,
              fee: round(fee),
              role: "maker",
              updatedAt: Date.now(),
            }
          : x,
      ),
    };
    s = notify(s, "Order filled", `Limit ${o.side} ${o.size} ${base} @ ${o.price} filled`);
  }
  return changed ? s : state;
}

/* ------------------------------ Futures -------------------------------- */

export interface OpenPositionInput {
  instId: string;
  side: "long" | "short";
  leverage: number;
  margin: number; // USDT
  marginMode?: "cross" | "isolated";
}

export function liquidationPrice(p: Pick<Position, "side" | "entryPx" | "leverage">): number {
  return p.side === "long"
    ? p.entryPx * (1 - 1 / p.leverage + MAINTENANCE_MARGIN_RATE)
    : p.entryPx * (1 + 1 / p.leverage - MAINTENANCE_MARGIN_RATE);
}

export function positionPnl(
  p: Pick<Position, "side" | "entryPx" | "size">,
  markPx: number,
): number {
  const dir = p.side === "long" ? 1 : -1;
  return (markPx - p.entryPx) * p.size * dir;
}

export function positionRoe(p: Position, markPx: number): number {
  return p.margin ? (positionPnl(p, markPx) / p.margin) * 100 : 0;
}

export function openPosition(
  state: AccountState,
  input: OpenPositionInput,
  markPx: number,
): Result {
  if (!(input.margin > 0)) return { ok: false, error: "Enter a margin amount greater than 0" };
  if (!(input.leverage >= 1 && input.leverage <= MAX_LEVERAGE))
    return { ok: false, error: `Leverage must be between 1x and ${MAX_LEVERAGE}x` };
  if (!(markPx > 0)) return { ok: false, error: "Mark price unavailable" };
  const notional = input.margin * input.leverage;
  const fee = notional * FUTURES_TAKER_FEE;
  if (getBalance(state, "USDT").available + 1e-9 < input.margin + fee)
    return { ok: false, error: "Insufficient USDT balance (margin + fee)" };
  const pos: Position = {
    id: newId("P"),
    instId: input.instId,
    side: input.side,
    leverage: input.leverage,
    marginMode: input.marginMode ?? "cross",
    size: notional / markPx,
    entryPx: markPx,
    margin: input.margin,
    createdAt: Date.now(),
  };
  let s = withBalance(state, "USDT", -(input.margin + fee));
  s = { ...s, positions: [pos, ...s.positions] };
  return { ok: true, state: s, message: `${input.side === "long" ? "Long" : "Short"} opened` };
}

export function closePosition(state: AccountState, id: string, markPx: number): Result {
  const p = state.positions.find((x) => x.id === id);
  if (!p) return { ok: false, error: "Position not found" };
  const pnl = positionPnl(p, markPx);
  const fee = p.size * markPx * FUTURES_TAKER_FEE;
  const payout = Math.max(0, p.margin + pnl - fee);
  let s = withBalance(state, "USDT", payout);
  const closed: ClosedPosition = {
    ...p,
    closePx: markPx,
    realizedPnl: round(pnl - fee),
    closedAt: Date.now(),
    reason: "closed",
  };
  s = {
    ...s,
    positions: s.positions.filter((x) => x.id !== id),
    closedPositions: [closed, ...s.closedPositions].slice(0, 100),
  };
  return { ok: true, state: s, message: "Position closed" };
}

export function checkLiquidations(
  state: AccountState,
  instId: string,
  markPx: number,
): AccountState {
  const hit = state.positions.filter((p) => {
    if (p.instId !== instId) return false;
    const liq = liquidationPrice(p);
    return p.side === "long" ? markPx <= liq : markPx >= liq;
  });
  if (!hit.length) return state;
  let s: AccountState = {
    ...state,
    positions: state.positions.filter((p) => !hit.includes(p)),
    closedPositions: [
      ...hit.map((p) => ({
        ...p,
        closePx: markPx,
        realizedPnl: -p.margin,
        closedAt: Date.now(),
        reason: "liquidated" as const,
      })),
      ...state.closedPositions,
    ].slice(0, 100),
  };
  for (const p of hit)
    s = notify(
      s,
      "Position liquidated",
      `${p.instId} ${p.side} ${p.leverage}x was liquidated at ${markPx}`,
    );
  return s;
}

/* ------------------------- Funds & products ---------------------------- */

export function deposit(
  state: AccountState,
  ccy: string,
  amount: number,
  detail = "On-chain deposit",
): Result {
  if (!(amount > 0)) return { ok: false, error: "Enter an amount greater than 0" };
  const s = log(withBalance(state, ccy, amount), { type: "deposit", ccy, amount, detail });
  return {
    ok: true,
    state: notify(s, "Deposit successful", `${amount} ${ccy} credited to your account`),
    message: "Deposit credited",
  };
}

export function withdraw(
  state: AccountState,
  ccy: string,
  amount: number,
  networkFee: number,
  address: string,
): Result {
  if (!(amount > 0)) return { ok: false, error: "Enter an amount greater than 0" };
  if (address.trim().length < 8) return { ok: false, error: "Enter a valid withdrawal address" };
  if (amount <= networkFee)
    return { ok: false, error: "Amount must be larger than the network fee" };
  if (getBalance(state, ccy).available + 1e-9 < amount)
    return { ok: false, error: `Insufficient ${ccy} balance` };
  const s = log(withBalance(state, ccy, -amount), {
    type: "withdraw",
    ccy,
    amount,
    detail: `To ${address.slice(0, 6)}…${address.slice(-4)} · fee ${networkFee} ${ccy}`,
  });
  return { ok: true, state: s, message: "Withdrawal submitted" };
}

export function convert(
  state: AccountState,
  from: string,
  to: string,
  amount: number,
  rate: number,
): Result {
  if (from === to) return { ok: false, error: "Choose two different currencies" };
  if (!(amount > 0)) return { ok: false, error: "Enter an amount greater than 0" };
  if (!(rate > 0)) return { ok: false, error: "Quote unavailable, try again" };
  if (getBalance(state, from).available + 1e-9 < amount)
    return { ok: false, error: `Insufficient ${from} balance` };
  const received = amount * rate;
  let s = withBalance(state, from, -amount);
  s = withBalance(s, to, received);
  s = log(s, {
    type: "convert",
    ccy: to,
    amount: received,
    detail: `${amount} ${from} → ${round(received)} ${to}`,
  });
  return { ok: true, state: s, message: `Converted to ${round(received)} ${to}` };
}

/** Express buy with fiat (demo card payment): credits crypto directly. */
export function buyWithFiat(
  state: AccountState,
  ccy: string,
  cryptoAmount: number,
  fiatAmount: number,
  fiat: string,
  method: string,
): Result {
  if (!(cryptoAmount > 0) || !(fiatAmount > 0))
    return { ok: false, error: "Enter an amount greater than 0" };
  let s = withBalance(state, ccy, cryptoAmount);
  s = log(s, {
    type: "buy",
    ccy,
    amount: cryptoAmount,
    detail: `Paid ${fiatAmount.toFixed(2)} ${fiat} via ${method}`,
  });
  return { ok: true, state: s, message: `Bought ${round(cryptoAmount)} ${ccy}` };
}

export function sellForFiat(
  state: AccountState,
  ccy: string,
  cryptoAmount: number,
  fiatAmount: number,
  fiat: string,
): Result {
  if (!(cryptoAmount > 0)) return { ok: false, error: "Enter an amount greater than 0" };
  if (getBalance(state, ccy).available + 1e-9 < cryptoAmount)
    return { ok: false, error: `Insufficient ${ccy} balance` };
  let s = withBalance(state, ccy, -cryptoAmount);
  s = log(s, {
    type: "sell",
    ccy,
    amount: cryptoAmount,
    detail: `Received ${fiatAmount.toFixed(2)} ${fiat}`,
  });
  return { ok: true, state: s, message: `Sold ${round(cryptoAmount)} ${ccy}` };
}

export function earnInterest(sub: EarnSub, now = Date.now()): number {
  const days = Math.max(0, (now - sub.startedAt) / 86_400_000);
  return sub.amount * sub.apr * (days / 365);
}

export function subscribeEarn(
  state: AccountState,
  input: Omit<EarnSub, "id" | "startedAt">,
): Result {
  if (!(input.amount > 0)) return { ok: false, error: "Enter an amount greater than 0" };
  if (getBalance(state, input.ccy).available + 1e-9 < input.amount)
    return { ok: false, error: `Insufficient ${input.ccy} balance` };
  const sub: EarnSub = { ...input, id: newId("E"), startedAt: Date.now() };
  let s = withBalance(state, input.ccy, -input.amount);
  s = { ...s, earn: [sub, ...s.earn] };
  s = log(s, {
    type: "earn-subscribe",
    ccy: input.ccy,
    amount: input.amount,
    detail: `${input.product} · ${(input.apr * 100).toFixed(2)}% APR`,
  });
  return { ok: true, state: s, message: "Subscribed" };
}

export function redeemEarn(state: AccountState, id: string, now = Date.now()): Result {
  const sub = state.earn.find((e) => e.id === id);
  if (!sub) return { ok: false, error: "Subscription not found" };
  if (sub.termDays > 0 && now < sub.startedAt + sub.termDays * 86_400_000)
    return { ok: false, error: "Fixed-term products can be redeemed after the term ends" };
  const total = sub.amount + earnInterest(sub, now);
  let s = withBalance(state, sub.ccy, total);
  s = { ...s, earn: s.earn.filter((e) => e.id !== id) };
  s = log(s, {
    type: "earn-redeem",
    ccy: sub.ccy,
    amount: total,
    detail: `${sub.product} redeemed`,
  });
  return { ok: true, state: s, message: "Redeemed" };
}

export function followTrader(
  state: AccountState,
  traderId: string,
  traderName: string,
  amount: number,
): Result {
  if (state.copy.some((c) => c.traderId === traderId))
    return { ok: false, error: `You're already copying ${traderName}` };
  if (!(amount >= 50)) return { ok: false, error: "Minimum copy amount is 50 USDT" };
  if (getBalance(state, "USDT").available + 1e-9 < amount)
    return { ok: false, error: "Insufficient USDT balance" };
  let s = withBalance(state, "USDT", -amount);
  s = {
    ...s,
    copy: [{ id: newId("C"), traderId, traderName, amount, startedAt: Date.now() }, ...s.copy],
  };
  s = log(s, { type: "copy", ccy: "USDT", amount, detail: `Copying ${traderName}` });
  return { ok: true, state: s, message: `Now copying ${traderName}` };
}

export function stopCopy(state: AccountState, id: string, pnl = 0): Result {
  const c = state.copy.find((x) => x.id === id);
  if (!c) return { ok: false, error: "Copy not found" };
  let s = withBalance(state, "USDT", Math.max(0, c.amount + pnl));
  s = { ...s, copy: s.copy.filter((x) => x.id !== id) };
  return { ok: true, state: s, message: `Stopped copying ${c.traderName}` };
}

export function createBot(state: AccountState, input: Omit<Bot, "id" | "startedAt">): Result {
  if (!(input.investment >= 10)) return { ok: false, error: "Minimum investment is 10 USDT" };
  if (getBalance(state, "USDT").available + 1e-9 < input.investment)
    return { ok: false, error: "Insufficient USDT balance" };
  let s = withBalance(state, "USDT", -input.investment);
  s = { ...s, bots: [{ ...input, id: newId("B"), startedAt: Date.now() }, ...s.bots] };
  s = log(s, {
    type: "bot",
    ccy: "USDT",
    amount: input.investment,
    detail: `Started ${input.kind} bot on ${input.instId}`,
  });
  return { ok: true, state: s, message: "Bot created" };
}

export function stopBot(state: AccountState, id: string, pnl = 0): Result {
  const b = state.bots.find((x) => x.id === id);
  if (!b) return { ok: false, error: "Bot not found" };
  let s = withBalance(state, "USDT", Math.max(0, b.investment + pnl));
  s = { ...s, bots: s.bots.filter((x) => x.id !== id) };
  return { ok: true, state: s, message: "Bot stopped" };
}

export const LOAN_MAX_LTV = 0.7; // initial LTV limit 70%

export function borrow(
  state: AccountState,
  input: {
    borrowCcy: string;
    borrowAmount: number;
    collateralCcy: string;
    collateralAmount: number;
    apr: number;
  },
  prices: Record<string, number>,
): Result {
  if (!(input.borrowAmount > 0) || !(input.collateralAmount > 0))
    return { ok: false, error: "Enter valid amounts" };
  if (getBalance(state, input.collateralCcy).available + 1e-9 < input.collateralAmount)
    return { ok: false, error: `Insufficient ${input.collateralCcy} balance` };
  const ltv =
    (input.borrowAmount * (prices[input.borrowCcy] ?? 0)) /
    (input.collateralAmount * (prices[input.collateralCcy] ?? 0));
  if (!(ltv > 0) || ltv > LOAN_MAX_LTV)
    return { ok: false, error: `Loan-to-value must be at most ${LOAN_MAX_LTV * 100}%` };
  let s = withBalance(state, input.collateralCcy, -input.collateralAmount, input.collateralAmount);
  s = withBalance(s, input.borrowCcy, input.borrowAmount);
  s = { ...s, loans: [{ ...input, id: newId("L"), startedAt: Date.now() }, ...s.loans] };
  s = log(s, {
    type: "loan",
    ccy: input.borrowCcy,
    amount: input.borrowAmount,
    detail: `Borrowed against ${input.collateralAmount} ${input.collateralCcy}`,
  });
  return { ok: true, state: s, message: "Loan created" };
}

export function repayLoan(state: AccountState, id: string, now = Date.now()): Result {
  const l = state.loans.find((x) => x.id === id);
  if (!l) return { ok: false, error: "Loan not found" };
  const interest = l.borrowAmount * l.apr * Math.max(0, (now - l.startedAt) / 86_400_000 / 365);
  const due = l.borrowAmount + interest;
  if (getBalance(state, l.borrowCcy).available + 1e-9 < due)
    return { ok: false, error: `Insufficient ${l.borrowCcy} to repay` };
  let s = withBalance(state, l.borrowCcy, -due);
  s = withBalance(s, l.collateralCcy, l.collateralAmount, -l.collateralAmount);
  s = { ...s, loans: s.loans.filter((x) => x.id !== id) };
  return { ok: true, state: s, message: "Loan repaid" };
}

export function claimReward(
  state: AccountState,
  rewardId: string,
  ccy: string,
  amount: number,
  title: string,
): Result {
  if (state.claimedRewards.includes(rewardId))
    return { ok: false, error: "Reward already claimed" };
  let s = withBalance(state, ccy, amount);
  s = { ...s, claimedRewards: [...s.claimedRewards, rewardId] };
  s = log(s, { type: "reward", ccy, amount, detail: title });
  return { ok: true, state: s, message: `Claimed ${amount} ${ccy}` };
}

export function toggleFavorite(state: AccountState, instId: string): AccountState {
  const has = state.favorites.includes(instId);
  return {
    ...state,
    favorites: has ? state.favorites.filter((f) => f !== instId) : [...state.favorites, instId],
  };
}

/** Total account equity in USD using spot prices (balances + futures margin/PnL + products). */
export function totalEquityUsd(
  state: AccountState,
  prices: Record<string, number>,
  marks: Record<string, number> = {},
): number {
  let total = 0;
  for (const [ccy, b] of Object.entries(state.balances))
    total += (b.available + b.frozen) * (prices[ccy] ?? 0);
  for (const p of state.positions) {
    const mark = marks[p.instId] ?? prices[pair(p.instId)[0]] ?? p.entryPx;
    total += p.margin + positionPnl(p, mark);
  }
  for (const e of state.earn) total += (e.amount + earnInterest(e)) * (prices[e.ccy] ?? 0);
  for (const c of state.copy) total += c.amount;
  for (const b of state.bots) total += b.investment;
  for (const l of state.loans) total -= l.borrowAmount * (prices[l.borrowCcy] ?? 0);
  return total;
}
