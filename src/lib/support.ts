import { supabase } from "@/integrations/supabase/client";

type RpcResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

type SupportRpcClient = {
  rpc<T>(name: string, args?: Record<string, unknown>): PromiseLike<RpcResult<T>>;
};

const supportRpc = supabase as unknown as SupportRpcClient;

async function callSupportRpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supportRpc.rpc<T>(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  author_id: string;
  body: string;
  is_staff: boolean;
  created_at: string;
}

export function createSupportTicket(input: {
  subject: string;
  category: string;
  body: string;
}): Promise<string> {
  return callSupportRpc<string>("create_support_ticket", {
    _subject: input.subject,
    _category: input.category,
    _body: input.body,
  });
}

export async function listMySupportTickets(): Promise<SupportTicket[]> {
  return (await callSupportRpc<SupportTicket[]>("get_my_support_tickets")) ?? [];
}

export async function getMySupportMessages(ticketId: string): Promise<SupportMessage[]> {
  return (
    (await callSupportRpc<SupportMessage[]>("get_my_support_messages", {
      _ticket_id: ticketId,
    })) ?? []
  );
}

export function replyToMySupportTicket(ticketId: string, body: string): Promise<string> {
  return callSupportRpc<string>("reply_to_my_support_ticket", {
    _ticket_id: ticketId,
    _body: body,
  });
}
