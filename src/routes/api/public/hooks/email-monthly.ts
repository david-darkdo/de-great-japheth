// Monthly automation cron endpoint. Called by pg_cron on the 3rd of each month.
// Secured with the internal EMAIL_CRON_SECRET.
import { createFileRoute } from "@tanstack/react-router";
import { runMonthly } from "@/lib/email/engine.server";
import { getCronSecret } from "@/lib/email/config.server";

function authorized(request: Request): boolean {
  const secret = getCronSecret();
  if (!secret) return false;
  const header = request.headers.get("x-cron-secret") || "";
  const auth = request.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const apikey = request.headers.get("apikey") || "";
  const anon = process.env.SUPABASE_PUBLISHABLE_KEY || "";
  return header === secret || bearer === secret || (!!anon && apikey === anon);
}

export const Route = createFileRoute("/api/public/hooks/email-monthly")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
        try {
          const result = await runMonthly();
          return Response.json({ ok: true, ...result });
        } catch (err: any) {
          console.error("[email-monthly] error:", err);
          return Response.json({ error: err?.message || "error" }, { status: 500 });
        }
      },
    },
  },
});
