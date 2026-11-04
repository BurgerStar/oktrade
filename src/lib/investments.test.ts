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
    const positions = Array.from({ length: 1_205 }, (_, index) => ({ id: `${index}` }));
    rpcMock.mockImplementation((_name: string, args: { _offset: number }) =>
      Promise.resolve({
        data: positions.slice(args._offset, args._offset + 500),
        error: null,
      }),
    );

    const result = await listAdminUserInvestments();

    expect(result).toHaveLength(1_205);
    expect(rpcMock).toHaveBeenCalledTimes(4);
    expect(rpcMock).toHaveBeenNthCalledWith(1, "admin_list_user_investments", {
      _limit: 500,
      _offset: 0,
    });
    expect(rpcMock).toHaveBeenNthCalledWith(4, "admin_list_user_investments", {
      _limit: 500,
      _offset: 1_205,
    });
  });
});
