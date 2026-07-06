// Weekly cart-reminder cron endpoint. Called by pg_cron every 7 days.
// Secured with the internal EMAIL_CRON_SECRET.
import { createFileRoute } from "@tanstack/react-router";
import { runCart } from "@/lib/email/engine.server";
import { getCronSecret } from "@/lib/email/config.server";

function authorized(request: Request): boolean {
  const secret = getCronSecret();
  if (!secret) return false;
  const header = request.headers.get("x-cron-secret") || "";
  const auth = request.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return header === secret || bearer === secret;
}

export const Route = createFileRoute("/api/public/hooks/email-cart")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
        try {
          const result = await runCart();
          return Response.json({ ok: true, ...result });
        } catch (err: any) {
          console.error("[email-cart] error:", err);
          return Response.json({ error: err?.message || "error" }, { status: 500 });
        }
      },
    },
  },
});
