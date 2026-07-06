// Internal click tracking → logs the event then redirects to WhatsApp.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { whatsappRedirect } from "@/lib/email/render.server";

export const Route = createFileRoute("/email/track/whatsapp")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        try {
          await supabaseAdmin.from("email_logs").insert({
            campaign_id: url.searchParams.get("c"),
            user_id: url.searchParams.get("u"),
            email: url.searchParams.get("e"),
            status: "Clicked WhatsApp",
            metadata: { source: "email" },
          });
        } catch (e) { console.error("[track/whatsapp]", e); }
        return new Response(null, { status: 302, headers: { Location: whatsappRedirect() } });
      },
    },
  },
});
