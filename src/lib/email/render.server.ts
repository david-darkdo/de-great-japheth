// Server-only template parsing + HTML rendering for marketing emails.
import { getPublicBaseUrl, WHATSAPP_NUMBER } from "./config.server";

export const TEMPLATE_DELIMITER = "=== TEMPLATE ===";

/** Split one bulk template_content field into many individual templates. */
export function splitTemplates(content: string): string[] {
  if (!content) return [];
  return content
    .split(TEMPLATE_DELIMITER)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Pick a template index avoiding immediate repetition. `used` is a rotation
 * history (most recent last). Returns the chosen index.
 */
export function pickRotatingIndex(count: number, used: number[]): number {
  if (count <= 0) return 0;
  if (count === 1) return 0;
  const last = used.length ? used[used.length - 1] : -1;
  let idx = Math.floor(Math.random() * count);
  let guard = 0;
  while (idx === last && guard < 20) {
    idx = Math.floor(Math.random() * count);
    guard++;
  }
  return idx;
}

type TrackType = "whatsapp" | "showroom" | "cart";

export function trackingUrl(opts: {
  type: TrackType;
  campaignId?: string | null;
  userId?: string | null;
  email?: string | null;
}): string {
  const base = getPublicBaseUrl();
  const p = new URLSearchParams();
  if (opts.campaignId) p.set("c", opts.campaignId);
  if (opts.userId) p.set("u", opts.userId);
  if (opts.email) p.set("e", opts.email);
  return `${base}/email/track/${opts.type}?${p.toString()}`;
}

export type ProductLite = {
  id: string;
  product_name: string;
  product_image: string | null;
  price: number | null;
  currency?: string | null;
  category?: string | null;
};

function money(p: ProductLite): string {
  if (p.price == null) return "";
  const sym = (p.currency || "NGN") === "USD" ? "$" : "₦";
  return `${sym}${Number(p.price).toLocaleString()}`;
}

function esc(s: string): string {
  return (s || "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string),
  );
}

function button(href: string, label: string, primary = true): string {
  const bg = primary ? "#c79f2e" : "#111827";
  const color = primary ? "#111827" : "#ffffff";
  return `<a href="${href}" style="display:inline-block;margin:6px 6px 0 0;padding:12px 22px;background:${bg};color:${color};text-decoration:none;border-radius:8px;font-weight:600;font-family:Arial,sans-serif;font-size:14px">${label}</a>`;
}

function productCard(p: ProductLite): string {
  const img = p.product_image
    ? `<img src="${esc(p.product_image)}" alt="${esc(p.product_name)}" width="260" style="width:100%;max-width:260px;border-radius:10px;display:block" />`
    : "";
  const price = money(p);
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 18px"><tr><td align="center">
    ${img}
    <div style="font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#111827;margin-top:10px">${esc(p.product_name)}</div>
    ${p.category ? `<div style="font-family:Arial,sans-serif;font-size:12px;color:#6b7280">${esc(p.category)}</div>` : ""}
    ${price ? `<div style="font-family:Arial,sans-serif;font-size:15px;color:#c79f2e;font-weight:700;margin-top:2px">${price}</div>` : ""}
  </td></tr></table>`;
}

function shell(inner: string, preview: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#ffffff">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preview)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff"><tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
      <tr><td align="center" style="padding:8px 0 20px">
        <div style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#111827;letter-spacing:1px">DE GREAT JAPHET</div>
        <div style="font-family:Arial,sans-serif;font-size:11px;color:#6b7280;letter-spacing:2px;text-transform:uppercase">Premium Building Materials &amp; Finishing</div>
      </td></tr>
      <tr><td style="padding:6px 18px 28px">${inner}</td></tr>
      <tr><td align="center" style="padding:18px 12px;border-top:1px solid #eee">
        <div style="font-family:Arial,sans-serif;font-size:11px;color:#9ca3af">DE GREAT JAPHET · You are receiving this as a registered customer.</div>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

/** Monthly marketing email: two products + template text + WhatsApp/Showroom buttons. */
export function renderMonthlyEmail(opts: {
  templateText: string;
  products: ProductLite[];
  campaignId?: string | null;
  userId?: string | null;
  email?: string | null;
  bannerImage?: string | null;
}): string {
  const waHref = trackingUrl({ type: "whatsapp", ...opts });
  const showroomHref = trackingUrl({ type: "showroom", ...opts });
  const banner = opts.bannerImage
    ? `<img src="${esc(opts.bannerImage)}" alt="" width="564" style="width:100%;border-radius:12px;margin-bottom:18px;display:block" />`
    : "";
  const text = esc(opts.templateText).replace(/\n/g, "<br/>");
  const cards = opts.products.map(productCard).join("");
  const inner = `${banner}
    <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#374151;margin-bottom:22px">${text}</div>
    ${cards}
    <div style="text-align:center;margin-top:10px">
      ${button(waHref, "Continue on WhatsApp", true)}
      ${button(showroomHref, "Visit Showroom", false)}
    </div>`;
  return shell(inner, opts.templateText.slice(0, 90));
}

/** Weekly cart reminder: single product + WhatsApp/Return to Cart buttons. */
export function renderCartEmail(opts: {
  templateText: string;
  product: ProductLite;
  campaignId?: string | null;
  userId?: string | null;
  email?: string | null;
}): string {
  const waHref = trackingUrl({ type: "whatsapp", ...opts });
  const cartHref = trackingUrl({ type: "cart", ...opts });
  const text = esc(opts.templateText).replace(/\n/g, "<br/>");
  const inner = `
    <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#374151;margin-bottom:22px">${text}</div>
    ${productCard(opts.product)}
    <div style="text-align:center;margin-top:10px">
      ${button(waHref, "Continue on WhatsApp", true)}
      ${button(cartHref, "Return to Cart", false)}
    </div>`;
  return shell(inner, opts.templateText.slice(0, 90));
}

/** Generic manual campaign email. */
export function renderManualEmail(opts: {
  title?: string | null;
  body?: string | null;
  bannerImage?: string | null;
  campaignId?: string | null;
  userId?: string | null;
  email?: string | null;
}): string {
  const waHref = trackingUrl({ type: "whatsapp", ...opts });
  const showroomHref = trackingUrl({ type: "showroom", ...opts });
  const banner = opts.bannerImage
    ? `<img src="${esc(opts.bannerImage)}" alt="" width="564" style="width:100%;border-radius:12px;margin-bottom:18px;display:block" />`
    : "";
  const title = opts.title
    ? `<div style="font-family:Georgia,serif;font-size:20px;font-weight:700;color:#111827;margin-bottom:12px">${esc(opts.title)}</div>`
    : "";
  const body = esc(opts.body || "").replace(/\n/g, "<br/>");
  const inner = `${banner}${title}
    <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#374151;margin-bottom:22px">${body}</div>
    <div style="text-align:center;margin-top:10px">
      ${button(waHref, "Continue on WhatsApp", true)}
      ${button(showroomHref, "Visit Showroom", false)}
    </div>`;
  return shell(inner, opts.title || (opts.body || "").slice(0, 90));
}

export function whatsappRedirect(): string {
  return `https://wa.me/${WHATSAPP_NUMBER}`;
}
