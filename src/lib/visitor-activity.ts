import { supabase } from "@/integrations/supabase/client";

export async function recordMyPageVisit(routeId: string): Promise<void> {
  const { error } = await supabase.rpc("record_my_page_visit", { _route_id: routeId });
  if (error) throw new Error(error.message);
}
