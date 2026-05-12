import { createFileRoute } from "@tanstack/react-router";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Item = {
  id?: string;
  product_name: string;
  category?: string | null;
  item_code?: string | null;
  product_image?: string | null;
  price?: number | null;
  qty: number;
};

function generateOrderCode() {
  const n = Math.floor(10000 + Math.random() * 90000);
  return `DGJ-${n}`;
}

async function fetchImageBytes(url: string): Promise<{ bytes: Uint8Array; type: "jpg" | "png" } | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const ct = (r.headers.get("content-type") || "").toLowerCase();
    const buf = new Uint8Array(await r.arrayBuffer());
    if (ct.includes("png")) return { bytes: buf, type: "png" };
    return { bytes: buf, type: "jpg" };
  } catch {
    return null;
  }
}

async function buildPdf(opts: {
  orderCode: string;
  customer: { name?: string | null; email?: string | null; phone?: string | null };
  items: Item[];
  totalEstimate: number;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const gold = rgb(0.78, 0.62, 0.18);
  const dark = rgb(0.08, 0.08, 0.12);
  const muted = rgb(0.4, 0.4, 0.46);

  let page = pdf.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  let y = height - 50;

  // Header
  page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: dark });
  page.drawText("DE GREAT JAFFET", { x: 40, y: height - 50, size: 20, font: fontBold, color: gold });
  page.drawText("Premium Building Materials & Finishing", { x: 40, y: height - 70, size: 9, font, color: rgb(0.85, 0.85, 0.85) });
  page.drawText(`Order ${opts.orderCode}`, { x: width - 180, y: height - 50, size: 14, font: fontBold, color: gold });
  page.drawText(new Date().toLocaleString(), { x: width - 180, y: height - 68, size: 8, font, color: rgb(0.85, 0.85, 0.85) });

  y = height - 120;

  // Customer block
  page.drawText("CUSTOMER", { x: 40, y, size: 9, font: fontBold, color: muted });
  y -= 14;
  page.drawText(opts.customer.name || "—", { x: 40, y, size: 11, font: fontBold, color: dark });
  y -= 13;
  page.drawText(opts.customer.email || "—", { x: 40, y, size: 9, font, color: dark });
  y -= 12;
  page.drawText(opts.customer.phone || "—", { x: 40, y, size: 9, font, color: dark });
  y -= 24;

  page.drawText("SELECTED ITEMS", { x: 40, y, size: 9, font: fontBold, color: muted });
  y -= 8;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.7, color: gold });
  y -= 18;

  for (let i = 0; i < opts.items.length; i++) {
    const it = opts.items[i];
    if (y < 140) {
      page = pdf.addPage([595, 842]);
      y = height - 60;
    }

    // Image
    let imgDrawn = false;
    if (it.product_image) {
      const data = await fetchImageBytes(it.product_image);
      if (data) {
        try {
          const img = data.type === "png" ? await pdf.embedPng(data.bytes) : await pdf.embedJpg(data.bytes);
          const dims = img.scaleToFit(70, 70);
          page.drawImage(img, { x: 40, y: y - 70, width: dims.width, height: dims.height });
          imgDrawn = true;
        } catch {}
      }
    }

    const tx = imgDrawn ? 125 : 40;
    page.drawText(`${i + 1}. ${it.product_name}`, { x: tx, y: y - 8, size: 11, font: fontBold, color: dark });
    const meta = [it.category, it.item_code].filter(Boolean).join(" · ");
    if (meta) page.drawText(meta, { x: tx, y: y - 22, size: 8, font, color: muted });
    page.drawText(`Quantity: ${it.qty}`, { x: tx, y: y - 36, size: 9, font, color: dark });
    if (it.price != null) {
      page.drawText(`Unit: NGN ${Number(it.price).toLocaleString()}`, { x: tx + 110, y: y - 36, size: 9, font, color: dark });
      page.drawText(`Subtotal: NGN ${(Number(it.price) * it.qty).toLocaleString()}`, { x: tx + 240, y: y - 36, size: 9, font: fontBold, color: gold });
    }

    y -= 90;
    page.drawLine({ start: { x: 40, y: y + 8 }, end: { x: width - 40, y: y + 8 }, thickness: 0.3, color: rgb(0.85, 0.85, 0.85) });
  }

  if (y < 100) { page = pdf.addPage([595, 842]); y = height - 60; }
  y -= 10;
  page.drawText(`Items: ${opts.items.reduce((s, x) => s + x.qty, 0)}`, { x: 40, y, size: 10, font, color: dark });
  if (opts.totalEstimate > 0) {
    page.drawText(`Estimated Total: NGN ${opts.totalEstimate.toLocaleString()}`, { x: width - 240, y, size: 12, font: fontBold, color: gold });
  }
  y -= 36;
  page.drawText("This is an internal record. Final pricing confirmed via WhatsApp.", { x: 40, y, size: 8, font, color: muted });

  return await pdf.save();
}

