/**
 * Client-side store for the account + user preferences, persisted to localStorage.
 * SSR-safe: the server snapshot is always "signed out / defaults"; the real
 * state is loaded after hydration by <StoreHydrator /> in __root.
 */
import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createAccount, type AccountState, type Result } from "./account";
import { getMyServerAccountState, submitAccountTransaction } from "./transaction-approvals";

export type Theme = "dark" | "light";
export interface Prefs {
  theme: Theme;
  currency: string; // fiat display code
  language: string;
  hideBalances: boolean;
}

interface Persisted {
  accounts: Record<string, AccountState>;
  current: string | null;
  prefs: Prefs;
}

const KEY = "onyx-exchange-v1";
const DEFAULT_PREFS: Prefs = {
  theme: "dark",
  currency: "USD",
  language: "English",
  hideBalances: false,
};
const EMPTY: Persisted = { accounts: {}, current: null, prefs: DEFAULT_PREFS };

function removeLegacyStartingRewards(accounts: Persisted["accounts"]) {
  let changed = false;
  const migrated = Object.fromEntries(
    Object.entries(accounts).map(([email, account]) => {
      const legacyRewards = account.activity.filter(
        (entry) =>
          entry.type === "reward" && entry.detail === "Trading funds" && entry.ccy === "USDT",
      );
      if (legacyRewards.length === 0) return [email, account];
      changed = true;
      const rewardTotal = legacyRewards.reduce((sum, entry) => sum + entry.amount, 0);
      const usdt = account.balances.USDT ?? { available: 0, frozen: 0 };
      return [
        email,
        {
          ...account,
          balances: {
            ...account.balances,
            USDT: { ...usdt, available: Math.max(0, usdt.available - rewardTotal) },
          },
          activity: account.activity.filter(
            (entry) =>
              !(
                entry.type === "reward" &&
                entry.detail === "Trading funds" &&
                entry.ccy === "USDT"
              ),
          ),
          notifications: account.notifications.map((notification) =>
            notification.title === "Welcome to OK Trade" &&
            notification.body.includes("USDT to practise trading")
              ? { ...notification, body: "Your account is ready for trading." }
              : notification,
          ),
        },
      ];
    }),
  );
  return { accounts: migrated, changed };
}

let data: Persisted = EMPTY;
let hydrated = false;
let authInitialized = false;
const serverVersions = new Map<string, number>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage full or blocked */
  }
}

export function hydrateStore() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Persisted;
      const migration = removeLegacyStartingRewards(parsed.accounts ?? {});
      data = {
        ...EMPTY,
        ...parsed,
        current: null,
        accounts: migration.accounts,
        prefs: { ...DEFAULT_PREFS, ...parsed.prefs },
      };
      if (migration.changed) save();
    }
  } catch {
    data = EMPTY;
  }
  applyTheme(data.prefs.theme);
  emit();
  if (!authInitialized) {
    authInitialized = true;
    supabase.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => {
        if (session?.user) activateSupabaseUser(session.user);
        else clearCurrentAccount();
      });
    });
    void supabase.auth.getSession().then(({ data: sessionData }) => {
      if (sessionData.session?.user) activateSupabaseUser(sessionData.session.user);
      else clearCurrentAccount();
    });
  }
  window.addEventListener("storage", (e) => {
    if (e.key === KEY && e.newValue) {
      const parsed = JSON.parse(e.newValue) as Persisted;
      data = { ...EMPTY, ...parsed, current: data.current };
      emit();
    }
  });
}

function activateSupabaseUser(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): boolean {
  const email = user.email?.trim().toLowerCase();
  if (!email) return false;
  const existing = data.accounts[email];
  const legacyStateReset = !!existing && existing.user.uid !== user.id;
  const account =
    existing && !legacyStateReset
      ? existing
      : createAccount(
          email,
          "supabase-auth",
          typeof user.user_metadata?.nickname === "string"
            ? user.user_metadata.nickname
            : undefined,
        );
  data = {
    ...data,
    accounts: {
      ...data.accounts,
      [email]: { ...account, user: { ...account.user, uid: user.id } },
    },
    current: email,
  };
  save();
  emit();
  return legacyStateReset;
}

