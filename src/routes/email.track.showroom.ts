// Internal click tracking → logs the event then redirects to the Showroom.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getPublicBaseUrl } from "@/lib/email/config.server";

export const Route = createFileRoute("/email/track/showroom")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        try {
          await supabaseAdmin.from("email_logs").insert({
            campaign_id: url.searchParams.get("c"),
            user_id: url.searchParams.get("u"),
            email: url.searchParams.get("e"),
            status: "Visited Showroom",
            metadata: { source: "email" },
          });
        } catch (e) { console.error("[track/showroom]", e); }
        return new Response(null, { status: 302, headers: { Location: `${getPublicBaseUrl()}/showroom` } });
      },
    },
  },
});
