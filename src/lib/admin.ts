import { supabase } from "@/integrations/supabase/client";

type RpcResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

type AdminRpcClient = {
  rpc<T>(name: string, args?: Record<string, unknown>): PromiseLike<RpcResult<T>>;
};

const adminRpc = supabase as unknown as AdminRpcClient;

async function callAdminRpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await adminRpc.rpc<T>(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  is_admin: boolean;
  last_active: string;
  open_tickets: number;
  order_count: number;
  status: string;
  status_reason: string;
  total_count: number;
}

export interface AdminAuditEntry {
  id: string;
  action: string;
  actor_email: string;
  created_at: string;
  details: Record<string, unknown>;
  entity: string;
  entity_id: string;
}

export interface AdminTicket {
  id: string;
  category: string;
  created_at: string;
  email: string;
  last_from_staff: boolean;
  message_count: number;
  priority: string;
  status: string;
  subject: string;
  updated_at: string;
  user_id: string;
}

export interface AdminTicketMessage {
  id: string;
  author_id: string;
  body: string;
  is_staff: boolean;
  created_at: string;
}

export interface AdminUserActivity {
  id: string;
  email: string;
  display_name: string;
  country_of_residence: string | null;
  status: string;
  created_at: string;
  last_active: string | null;
}

export interface AdminVisitorActivity {
  id: string;
  email: string;
  display_name: string;
  country_of_residence: string | null;
  route_id: string;
  visited_at: string;
}

export interface AdminInvestmentPlan {
  id: string;
  name: string;
  daily_rate: number | string;
  duration_days: number;
  minimum_amount: number | string;
  maximum_amount: number | string;
  bonus_label: string;
  featured: boolean;
  enabled: boolean;
  display_order: number;
  updated_at: string;
}

export async function getAdminOverview(): Promise<unknown> {
  return callAdminRpc("admin_overview");
}

export async function listAdminUsers(
  input: {
    search?: string;
    status?: string;
    role?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<AdminUser[]> {
  return (
    (await callAdminRpc<AdminUser[]>("admin_list_users", {
      _search: input.search || undefined,
      _status: input.status && input.status !== "all" ? input.status : undefined,
      _role: input.role && input.role !== "all" ? input.role : undefined,
      _limit: input.limit ?? 25,
      _offset: input.offset ?? 0,
    })) ?? []
  );
}

export async function searchAdminUsers(search: string): Promise<AdminUser[]> {
  if (search.trim().length < 2) return [];
  return listAdminUsers({ search: search.trim(), limit: 8, offset: 0 });
}

export async function updateAdminUserStatus(
  userId: string,
  status: "active" | "suspended",
  reason: string,
): Promise<null> {
  return callAdminRpc("admin_set_user_status", {
    _user: userId,
    _status: status,
    _reason: reason,
  });
}

export async function setAdminRole(userId: string, makeAdmin: boolean): Promise<null> {
  return callAdminRpc("admin_set_admin", { _user: userId, _make: makeAdmin });
}

export async function listAdminAudit(entity = "all", limit = 50): Promise<AdminAuditEntry[]> {
  return (
    (await callAdminRpc<AdminAuditEntry[]>("admin_list_audit", {
      _entity: entity === "all" ? undefined : entity,
      _limit: limit,
    })) ?? []
  );
}

export async function listAdminTickets(search = "", status = "all"): Promise<AdminTicket[]> {
  return (
    (await callAdminRpc<AdminTicket[]>("admin_list_tickets", {
      _search: search || undefined,
      _status: status === "all" ? undefined : status,
    })) ?? []
  );
}

export async function getAdminTicketMessages(ticketId: string): Promise<AdminTicketMessage[]> {
  return (
    (await callAdminRpc<AdminTicketMessage[]>("admin_get_support_messages", {
      _ticket_id: ticketId,
    })) ?? []
  );
}

export function replyToSupportTicket(ticketId: string, body: string): Promise<string> {
  return callAdminRpc("admin_reply_support_ticket", { _ticket_id: ticketId, _body: body });
}

export function setSupportTicketStatus(ticketId: string, status: string): Promise<null> {
  return callAdminRpc("admin_set_ticket_status", { _ticket_id: ticketId, _status: status });
}

export async function listAdminUserActivity(limit = 100): Promise<AdminUserActivity[]> {
  return (
    (await callAdminRpc<AdminUserActivity[]>("admin_list_user_activity", { _limit: limit })) ?? []
  );
}

export async function listAdminVisitorActivity(limit = 100): Promise<AdminVisitorActivity[]> {
  return (
    (await callAdminRpc<AdminVisitorActivity[]>("admin_list_visitor_activity", {
      _limit: limit,
    })) ?? []
  );
}

export async function listAdminInvestmentPlans(): Promise<AdminInvestmentPlan[]> {
  return (await callAdminRpc<AdminInvestmentPlan[]>("admin_list_investment_plans")) ?? [];
}

export function updateAdminInvestmentPlan(input: {
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
}): Promise<null> {
  return callAdminRpc<null>("admin_update_investment_plan", {
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
}
