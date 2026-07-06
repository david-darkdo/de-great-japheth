// Server-only audience resolution. Uses the service-role admin client and
// pagination so we never load the whole user base into memory at once.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { DB_PAGE_SIZE } from "./config.server";

export type Recipient = { user_id: string; email: string };

export type Audience = "all_users" | "selected_users" | "users_with_orders" | "users_with_cart";

/**
 * Async generator yielding pages of recipients for a given audience.
 * Consumers iterate page-by-page to keep memory flat.
 */
export async function* recipientPages(
  audience: Audience,
  selectedUserIds: string[] = [],
): AsyncGenerator<Recipient[]> {
  if (audience === "selected_users") {
    for (let i = 0; i < selectedUserIds.length; i += DB_PAGE_SIZE) {
      const slice = selectedUserIds.slice(i, i + DB_PAGE_SIZE);
      const { data } = await supabaseAdmin
        .from("customers")
        .select("user_id, email")
        .in("user_id", slice);
      yield normalize(data);
    }
    return;
  }

  if (audience === "users_with_orders") {
    // Distinct user_ids that have placed orders, resolved to emails.
    const seen = new Set<string>();
    let from = 0;
    while (true) {
      const { data, error } = await supabaseAdmin
        .from("orders")
        .select("user_id")
        .not("user_id", "is", null)
        .range(from, from + DB_PAGE_SIZE - 1);
      if (error || !data || data.length === 0) break;
      const ids = data.map((r: any) => r.user_id).filter((id: string) => id && !seen.has(id));
      ids.forEach((id: string) => seen.add(id));
      if (ids.length) {
        const { data: custs } = await supabaseAdmin
          .from("customers")
          .select("user_id, email")
          .in("user_id", ids);
        yield normalize(custs);
      }
      if (data.length < DB_PAGE_SIZE) break;
      from += DB_PAGE_SIZE;
    }
    return;
  }

  if (audience === "users_with_cart") {
    let from = 0;
    while (true) {
      const { data, error } = await supabaseAdmin
        .from("cart_email_progress")
        .select("user_id, cart_items")
        .range(from, from + DB_PAGE_SIZE - 1);
      if (error || !data || data.length === 0) break;
      const ids = data
        .filter((r: any) => Array.isArray(r.cart_items) && r.cart_items.length > 0)
        .map((r: any) => r.user_id);
      if (ids.length) {
        const { data: custs } = await supabaseAdmin
          .from("customers")
          .select("user_id, email")
          .in("user_id", ids);
        yield normalize(custs);
      }
      if (data.length < DB_PAGE_SIZE) break;
      from += DB_PAGE_SIZE;
    }
    return;
  }

  // all_users
  let from = 0;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from("customers")
      .select("user_id, email")
      .not("email", "is", null)
      .range(from, from + DB_PAGE_SIZE - 1);
    if (error || !data || data.length === 0) break;
    yield normalize(data);
    if (data.length < DB_PAGE_SIZE) break;
    from += DB_PAGE_SIZE;
  }
}

function normalize(rows: any[] | null): Recipient[] {
  if (!rows) return [];
  return rows
    .filter((r) => r.user_id && r.email)
    .map((r) => ({ user_id: r.user_id as string, email: r.email as string }));
}
