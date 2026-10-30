import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAccount } from "./account";
import { getAccount, hydrateStore } from "./store";

const KEY = "onyx-exchange-v1";

describe("store migrations", () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal("localStorage", {
      clear: () => {
        storage = {};
      },
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
    });
  });

  it("removes the legacy signup reward from saved accounts", () => {
    const account = createAccount("legacy@onyx.test", "hash");
    account.balances.USDT = { available: 12_000, frozen: 0 };
    account.activity = [
      {
        id: "legacy-reward",
        type: "reward",
        ccy: "USDT",
        amount: 10_000,
        detail: "Trading funds",
        status: "completed",
        ts: 1,
      },
    ];
    account.notifications = [
      {
        id: "legacy-welcome",
        title: "Welcome to OK Trade",
        body: "Your account is ready with 10,000 USDT to practise trading.",
        ts: 1,
        read: false,
      },
    ];
    localStorage.setItem(
      KEY,
      JSON.stringify({ accounts: { [account.user.email]: account }, current: account.user.email }),
    );

    hydrateStore();

    expect(getAccount()?.balances.USDT).toEqual({ available: 2_000, frozen: 0 });
    expect(getAccount()?.activity).toEqual([]);
    expect(getAccount()?.notifications[0]?.body).toBe("Your account is ready for trading.");
    expect(JSON.parse(storage[KEY]!).accounts[account.user.email].balances.USDT.available)
      .toBe(2_000);
  });
});