import { sendTransactionalEmail } from "@/lib/email-notifications.server";
import { supabase } from "@/integrations/supabase/client";

type Notification = Parameters<typeof sendTransactionalEmail>[0]["data"]["notification"];

export async function sendAdminTransactionalEmail(notification: Notification): Promise<void> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error("Unable to verify the administrator session for email delivery.");
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Sign in again before sending an email notification.");
  await sendTransactionalEmail({ data: { accessToken, notification } });
}
