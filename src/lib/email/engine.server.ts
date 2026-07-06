// Server-only Email Automation Engine: monthly, cart, and manual campaigns.
// Handles the global pause switch, scheduler state, batching, retry, and logging.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { BATCH_SIZE, BATCH_PAUSE_MS, DB_PAGE_SIZE, sleep, getAdminEmail } from "./config.server";
import { sendOne } from "./sendgrid.server";
import {
  splitTemplates,
  pickRotatingIndex,
  renderMonthlyEmail,
  renderCartEmail,
  renderManualEmail,
  type ProductLite,
} from "./render.server";
import { recipientPages, type Audience, type Recipient } from "./audience.server";

// ----------------------------------------------------------------- state
export async function getSchedulerRow(name: string) {
  const { data } = await supabaseAdmin
    .from("scheduler_state")
    .select("*")
    .eq("scheduler_name", name)
    .maybeSingle();
  return data;
}

export async function isAutomationPaused(schedulerName: string): Promise<boolean> {
  const global = await getSchedulerRow("global");
  if (global?.automation_status === "paused") return true;
  const own = await getSchedulerRow(schedulerName);
  return own?.automation_status === "paused";
}

async function updateScheduler(name: string, patch: Record<string, any>) {
  await supabaseAdmin.from("scheduler_state").update(patch).eq("scheduler_name", name);
}

// ----------------------------------------------------------------- logging
async function logEvent(row: {
  campaign_id?: string | null;
  user_id?: string | null;
  email?: string | null;
  status: string;
  provider_message_id?: string | null;
  metadata?: Record<string, any>;
}) {
  await supabaseAdmin.from("email_logs").insert({
    campaign_id: row.campaign_id ?? null,
    user_id: row.user_id ?? null,
    email: row.email ?? null,
    status: row.status,
    provider_message_id: row.provider_message_id ?? null,
    metadata: row.metadata ?? {},
  });
}

// -------------------------------------------------- generic batched sender
type BuildHtml = (r: Recipient) => string;

async function sendToAudience(opts: {
  campaignId: string;
  audience: Audience;
  selectedUserIds?: string[];
  subject: string;
  buildHtml: BuildHtml;
}): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  let batch: Recipient[] = [];

  const flush = async () => {
    for (const r of batch) {
      const res = await sendOne({
        to: r.email,
        subject: opts.subject,
        html: opts.buildHtml(r),
        customArgs: { campaign_id: opts.campaignId, user_id: r.user_id },
      });
      if (res.ok) {
        sent++;
        await logEvent({
          campaign_id: opts.campaignId,
          user_id: r.user_id,
          email: r.email,
          status: "Delivered",
          provider_message_id: res.messageId,
        });
      } else {
        failed++;
        // Never abort the whole run — mark only the failed user, allow retry.
        await logEvent({
          campaign_id: opts.campaignId,
          user_id: r.user_id,
          email: r.email,
          status: "Failed",
          metadata: { error: res.error, http: res.status },
        });
      }
    }
    batch = [];
  };

  for await (const page of recipientPages(opts.audience, opts.selectedUserIds || [])) {
    for (const r of page) {
      batch.push(r);
      if (batch.length >= BATCH_SIZE) {
        await flush();
        await sleep(BATCH_PAUSE_MS); // throttle to prevent timeouts / rate limits
      }
    }
  }
  await flush();

  await supabaseAdmin
    .from("email_campaigns")
    .update({ sent_count: sent, failed_count: failed, status: failed && !sent ? "failed" : "sent" })
    .eq("id", opts.campaignId);

  return { sent, failed };
}

// ----------------------------------------------------------- product pick
async function getMonthlyTemplateText(usedIndexes: number[]): Promise<{ text: string; index: number }> {
  const { data } = await supabaseAdmin
    .from("email_templates")
    .select("template_content")
    .eq("template_type", "monthly")
    .order("created_at", { ascending: true });
  const all = (data || []).flatMap((r: any) => splitTemplates(r.template_content));
  if (all.length === 0) {
    return { text: "Discover our latest premium selections this month.", index: 0 };
  }
  const idx = pickRotatingIndex(all.length, usedIndexes);
  return { text: all[idx], index: idx };
}

