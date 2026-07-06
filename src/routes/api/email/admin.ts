// Admin-only control endpoint for the Email Automation Engine.
// Requires a signed-in admin/staff bearer token. Infrastructure for Phase 1
// Vol.2 UI: manual send, test email, retry, and automation switch.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runManualCampaign, runMonthly, runCart, sendTestEmail, retryFailed } from "@/lib/email/engine.server";

async function requireAdmin(request: Request): Promise<{ ok: true; userId: string } | { ok: false; res: Response }> {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return { ok: false, res: Response.json({ error: "Unauthorized" }, { status: 401 }) };

  const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error } = await client.auth.getUser(token);
  if (error || !userData.user) return { ok: false, res: Response.json({ error: "Invalid session" }, { status: 401 }) };

  const { data: isAdmin } = await supabaseAdmin.rpc("is_admin_or_staff", { _user_id: userData.user.id });
  if (!isAdmin) return { ok: false, res: Response.json({ error: "Forbidden" }, { status: 403 }) };
  return { ok: true, userId: userData.user.id };
}

export const Route = createFileRoute("/api/email/admin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const gate = await requireAdmin(request);
        if (!gate.ok) return gate.res;
        try {
          const body = await request.json();
          const action = body?.action as string;

          switch (action) {
            case "run_monthly":
              return Response.json(await runMonthly());
            case "run_cart":
              return Response.json(await runCart());
            case "send_manual": {
              if (!body.campaignId) return Response.json({ error: "campaignId required" }, { status: 400 });
              return Response.json(await runManualCampaign(body.campaignId));
            }
            case "test":
              return Response.json(await sendTestEmail({ kind: body.kind || "monthly", to: body.to, campaignId: body.campaignId }));
            case "retry": {
              if (!body.campaignId) return Response.json({ error: "campaignId required" }, { status: 400 });
              return Response.json(await retryFailed(body.campaignId));
            }
            case "set_status": {
              const name = body.scheduler_name || "global";
              const status = body.status === "paused" ? "paused" : "enabled";
              await supabaseAdmin.from("scheduler_state").update({ automation_status: status } as never).eq("scheduler_name", name);
              return Response.json({ ok: true, scheduler_name: name, automation_status: status });
            }
            default:
              return Response.json({ error: "Unknown action" }, { status: 400 });
          }
        } catch (err: any) {
          console.error("[email/admin] error:", err);
          return Response.json({ error: err?.message || "error" }, { status: 500 });
        }
      },
    },
  },
});
