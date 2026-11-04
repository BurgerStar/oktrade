import { supabase } from "@/integrations/supabase/client";
import type { AccountState } from "@/lib/account";

type RpcResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

type TransactionRpcClient = {
  rpc<T>(name: string, args?: Record<string, unknown>): PromiseLike<RpcResult<T>>;
};

const transactionRpc = supabase as unknown as TransactionRpcClient;

async function callRpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await transactionRpc.rpc<T>(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export interface ServerAccountState {
  version: number;
  state: AccountState;
}

export interface AccountTransactionRequest {
  id: string;
  transaction_type: string;
  summary: string;
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  user_id?: string;
  email?: string | null;
  details?: Record<string, unknown>;
}

export async function getMyServerAccountState(): Promise<ServerAccountState | null> {
  return callRpc<ServerAccountState | null>("get_my_account_state");
}

export function submitAccountTransaction(input: {
  expectedVersion: number;
  transactionType: string;
  summary: string;
  details: Record<string, unknown>;
  proposedState: AccountState;
}): Promise<string> {
  return callRpc<string>("submit_account_transaction", {
    _expected_version: input.expectedVersion,
    _transaction_type: input.transactionType,
    _summary: input.summary,
    _details: input.details,
    _proposed_state: input.proposedState,
  });
}

export async function listMyAccountTransactionRequests(): Promise<AccountTransactionRequest[]> {
  return (await callRpc<AccountTransactionRequest[]>("get_my_account_transaction_requests")) ?? [];
}

export async function listAdminAccountTransactionRequests(): Promise<AccountTransactionRequest[]> {
  return (
    (await callRpc<AccountTransactionRequest[]>("admin_list_account_transaction_requests")) ?? []
  );
}

export function reviewAccountTransaction(
  id: string,
  approve: boolean,
  note: string,
): Promise<null> {
  return callRpc<null>("admin_review_account_transaction", {
    _request_id: id,
    _approve: approve,
    _note: note,
  });
}
