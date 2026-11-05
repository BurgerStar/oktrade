import { beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: rpcMock },
}));

import { listAdminUserInvestments } from "./investments";

describe("admin investment portfolio", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("loads every position across pages beyond the previous result cap", async () => {
    const positions = Array.from({ length: 1_205 }, (_, index) => ({
      id: `00000000-0000-0000-0000-${String(1_205 - index).padStart(12, "0")}`,
      created_at: new Date(1_800_000_000_000 - Math.floor(index / 3) * 1_000).toISOString(),
    }));
    const position500 = positions[499];
    const position1000 = positions[999];
    if (!position500 || !position1000) throw new Error("Expected test positions are missing.");
    rpcMock.mockImplementation(
      (_name: string, args: { _before_created_at: string | null; _before_id: string | null }) => {
        let remaining = positions;
        if (args._before_created_at !== null && args._before_id !== null) {
          const cursorCreatedAt = args._before_created_at;
          const cursorId = args._before_id;
          remaining = positions.filter(
            (position) =>
              position.created_at < cursorCreatedAt ||
              (position.created_at === cursorCreatedAt && position.id < cursorId),
          );
        }
        return Promise.resolve({
          data: remaining.slice(0, 500),
          error: null,
        });
      },
    );

    const result = await listAdminUserInvestments();

    expect(result).toHaveLength(1_205);
    expect(result.map(({ id }) => id)).toEqual(positions.map(({ id }) => id));
    expect(rpcMock).toHaveBeenCalledTimes(3);
    expect(rpcMock).toHaveBeenNthCalledWith(1, "admin_list_user_investment_page", {
      _limit: 500,
      _before_created_at: null,
      _before_id: null,
    });
    expect(rpcMock).toHaveBeenNthCalledWith(2, "admin_list_user_investment_page", {
      _limit: 500,
      _before_created_at: position500.created_at,
      _before_id: position500.id,
    });
    expect(rpcMock).toHaveBeenNthCalledWith(3, "admin_list_user_investment_page", {
      _limit: 500,
      _before_created_at: position1000.created_at,
      _before_id: position1000.id,
    });
  });
});