async function getCartTemplateText(usedIndexes: number[]): Promise<{ text: string; index: number }> {
  const { data } = await supabaseAdmin
    .from("email_templates")
    .select("template_content")
    .eq("template_type", "cart")
    .order("created_at", { ascending: true });
  const all = (data || []).flatMap((r: any) => splitTemplates(r.template_content));
  if (all.length === 0) {
    return { text: "You left something in your selection — ready when you are.", index: 0 };
  }
  const idx = pickRotatingIndex(all.length, usedIndexes);
  return { text: all[idx], index: idx };
}

function comboKey(ids: string[]): string {
  return [...ids].sort().join("|");
}

async function pickMonthlyProducts(usedCombos: string[]): Promise<ProductLite[]> {
  const cols = "id, product_name, product_image, price, currency, category";
  // Previous calendar month window.
  const now = new Date();
  const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const startThis = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: recent } = await supabaseAdmin
    .from("products")
    .select(cols)
    .gte("created_at", startPrev)
    .lt("created_at", startThis)
    .order("created_at", { ascending: false })
    .limit(2);

  if (recent && recent.length >= 2) return recent as ProductLite[];

  // Fallback: random two, avoiding reused combos until all have rotated.
  const { data: all } = await supabaseAdmin.from("products").select(cols).limit(1000);
  const pool = (all || []) as ProductLite[];
  if (pool.length <= 2) return pool;

  const usedSet = new Set(usedCombos);
  let choice: ProductLite[] = [];
  for (let attempt = 0; attempt < 60; attempt++) {
    const a = Math.floor(Math.random() * pool.length);
    let b = Math.floor(Math.random() * pool.length);
    if (a === b) b = (b + 1) % pool.length;
    const pair = [pool[a], pool[b]];
    if (!usedSet.has(comboKey([pair[0].id, pair[1].id]))) {
      choice = pair;
      break;
    }
  }
  if (choice.length < 2) choice = [pool[0], pool[1]]; // all rotated — reset
  return choice;
}

// -------------------------------------------------------------- MONTHLY
export async function runMonthly(): Promise<{ skipped?: string; campaignId?: string; sent?: number; failed?: number }> {
  if (await isAutomationPaused("monthly")) return { skipped: "paused" };

  const state = await getSchedulerRow("monthly");
  const usedTemplates: number[] = Array.isArray(state?.used_template_indexes) ? state!.used_template_indexes : [];
  const usedCombos: string[] = Array.isArray(state?.used_product_combos) ? state!.used_product_combos : [];

  const products = await pickMonthlyProducts(usedCombos);
  const tpl = await getMonthlyTemplateText(usedTemplates);

  const { data: campaign, error } = await supabaseAdmin
    .from("email_campaigns")
    .insert({
      campaign_type: "monthly",
      title: "Monthly Showcase",
      body: tpl.text,
      audience: "all_users",
      template_type: "monthly",
      product_ids: products.map((p) => p.id),
      status: "sending",
    })
    .select("id")
    .single();
  if (error || !campaign) return { skipped: error?.message || "campaign insert failed" };

  const result = await sendToAudience({
    campaignId: campaign.id,
    audience: "all_users",
    subject: "New Arrivals from DE GREAT JAPHET",
    buildHtml: (r) =>
      renderMonthlyEmail({
        templateText: tpl.text,
        products,
        campaignId: campaign.id,
        userId: r.user_id,
        email: r.email,
      }),
  });

  // Advance rotation history (keep last 30 entries).
  const nextCombos = [...usedCombos, comboKey(products.map((p) => p.id))].slice(-30);
  const nextTemplates = [...usedTemplates, tpl.index].slice(-30);
  const now = new Date();
  const nextExec = new Date(now.getFullYear(), now.getMonth() + 1, 3).toISOString();
  await updateScheduler("monthly", {
    last_execution: now.toISOString(),
    next_execution: nextExec,
    used_product_combos: nextCombos,
    used_template_indexes: nextTemplates,
    current_template_index: tpl.index,
  });

  return { campaignId: campaign.id, ...result };
}

