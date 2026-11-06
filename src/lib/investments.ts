import { supabase } from "@/integrations/supabase/client";

type RpcResult<T> = {
  data: T | null;
  error: {
    message: string;
    code?: string;
    details?: string;
    hint?: string;
  } | null;
};

type InvestmentRpcClient = {
  rpc<T>(name: string, args?: Record<string, unknown>): PromiseLike<RpcResult<T>>;
};

const investmentRpc = supabase as unknown as InvestmentRpcClient;

export class InvestmentRpcError extends Error {
  readonly code: string | undefined;
  readonly details: string | undefined;
  readonly hint: string | undefined;

  constructor(
    readonly functionName: string,
    error: NonNullable<RpcResult<unknown>["error"]>,
  ) {
    super(error.message);
    this.name = "InvestmentRpcError";
    this.code = error.code;
    this.details = error.details;
    this.hint = error.hint;
  }
}

export function getInvestmentApiHost(): string {
  return new URL(import.meta.env["VITE_SUPABASE_URL"]).host;
}

export interface PublicInvestmentPlan {
  id: string;
  name: string;
  daily_rate: number | string;
  duration_days: number;
  minimum_amount: number | string;
  maximum_amount: number | string;
  bonus_label: string;
  featured: boolean;
  display_order: number;
}

export interface AdminInvestmentPlan extends PublicInvestmentPlan {
  enabled: boolean;
  updated_at: string;
  archived_at: string | null;
}

export interface InvestmentPosition {
  id: string;
  plan_id: string;
  plan_name: string;
  asset: string;
  principal: number | string;
  daily_rate: number | string;
  duration_days: number;
  status: "active" | "redemption_pending" | "redeemed";
  started_at: string;
  accrued_return: number | string;
  redeemable_at: string;
}

export interface InvestmentRequest {
  id: string;
  request_type: "subscribe" | "redeem";
  plan_name: string;
  amount: number | string;
  asset: string;
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  reference: string;
}