function clearCurrentAccount() {
  if (!data.current) return;
  data = { ...data, current: null };
  save();
  emit();
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.classList.remove("dark", "light");
  el.classList.add(theme);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore<T>(select: (d: Persisted) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => select(data),
    () => select(EMPTY),
  );
}

export function useAccount(): AccountState | null {
  return useStore((d) => (d.current ? (d.accounts[d.current] ?? null) : null));
}
export function usePrefs(): Prefs {
  return useStore((d) => d.prefs);
}
export function useHydratedStore(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => hydrated,
    () => false,
  );
}

export function getAccount(): AccountState | null {
  return data.current ? (data.accounts[data.current] ?? null) : null;
}

function sanitizedAccountState(state: AccountState): AccountState {
  return { ...state, user: { ...state.user, passwordHash: "" } };
}

function transactionDetails(before: AccountState, after: AccountState, message?: string) {
  const changedRecords = <T extends { id: string }>(oldItems: T[], newItems: T[]) => ({
    added: newItems.filter((item) => !oldItems.some((old) => old.id === item.id)),
    updated: newItems.filter((item) => {
      const old = oldItems.find((entry) => entry.id === item.id);
      return old && JSON.stringify(old) !== JSON.stringify(item);
    }),
    removed: oldItems.filter((item) => !newItems.some((next) => next.id === item.id)),
  });
  const balances = [...new Set([...Object.keys(before.balances), ...Object.keys(after.balances)])]
    .map((asset) => {
      const old = before.balances[asset] ?? { available: 0, frozen: 0 };
      const next = after.balances[asset] ?? { available: 0, frozen: 0 };
      return old.available !== next.available || old.frozen !== next.frozen
        ? { asset, before: old, after: next }
        : null;
    })
    .filter((entry) => entry !== null);
  const newActivity = after.activity.find(
    (item) => !before.activity.some((old) => old.id === item.id),
  );
  const changedOrders = after.orders.filter((item) => {
    const old = before.orders.find((order) => order.id === item.id);
    return !old || JSON.stringify(old) !== JSON.stringify(item);
  });
  const changedPositions = after.positions.filter((item) => {
    const old = before.positions.find((position) => position.id === item.id);
    return !old || JSON.stringify(old) !== JSON.stringify(item);
  });
  const closedPositions = after.closedPositions.filter(
    (item) => !before.closedPositions.some((old) => old.id === item.id),
  );
  const transactionType =
    newActivity?.type ??
    (changedOrders.length
      ? "spot-order"
      : changedPositions.length || closedPositions.length
        ? "futures-order"
        : "account");
  const summary =
    newActivity?.detail ??
    (changedOrders[0]
      ? `${changedOrders[0].side} ${changedOrders[0].size} ${changedOrders[0].instId} order ${changedOrders[0].status}`
      : changedPositions[0]
        ? `${changedPositions[0].side} ${changedPositions[0].instId} position`
        : closedPositions[0]
          ? `Closed ${closedPositions[0].side} ${closedPositions[0].instId} position`
          : (message ?? "Account transaction"));

  return {
    transactionType,
    summary: summary.slice(0, 300),
    details: {
      message: message ?? null,
      balances,
      activity: newActivity ?? null,
      orders: changedOrders,
      positions: changedPositions,
      closedPositions,
      earn: changedRecords(before.earn, after.earn),
      copy: changedRecords(before.copy, after.copy),
      bots: changedRecords(before.bots, after.bots),
      loans: changedRecords(before.loans, after.loans),
      claimedRewards:
        JSON.stringify(before.claimedRewards) === JSON.stringify(after.claimedRewards)
          ? null
          : { before: before.claimedRewards, after: after.claimedRewards },
    },
  };
}

/** Replaces local state only with a newer state that an administrator approved on the server. */
export function applyServerAccountState(
  state: AccountState | null,
  version: number,
  userId: string,
) {
  if (!state || !Number.isSafeInteger(version) || version < 0) return;
  const current = getAccount();
  if (!current || current.user.uid !== userId || state.user?.uid !== userId) return;
  const hasVersion = serverVersions.has(userId);
  const knownVersion = serverVersions.get(userId) ?? 0;
  if (version < knownVersion || (hasVersion && version === knownVersion)) return;
  serverVersions.set(userId, version);
  update(() => ({
    ...state,
    user: {
      ...state.user,
      email: current.user.email,
      passwordHash: current.user.passwordHash,
      ...(version === 0 && !hasVersion
        ? {
            nickname: current.user.nickname,
            createdAt: current.user.createdAt,
            verified: current.user.verified,
            twoFA: current.user.twoFA,
            antiPhishing: current.user.antiPhishing,
          }
        : {}),
    },
  }));
}