// --------------------------------------------------------------- CART
export async function runCart(): Promise<{ skipped?: string; campaignId?: string; sent?: number; failed?: number }> {
  if (await isAutomationPaused("cart")) return { skipped: "paused" };

  const cartState = await getSchedulerRow("cart");
  const usedTemplates: number[] = Array.isArray(cartState?.used_template_indexes) ? cartState!.used_template_indexes : [];
  const tpl = await getCartTemplateText(usedTemplates);

  const { data: campaign } = await supabaseAdmin
    .from("email_campaigns")
    .insert({
      campaign_type: "cart",
      title: "Cart Reminder",
      body: tpl.text,
      audience: "users_with_cart",
      template_type: "cart",
      status: "sending",
    })
    .select("id")
    .single();
  const campaignId = campaign?.id as string | undefined;

  let sent = 0;
  let failed = 0;
  let from = 0;

  while (true) {
    const { data: rows, error } = await supabaseAdmin
      .from("cart_email_progress")
      .select("id, user_id, current_product_index, cart_items")
      .range(from, from + DB_PAGE_SIZE - 1);
    if (error || !rows || rows.length === 0) break;

    for (const row of rows as any[]) {
      const items: any[] = Array.isArray(row.cart_items) ? row.cart_items : [];
      const productIds = items.map((it) => (typeof it === "string" ? it : it?.id)).filter(Boolean);
      if (productIds.length === 0) continue;

      // Resolve current index (wraps), skipping products removed from catalogue.
      let idx = ((row.current_product_index || 0) % productIds.length + productIds.length) % productIds.length;
      let product: ProductLite | null = null;
      for (let tries = 0; tries < productIds.length; tries++) {
        const pid = productIds[idx];
        const { data: p } = await supabaseAdmin
          .from("products")
          .select("id, product_name, product_image, price, currency, category")
          .eq("id", pid)
          .maybeSingle();
        if (p) { product = p as ProductLite; break; }
        idx = (idx + 1) % productIds.length; // removed — skip, continue sequence
      }

      // Look up the recipient email.
      const { data: cust } = await supabaseAdmin
        .from("customers")
        .select("email")
        .eq("user_id", row.user_id)
        .maybeSingle();

      const nextIdx = (idx + 1) % productIds.length;

      if (!product || !cust?.email) {
        await supabaseAdmin
          .from("cart_email_progress")
          .update({ current_product_index: nextIdx, last_sent_at: new Date().toISOString() })
          .eq("id", row.id);
        continue;
      }

      const res = await sendOne({
        to: cust.email,
        subject: "Still thinking it over? — DE GREAT JAPHET",
        html: renderCartEmail({
          templateText: tpl.text,
          product,
          campaignId,
          userId: row.user_id,
          email: cust.email,
        }),
        customArgs: campaignId ? { campaign_id: campaignId, user_id: row.user_id } : { user_id: row.user_id },
      });

      if (res.ok) {
        sent++;
        await logEvent({ campaign_id: campaignId, user_id: row.user_id, email: cust.email, status: "Delivered", provider_message_id: res.messageId });
      } else {
        failed++;
        await logEvent({ campaign_id: campaignId, user_id: row.user_id, email: cust.email, status: "Failed", metadata: { error: res.error } });
      }

      await supabaseAdmin
        .from("cart_email_progress")
        .update({ current_product_index: nextIdx, last_sent_at: new Date().toISOString() })
        .eq("id", row.id);

      if ((sent + failed) % BATCH_SIZE === 0) await sleep(BATCH_PAUSE_MS);
    }

    if (rows.length < DB_PAGE_SIZE) break;
    from += DB_PAGE_SIZE;
  }

  const nextTemplates = [...usedTemplates, tpl.index].slice(-30);
  const now = new Date();
  await updateScheduler("cart", {
    last_execution: now.toISOString(),
    next_execution: new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString(),
    used_template_indexes: nextTemplates,
    cart_reminder_index: tpl.index,
  });

  if (campaignId) {
    await supabaseAdmin
      .from("email_campaigns")
      .update({ sent_count: sent, failed_count: failed, status: failed && !sent ? "failed" : "sent" })
      .eq("id", campaignId);
  }

  return { campaignId, sent, failed };
}

