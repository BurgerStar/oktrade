import { supabase } from "@/integrations/supabase/client";

type RpcResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

type InvestmentRpcClient = {
  rpc<T>(name: string, args?: Record<string, unknown>): PromiseLike<RpcResult<T>>;
};

const investmentRpc = supabase as unknown as InvestmentRpcClient;

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

export async function getPublicInvestmentPlans(): Promise<PublicInvestmentPlan[]> {
  const { data, error } =
    await investmentRpc.rpc<PublicInvestmentPlan[]>("public_investment_plans");
  if (error) throw new Error(error.message);
  return data ?? [];
}