export interface AdminInvestmentRequest {
  id: string;
  user_id: string;
  email: string;
  transaction_type: string;
  summary: string;
  details: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface AdminInvestmentPosition {
  id: string;
  user_id: string;
  email: string;
  plan_name: string;
  asset: string;
  principal: number | string;
  accrued_return: number | string;
  daily_rate: number | string;
  duration_days: number;
  status: "active" | "redemption_pending" | "redeemed";
  started_at: string;
  redeemable_at: string;
  created_at: string;
}

export interface InvestmentPlanProjection {
  dailyReturn: number;
  termReturn: number;
  termTotal: number;
  simpleAnnualizedRate: number;
}

export function calculateInvestmentPlanProjection(
  principal: number,
  dailyRate: number,
  durationDays: number,
): InvestmentPlanProjection {
  const dailyReturn = (principal * dailyRate) / 100;
  const termReturn = dailyReturn * durationDays;

  return {
    dailyReturn,
    termReturn,
    termTotal: principal + termReturn,
    simpleAnnualizedRate: dailyRate * 365,
  };
}

export async function getPublicInvestmentPlans(): Promise<PublicInvestmentPlan[]> {
  const { data, error } =
    await investmentRpc.rpc<PublicInvestmentPlan[]>("public_investment_plans");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listAdminInvestmentPlans(): Promise<AdminInvestmentPlan[]> {
  const { data, error } = await investmentRpc.rpc<AdminInvestmentPlan[]>(
    "admin_list_investment_plans",
  );
  if (error) throw new InvestmentRpcError("admin_list_investment_plans", error);
  return data ?? [];
}

export async function listAdminInvestmentRequests(): Promise<AdminInvestmentRequest[]> {
  const { data, error } = await investmentRpc.rpc<AdminInvestmentRequest[]>(
    "admin_list_investment_requests",
    { _limit: 100 },
  );
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listAdminUserInvestments(): Promise<AdminInvestmentPosition[]> {
  const pageSize = 500;
  const positions: AdminInvestmentPosition[] = [];
  let before: { created_at: string; id: string } | undefined;

  while (true) {
    const { data, error } = await investmentRpc.rpc<AdminInvestmentPosition[]>(
      "admin_list_user_investment_page",
      {
        _limit: pageSize,
        _before_created_at: before?.created_at ?? null,
        _before_id: before?.id ?? null,
      },
    );
    if (error) throw new Error(error.message);
    if (data === null) {
      throw new Error("The admin investment positions RPC returned no data.");
    }

    const page = data;
    if (page.length === 0) return positions;
    positions.push(...page);
    if (page.length < pageSize) return positions;

    const lastPosition = page[page.length - 1];
    if (!lastPosition) {
      throw new Error("The admin investment positions RPC returned an invalid page.");
    }
    if (before?.created_at === lastPosition.created_at && before.id === lastPosition.id) {
      throw new Error("Admin investment positions pagination did not advance.");
    }
    before = { created_at: lastPosition.created_at, id: lastPosition.id };
  }
}

export async function getMyInvestmentPortfolio(): Promise<InvestmentPosition[]> {
  const { data, error } = await investmentRpc.rpc<InvestmentPosition[]>(
    "get_my_investment_portfolio",
  );
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getMyInvestmentRequests(): Promise<InvestmentRequest[]> {
  const { data, error } = await investmentRpc.rpc<InvestmentRequest[]>(
    "get_my_investment_requests",
    { _limit: 100 },
  );
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function requestInvestmentSubscription(
  planId: string,
  amount: number,
): Promise<string> {
  const { data, error } = await investmentRpc.rpc<string>("request_investment_subscription", {
    _plan_id: planId,
    _amount: amount,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The subscription request returned no reference.");
  return data;
}

export async function requestInvestmentRedemption(positionId: string): Promise<string> {
  const { data, error } = await investmentRpc.rpc<string>("request_investment_redemption", {
    _position_id: positionId,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The redemption request returned no reference.");
  return data;
}

export async function requestInvestmentJumpstart(
  projectName: string,
  asset: "USDT" | "OKB",
  amount: number,
): Promise<string> {
  const { data, error } = await investmentRpc.rpc<string>("request_investment_jumpstart", {
    _project_name: projectName,
    _asset: asset,
    _amount: amount,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The Jumpstart staking request returned no reference.");
  return data;
}

export async function reviewInvestmentRequest(
  requestId: string,
  approve: boolean,
  note: string,
): Promise<void> {
  const { error } = await investmentRpc.rpc("admin_review_investment_request", {
    _request_id: requestId,
    _approve: approve,
    _note: note,
  });
  if (error) throw new Error(error.message);
}

export async function createAdminInvestmentPlan(input: {
  name: string;
  dailyRate: number;
  durationDays: number;
  minimumAmount: number;
  maximumAmount: number;
  bonusLabel: string;
  featured: boolean;
  enabled: boolean;
  reason: string;
}): Promise<string> {
  const { data, error } = await investmentRpc.rpc<string>("admin_create_investment_plan", {
    _name: input.name,
    _daily_rate: input.dailyRate,
    _duration_days: input.durationDays,
    _minimum_amount: input.minimumAmount,
    _maximum_amount: input.maximumAmount,
    _bonus_label: input.bonusLabel,
    _featured: input.featured,
    _enabled: input.enabled,
    _reason: input.reason,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The new plan was not returned by the server.");
  return data;
}

export async function updateAdminInvestmentPlan(input: {
  id: string;
  name: string;
  dailyRate: number;
  durationDays: number;
  minimumAmount: number;
  maximumAmount: number;
  bonusLabel: string;
  featured: boolean;
  enabled: boolean;
  reason: string;
}): Promise<void> {
  const { error } = await investmentRpc.rpc("admin_update_investment_plan", {
    _id: input.id,
    _name: input.name,
    _daily_rate: input.dailyRate,
    _duration_days: input.durationDays,
    _minimum_amount: input.minimumAmount,
    _maximum_amount: input.maximumAmount,
    _bonus_label: input.bonusLabel,
    _featured: input.featured,
    _enabled: input.enabled,
    _reason: input.reason,
  });
  if (error) throw new Error(error.message);
}

export async function archiveAdminInvestmentPlan(id: string, reason: string): Promise<void> {
  const { error } = await investmentRpc.rpc("admin_archive_investment_plan", {
    _id: id,
    _reason: reason,
  });
  if (error) throw new Error(error.message);
}