/** Apply a state transition to the signed-in account. */
export function update(fn: (s: AccountState) => AccountState) {
  const cur = getAccount();
  if (!cur) return;
  const next = fn(cur);
  if (next === cur) return;
  data = { ...data, accounts: { ...data.accounts, [cur.user.email]: next } };
  save();
  emit();
}

/** Submit a proposed state transition; the server commits it only after admin approval. */
export async function run(fn: (s: AccountState) => Result): Promise<Result> {
  const initial = getAccount();
  if (!initial) return { ok: false, error: "Log in to continue" };

  try {
    const serverState = await getMyServerAccountState();
    if (serverState) {
      applyServerAccountState(serverState.state, serverState.version, initial.user.uid);
      serverVersions.set(initial.user.uid, serverState.version);
    } else {
      serverVersions.set(initial.user.uid, 0);
    }

    const current = getAccount();
    if (!current || current.user.uid !== initial.user.uid)
      return { ok: false, error: "Account changed. Please retry the transaction." };
    const result = fn(current);
    if (!result.ok) return result;

    const transaction = transactionDetails(current, result.state, result.message);
    await submitAccountTransaction({
      expectedVersion: serverVersions.get(current.user.uid) ?? 0,
      transactionType: transaction.transactionType,
      summary: transaction.summary,
      details: transaction.details,
      proposedState: sanitizedAccountState(result.state),
    });

    return {
      ok: true,
      state: current,
      message: "Transaction submitted for administrator approval",
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to submit transaction for approval",
    };
  }
}

export function setPrefs(p: Partial<Prefs>) {
  data = { ...data, prefs: { ...data.prefs, ...p } };
  if (p.theme) applyTheme(p.theme);
  save();
  emit();
}

export async function signUp(
  email: string,
  password: string,
  nickname?: string,
  countryOfResidence?: string,
): Promise<{ ok: boolean; error?: string; emailConfirmationRequired?: boolean }> {
  const key = email.trim().toLowerCase();
  const { data: result, error } = await supabase.auth.signUp({
    email: key,
    password,
    options: { data: { nickname, country_of_residence: countryOfResidence } },
  });
  if (error) return { ok: false, error: error.message };
  if (result.session?.user) activateSupabaseUser(result.session.user);
  return { ok: true, emailConfirmationRequired: !result.session };
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string; emailConfirmationRequired?: boolean }> {
  const key = email.trim().toLowerCase();
  const { data: result, error } = await supabase.auth.signInWithPassword({ email: key, password });
  if (error) return { ok: false, error: error.message };
  if (!result.user) return { ok: false, error: "Unable to verify this account. Please try again." };
  activateSupabaseUser(result.user);
  return { ok: true };
}

export async function requestPasswordReset(
  email: string,
): Promise<{ ok: boolean; error?: string }> {
  const key = email.trim().toLowerCase();
  if (!key) return { ok: false, error: "Enter your email address first." };
  const redirectTo =
    typeof window === "undefined" ? undefined : `${window.location.origin}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(
    key,
    redirectTo ? { redirectTo } : undefined,
  );
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function changePassword(
  oldPw: string,
  newPw: string,
): Promise<{ ok: boolean; error?: string }> {
  const cur = getAccount();
  if (!cur) return { ok: false, error: "Log in to continue" };
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: cur.user.email,
    password: oldPw,
  });
  if (reauthError) return { ok: false, error: "Current password is incorrect" };
  const { error } = await supabase.auth.updateUser({ password: newPw });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export function signOut() {
  void supabase.auth.signOut().finally(clearCurrentAccount);
}

export function deleteAccount() {
  const cur = getAccount();
  if (!cur) return;
  const { [cur.user.email]: _removed, ...rest } = data.accounts;
  void _removed;
  data = { ...data, accounts: rest, current: null };
  save();
  emit();
  void supabase.auth.signOut();
}