// ------------------------------------------------------------- MANUAL
export async function runManualCampaign(campaignId: string): Promise<{ skipped?: string; sent?: number; failed?: number }> {
  const { data: campaign } = await supabaseAdmin
    .from("email_campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) return { skipped: "campaign not found" };

  await supabaseAdmin.from("email_campaigns").update({ status: "sending" }).eq("id", campaignId);

  const result = await sendToAudience({
    campaignId,
    audience: campaign.audience as Audience,
    selectedUserIds: campaign.selected_user_ids || [],
    subject: campaign.title || "A message from DE GREAT JAPHET",
    buildHtml: (r) =>
      renderManualEmail({
        title: campaign.title,
        body: campaign.body,
        bannerImage: campaign.banner_image,
        campaignId,
        userId: r.user_id,
        email: r.email,
      }),
  });
  return result;
}

// --------------------------------------------------------------- TEST
export async function sendTestEmail(opts: {
  kind: "monthly" | "cart" | "manual";
  to?: string;
  campaignId?: string;
}): Promise<{ ok: boolean; to?: string; error?: string }> {
  const to = opts.to || getAdminEmail();
  if (!to) return { ok: false, error: "No admin/test email configured" };

  let html = "";
  let subject = "[TEST] DE GREAT JAPHET";

  if (opts.kind === "monthly") {
    const products = await pickMonthlyProducts([]);
    const tpl = await getMonthlyTemplateText([]);
    subject = "[TEST] New Arrivals from DE GREAT JAPHET";
    html = renderMonthlyEmail({ templateText: tpl.text, products, email: to });
  } else if (opts.kind === "cart") {
    const tpl = await getCartTemplateText([]);
    const { data: p } = await supabaseAdmin
      .from("products")
      .select("id, product_name, product_image, price, currency, category")
      .limit(1)
      .maybeSingle();
    subject = "[TEST] Cart Reminder";
    html = renderCartEmail({
      templateText: tpl.text,
      product: (p as ProductLite) || { id: "x", product_name: "Sample Product", product_image: null, price: 0 },
      email: to,
    });
  } else {
    const { data: c } = opts.campaignId
      ? await supabaseAdmin.from("email_campaigns").select("*").eq("id", opts.campaignId).maybeSingle()
      : { data: null };
    subject = `[TEST] ${c?.title || "Campaign preview"}`;
    html = renderManualEmail({ title: c?.title, body: c?.body || "This is a test campaign.", bannerImage: c?.banner_image, email: to });
  }

  const res = await sendOne({ to, subject, html, customArgs: { test: "true" } });
  return res.ok ? { ok: true, to } : { ok: false, to, error: res.error };
}

// -------------------------------------------------------------- RETRY
export async function retryFailed(campaignId: string): Promise<{ retried: number; sent: number; failed: number }> {
  const { data: campaign } = await supabaseAdmin
    .from("email_campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) return { retried: 0, sent: 0, failed: 0 };

  const { data: failedLogs } = await supabaseAdmin
    .from("email_logs")
    .select("id, user_id, email")
    .eq("campaign_id", campaignId)
    .eq("status", "Failed");

  const rows = (failedLogs || []) as any[];
  let sent = 0;
  let failed = 0;

  for (const log of rows) {
    if (!log.email) continue;
    const html =
      campaign.campaign_type === "manual"
        ? renderManualEmail({ title: campaign.title, body: campaign.body, bannerImage: campaign.banner_image, campaignId, userId: log.user_id, email: log.email })
        : renderManualEmail({ title: campaign.title, body: campaign.body, campaignId, userId: log.user_id, email: log.email });

    const res = await sendOne({
      to: log.email,
      subject: campaign.title || "A message from DE GREAT JAPHET",
      html,
      customArgs: { campaign_id: campaignId, user_id: log.user_id || "", retry: "true" },
    });
    if (res.ok) {
      sent++;
      await supabaseAdmin.from("email_logs").update({ status: "Delivered", provider_message_id: res.messageId, event_at: new Date().toISOString() }).eq("id", log.id);
    } else {
      failed++;
      await supabaseAdmin.from("email_logs").update({ metadata: { error: res.error, retried: true }, event_at: new Date().toISOString() }).eq("id", log.id);
    }
    if ((sent + failed) % BATCH_SIZE === 0) await sleep(BATCH_PAUSE_MS);
  }

  return { retried: rows.length, sent, failed };
}
