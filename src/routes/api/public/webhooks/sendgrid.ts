// SendGrid Event Webhook. SendGrid POSTs delivery/open/bounce events here.
// Reachable publicly (external caller); secured with a secret query key.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getWebhookSecret } from "@/lib/email/config.server";

// Map SendGrid event names to our email_logs status vocabulary.
function mapStatus(event: string): string | null {
  switch (event) {
    case "delivered": return "Delivered";
    case "open": return "Opened";
    case "bounce":
    case "blocked":
    case "dropped": return "Bounced";
    case "deferred":
    case "spamreport": return "Failed";
    default: return null;
  }
}

export const Route = createFileRoute("/api/public/webhooks/sendgrid")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const key = url.searchParams.get("key") || "";
        const secret = getWebhookSecret();
        const anon = process.env.SUPABASE_PUBLISHABLE_KEY || "";
        const authorized = (!!secret && key === secret) || (!!anon && key === anon);
        if (!authorized) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const events = await request.json();
          const list = Array.isArray(events) ? events : [events];
          for (const ev of list) {
            const status = mapStatus(ev.event);
            if (!status) continue;
            await supabaseAdmin.from("email_logs").insert({
              campaign_id: ev.campaign_id || null,
              user_id: ev.user_id || null,
              email: ev.email || null,
              status,
              provider_message_id: ev.sg_message_id || null,
              metadata: { event: ev.event, reason: ev.reason || null, sg_event_id: ev.sg_event_id || null },
              event_at: ev.timestamp ? new Date(ev.timestamp * 1000).toISOString() : new Date().toISOString(),
            });
          }
          return Response.json({ ok: true, processed: list.length });
        } catch (err: any) {
          console.error("[sendgrid-webhook] error:", err);
          return Response.json({ error: err?.message || "error" }, { status: 500 });
        }
      },
    },
  },
});
