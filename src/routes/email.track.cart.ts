// Internal click tracking → logs the event then redirects to the Cart.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getPublicBaseUrl } from "@/lib/email/config.server";

export const Route = createFileRoute("/email/track/cart")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        try {
          await supabaseAdmin.from("email_logs").insert({
            campaign_id: url.searchParams.get("c"),
            user_id: url.searchParams.get("u"),
            email: url.searchParams.get("e"),
            status: "Visited Cart",
            metadata: { source: "email" },
          });
        } catch (e) { console.error("[track/cart]", e); }
        return new Response(null, { status: 302, headers: { Location: `${getPublicBaseUrl()}/cart` } });
      },
    },
  },
});
