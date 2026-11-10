import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const notificationInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("deposit-review"),
    userId: z.string().uuid(),
    email: z.string().email(),
    status: z.enum(["approved", "rejected"]),
    asset: z.string().min(1).max(16),
    amount: z.string().min(1).max(64),
    note: z.string().max(500).optional(),
  }),
  z.object({
    type: z.literal("transaction-review"),
    userId: z.string().uuid(),
    email: z.string().email(),
    status: z.enum(["approved", "rejected"]),
    summary: z.string().min(1).max(500),
    note: z.string().max(500).optional(),
  }),
  z.object({
    type: z.literal("support-reply"),
    userId: z.string().uuid(),
    email: z.string().email(),
    subject: z.string().min(1).max(160),
    message: z.string().min(1).max(5000),
  }),
]);

type NotificationInput = z.infer<typeof notificationInput>;

const FROM = "OK Trade <info@oktradeinvestmentlimited.com>";

function emailHeaderText(value: string): string {
  return value
    .replace(/[\r\n]/g, " ")
    .trim()
    .slice(0, 180);
}

function getEmailContent(input: NotificationInput): { subject: string; text: string } {
  if (input.type === "deposit-review") {
    const status = input.status === "approved" ? "approved" : "not approved";
    return {
      subject: `Deposit request ${status}`,
      text: [
        "Hello,",
        "",
        `Your deposit request for ${input.amount} ${input.asset} has been ${status}.`,
        input.note ? `Review note: ${input.note}` : "",
        "",
        "If you have questions, reply to this email or contact our support team.",
        "",
        "OK Trade Investment Limited",
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  if (input.type === "transaction-review") {
    const status = input.status === "approved" ? "approved" : "not approved";
    return {
      subject: `Account request ${status}`,
      text: [
        "Hello,",
        "",
        `Your account request has been ${status}.`,
        `Request: ${input.summary}`,
        input.note ? `Review note: ${input.note}` : "",
        "",
        "If you have questions, reply to this email or contact our support team.",
        "",
        "OK Trade Investment Limited",
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  return {
    subject: `Support replied: ${emailHeaderText(input.subject)}`,
    text: [
      "Hello,",
      "",
      `Our support team replied to your request "${input.subject}":`,
      "",
      input.message,
      "",
      "You can continue the conversation in the Live Support chat.",
      "",
      "OK Trade Investment Limited",
    ].join("\n"),
  };
}

export const sendTransactionalEmail = createServerFn({ method: "POST" })
  .validator(
    z.object({
      accessToken: z.string().min(1),
      notification: notificationInput,
    }),
  )
  .handler(async ({ data }) => {
    const supabaseUrl = process.env["SUPABASE_URL"];
    const supabaseKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
    const resendApiKey = process.env["RESEND_API_KEY"];
    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Email notifications are unavailable because Supabase server settings are missing.",
      );
    }
    if (!resendApiKey) {
      throw new Error("Email notifications are not configured. Set RESEND_API_KEY in Vercel.");
    }

    const userClient = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(data.accessToken);
    if (userError || !user) throw new Error("Sign in again before sending an email notification.");

    const { data: isAdmin, error: roleError } = await userClient.rpc("has_role", {
      _role: "admin",
      _user_id: user.id,
    });
    if (roleError || isAdmin !== true) {
      throw new Error("Only an administrator can send transactional email notifications.");
    }

    const { data: recipients, error: recipientError } = await userClient.rpc("admin_list_users", {
      _search: data.notification.email,
      _status: null,
      _role: null,
      _limit: 100,
      _offset: 0,
    });
    if (recipientError) throw new Error("Unable to verify the notification recipient.");
    const recipient = recipients?.find(
      (candidate: { id: string; email: string }) =>
        candidate.id === data.notification.userId &&
        candidate.email.toLowerCase() === data.notification.email.toLowerCase(),
    );
    if (!recipient) throw new Error("The notification recipient could not be verified.");

    const { subject, text } = getEmailContent(data.notification);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [recipient.email],
        reply_to: "info@oktradeinvestmentlimited.com",
        subject,
        text,
      }),
    });
    if (!response.ok) {
      throw new Error(`Email delivery failed (Resend returned ${response.status}).`);
    }
  });
