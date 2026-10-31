import { supabase } from "@/integrations/supabase/client";

type RpcResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

type DepositRpcClient = {
  rpc<T>(name: string, args?: Record<string, unknown>): PromiseLike<RpcResult<T>>;
};

const depositRpc = supabase as unknown as DepositRpcClient;

export interface DepositRequest {
  id: string;
  asset: string;
  network: string;
  amount: number | string;
  tx_hash: string;
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  user_id?: string;
  email?: string | null;
}

export interface ApprovedDepositBalance {
  asset: string;
  available: number | string;
  updated_at: string;
}

async function callRpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await depositRpc.rpc<T>(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export function submitDepositRequest(input: {
  asset: string;
  network: string;
  amount: number;
  txHash: string;
}): Promise<string> {
  return callRpc<string>("submit_deposit_request", {
    _asset: input.asset,
    _network: input.network,
    _amount: input.amount,
    _tx_hash: input.txHash,
  });
}

export async function getMyDepositRequests(): Promise<DepositRequest[]> {
  return (await callRpc<DepositRequest[]>("get_my_deposit_requests")) ?? [];
}

export async function getMyApprovedDepositBalances(): Promise<ApprovedDepositBalance[]> {
  return (await callRpc<ApprovedDepositBalance[]>("get_my_approved_deposit_balances")) ?? [];
}

export async function getIsAdmin(): Promise<boolean> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return false;
  return (
    (await callRpc<boolean>("has_role", {
      _role: "admin",
      _user_id: userData.user.id,
    })) === true
  );
}

export async function listAdminDepositRequests(): Promise<DepositRequest[]> {
  return (await callRpc<DepositRequest[]>("admin_list_deposit_requests")) ?? [];
}

export function reviewDepositRequest(id: string, approve: boolean, note: string): Promise<null> {
  return callRpc<null>("admin_review_deposit_request", {
    _request_id: id,
    _approve: approve,
    _note: note,
  });
}
