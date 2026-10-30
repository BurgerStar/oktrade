/**
 * Client-side store for the account + user preferences, persisted to localStorage.
 * SSR-safe: the server snapshot is always "signed out / defaults"; the real
 * state is loaded after hydration by <StoreHydrator /> in __root.
 */
import { useSyncExternalStore } from "react";
import { createAccount, type AccountState, type Result } from "./account";

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
        (entry) => entry.type === "reward" && entry.detail === "Trading funds" && entry.ccy === "USDT",
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
              !(entry.type === "reward" && entry.detail === "Trading funds" && entry.ccy === "USDT"),
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
  window.addEventListener("storage", (e) => {
    if (e.key === KEY && e.newValue) {
      data = JSON.parse(e.newValue);
      emit();
    }
  });
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

/** Run a Result-returning action; commits on success and returns the result. */
export function run(fn: (s: AccountState) => Result): Result {
  const cur = getAccount();
  if (!cur) return { ok: false, error: "Log in to continue" };
  const r = fn(cur);
  if (r.ok) update(() => r.state);
  return r;
}

export function setPrefs(p: Partial<Prefs>) {
  data = { ...data, prefs: { ...data.prefs, ...p } };
  if (p.theme) applyTheme(p.theme);
  save();
  emit();
}

async function hashPassword(email: string, password: string): Promise<string> {
  const buf = new TextEncoder().encode(`onyx:${email.toLowerCase()}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signUp(
  email: string,
  password: string,
  nickname?: string,
): Promise<{ ok: boolean; error?: string }> {
  const key = email.trim().toLowerCase();
  if (data.accounts[key])
    return { ok: false, error: "An account with this email already exists. Log in instead." };
  const acct = createAccount(key, await hashPassword(key, password), nickname);
  data = { ...data, accounts: { ...data.accounts, [key]: acct }, current: key };
  save();
  emit();
  return { ok: true };
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const key = email.trim().toLowerCase();
  const acct = data.accounts[key];
  if (!acct) return { ok: false, error: "No account found for this email. Sign up first." };
  if (acct.user.passwordHash !== (await hashPassword(key, password)))
    return { ok: false, error: "Incorrect password. Try again." };
  data = { ...data, current: key };
  save();
  emit();
  return { ok: true };
}

export async function changePassword(
  oldPw: string,
  newPw: string,
): Promise<{ ok: boolean; error?: string }> {
  const cur = getAccount();
  if (!cur) return { ok: false, error: "Log in to continue" };
  if (cur.user.passwordHash !== (await hashPassword(cur.user.email, oldPw)))
    return { ok: false, error: "Current password is incorrect" };
  const h = await hashPassword(cur.user.email, newPw);
  update((s) => ({ ...s, user: { ...s.user, passwordHash: h } }));
  return { ok: true };
}

export function signOut() {
  data = { ...data, current: null };
  save();
  emit();
}

export function deleteAccount() {
  const cur = getAccount();
  if (!cur) return;
  const { [cur.user.email]: _removed, ...rest } = data.accounts;
  void _removed;
  data = { ...data, accounts: rest, current: null };
  save();
  emit();
}
