// Server-only SendGrid transport. No SDK — plain fetch to the v3 API so it
// runs cleanly in the Worker runtime.
import { getSendgridConfig } from "./config.server";

export type SendResult = {
  ok: boolean;
  status: number;
  messageId: string | null;
  error?: string;
};

export type SingleEmail = {
  to: string;
  subject: string;
  html: string;
  // Arbitrary identifiers echoed back by the SendGrid event webhook.
  customArgs?: Record<string, string>;
};

/**
 * Send one email through SendGrid. Each recipient gets a unique message (with
 * per-user tracking URLs baked into the HTML), so we send individually rather
 * than fanning out a single personalization block.
 */
export async function sendOne(email: SingleEmail): Promise<SendResult> {
  const cfg = getSendgridConfig();
  if (!cfg.apiKey) {
    return { ok: false, status: 0, messageId: null, error: "SENDGRID_API_KEY not configured" };
  }

  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: email.to }],
            custom_args: email.customArgs || {},
          },
        ],
        from: { email: cfg.fromEmail, name: cfg.fromName },
        subject: email.subject,
        content: [{ type: "text/html", value: email.html }],
        tracking_settings: {
          click_tracking: { enable: false }, // we use internal tracking links
          open_tracking: { enable: true },
        },
      }),
    });

    if (res.ok) {
      return { ok: true, status: res.status, messageId: res.headers.get("x-message-id") };
    }
    const errText = await res.text();
    console.error(`[sendgrid] send failed [${res.status}]: ${errText}`);
    return { ok: false, status: res.status, messageId: null, error: errText.slice(0, 500) };
  } catch (err: any) {
    console.error("[sendgrid] send exception:", err);
    return { ok: false, status: 0, messageId: null, error: err?.message || "network error" };
  }
}