export const Route = createFileRoute("/api/orders/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = request.headers.get("authorization") || "";
          const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
          if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

          // Verify the user token using the public client
          const userClient = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } },
          );
          const { data: userData, error: userErr } = await userClient.auth.getUser(token);
          if (userErr || !userData.user) return Response.json({ error: "Invalid session" }, { status: 401 });
          const user = userData.user;

          const body = await request.json();
          const items: Item[] = Array.isArray(body?.items) ? body.items : [];
          if (items.length === 0) return Response.json({ error: "Cart is empty" }, { status: 400 });

          // Pull customer profile
          const { data: customer } = await supabaseAdmin
            .from("customers")
            .select("full_name, phone, email")
            .eq("user_id", user.id)
            .maybeSingle();

          const customerInfo = {
            name: customer?.full_name ?? (user.user_metadata as any)?.full_name ?? null,
            email: customer?.email ?? user.email ?? null,
            phone: customer?.phone ?? (user.user_metadata as any)?.phone ?? null,
          };

          // Generate unique order code (retry on conflict)
          let orderCode = generateOrderCode();
          for (let i = 0; i < 5; i++) {
            const { data: existing } = await supabaseAdmin
              .from("orders").select("id").eq("order_code", orderCode).maybeSingle();
            if (!existing) break;
            orderCode = generateOrderCode();
          }

          const totalEstimate = items.reduce((s, x) => s + (Number(x.price) || 0) * (x.qty || 0), 0);
          const itemCount = items.reduce((s, x) => s + (x.qty || 0), 0);

          // Build PDF
          const pdfBytes = await buildPdf({ orderCode, customer: customerInfo, items, totalEstimate });
          const path = `${new Date().getFullYear()}/${orderCode}.pdf`;
          const { error: upErr } = await supabaseAdmin.storage
            .from("order-pdfs")
            .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
          if (upErr) console.error("[orders.create] pdf upload error:", upErr);

          // Insert order
          const { error: insErr } = await supabaseAdmin.from("orders").insert({
            order_code: orderCode,
            user_id: user.id,
            customer_email: customerInfo.email,
            customer_name: customerInfo.name,
            customer_phone: customerInfo.phone,
            items: items as any,
            item_count: itemCount,
            total_estimate: totalEstimate || null,
            pdf_path: upErr ? null : path,
            whatsapp_status: "sent",
          });
          if (insErr) {
            console.error("[orders.create] insert error:", insErr);
            return Response.json({ error: insErr.message }, { status: 500 });
          }

          // Activity log
          await supabaseAdmin.from("activity_logs").insert({
            action: "whatsapp_order_created",
            user_email: customerInfo.email,
            details: { order_code: orderCode, item_count: itemCount },
          });

          return Response.json({ order_code: orderCode });
        } catch (err: any) {
          console.error("[orders.create] exception:", err);
          return Response.json({ error: err.message || "Server error" }, { status: 500 });
        }
      },
    },
  },
});
