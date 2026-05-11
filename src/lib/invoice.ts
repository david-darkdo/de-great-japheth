import jsPDF from "jspdf";
import type { CartItem } from "./cart";

const COMPANY = {
  name: "DE GREAT JAPHETH",
  tagline: "Interior Finishing & Building Materials",
  phone: "+234 706 678 6626",
  email: "info@degreatjapheth.com",
  address: "Lagos, Nigeria",
};

export type CustomerInfo = {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
};

async function urlToDataURL(url: string): Promise<{ dataUrl: string; format: "JPEG" | "PNG"; w: number; h: number } | null> {
  try {
    // Use Cloudinary transform if applicable to bound size and force jpg
    let fetchUrl = url;
    if (/res\.cloudinary\.com/.test(url)) {
      fetchUrl = url.replace("/upload/", "/upload/w_600,h_600,c_limit,q_auto,f_jpg/");
    }
    const res = await fetch(fetchUrl, { mode: "cors" });
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 600, h: 600 });
      img.src = dataUrl;
    });
    const format: "JPEG" | "PNG" = blob.type.includes("png") ? "PNG" : "JPEG";
    return { dataUrl, format, w: dims.w, h: dims.h };
  } catch {
    return null;
  }
}

export async function generateInvoicePDF(items: CartItem[], customer: CustomerInfo): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  // Header band
  doc.setFillColor(8, 12, 24);
  doc.rect(0, 0, pageW, 30, "F");
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 30, pageW, 1.2, "F");

  doc.setTextColor(212, 175, 55);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(COMPANY.name, margin, 14);
  doc.setTextColor(230, 230, 235);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(COMPANY.tagline, margin, 20);
  doc.text(`${COMPANY.phone}  •  ${COMPANY.email}`, margin, 25);

  // Invoice meta (right)
  const invoiceId = `DGJ-${Date.now().toString().slice(-8)}`;
  const dateStr = new Date().toLocaleDateString();
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`Invoice #: ${invoiceId}`, pageW - margin, 14, { align: "right" });
  doc.text(`Date: ${dateStr}`, pageW - margin, 20, { align: "right" });

  y = 40;

  // Customer block
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Customer", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 6;
  const cLines = [
    customer.full_name ? `Name:  ${customer.full_name}` : null,
    customer.email ? `Email: ${customer.email}` : null,
    customer.phone ? `Phone: ${customer.phone}` : null,
  ].filter(Boolean) as string[];
  if (cLines.length === 0) cLines.push("Guest");
  cLines.forEach((line) => { doc.text(line, margin, y); y += 5; });

  y += 4;
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(8, 12, 24);
  doc.text("Selected Products", margin, y);
  y += 4;

  // Pre-fetch images
  const imgs = await Promise.all(items.map((it) => (it.product_image ? urlToDataURL(it.product_image) : Promise.resolve(null))));

  const rowH = 36;
  const imgSize = 30;
  let totalAmount = 0;

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (y + rowH > pageH - 30) {
      doc.addPage();
      y = margin;
    }

    // Card bg
    doc.setFillColor(248, 248, 250);
    doc.roundedRect(margin, y, pageW - margin * 2, rowH, 2, 2, "F");

    const img = imgs[i];
    if (img) {
      try {
        const ratio = img.w / img.h || 1;
        let w = imgSize, h = imgSize;
        if (ratio > 1) h = imgSize / ratio; else w = imgSize * ratio;
        const ox = margin + 3 + (imgSize - w) / 2;
        const oy = y + 3 + (imgSize - h) / 2;
        doc.addImage(img.dataUrl, img.format, ox, oy, w, h, undefined, "FAST");
      } catch {}
    } else {
      doc.setFillColor(220, 220, 225);
      doc.rect(margin + 3, y + 3, imgSize, imgSize, "F");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("No image", margin + 3 + imgSize / 2, y + 3 + imgSize / 2, { align: "center" });
    }

    // Right text
    const tx = margin + imgSize + 9;
    doc.setTextColor(15, 18, 30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${i + 1}. ${it.product_name}`, tx, y + 8, { maxWidth: pageW - tx - margin - 4 });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 70);
    const meta: string[] = [];
    if (it.category) meta.push(`Category: ${it.category}`);
    if (it.item_code) meta.push(`Code: ${it.item_code}`);
    meta.push(`Qty: ${it.qty}`);
    doc.text(meta.join("  •  "), tx, y + 15);

    if (it.price != null) {
      const line = (it.price ?? 0) * it.qty;
      totalAmount += line;
      doc.setTextColor(140, 100, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`NGN ${Number(it.price).toLocaleString()} x ${it.qty} = NGN ${line.toLocaleString()}`, tx, y + 23);
    }

    y += rowH + 3;
  }

  // Total
  if (totalAmount > 0) {
    if (y + 14 > pageH - 30) { doc.addPage(); y = margin; }
    doc.setDrawColor(212, 175, 55);
    doc.line(pageW - margin - 70, y, pageW - margin, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(8, 12, 24);
    doc.text(`Estimated Total: NGN ${totalAmount.toLocaleString()}`, pageW - margin, y, { align: "right" });
    y += 6;
  }

  // Footer
  const fy = pageH - 22;
  doc.setFillColor(8, 12, 24);
  doc.rect(0, fy, pageW, 22, "F");
  doc.setTextColor(212, 175, 55);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Thank you for choosing ${COMPANY.name}`, pageW / 2, fy + 8, { align: "center" });
  doc.setTextColor(220, 220, 225);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("We supply and install premium finishing materials.", pageW / 2, fy + 14, { align: "center" });
  doc.text(`${COMPANY.address}  •  ${COMPANY.phone}`, pageW / 2, fy + 19, { align: "center" });

  return doc.output("blob");
}

export function buildWhatsAppText(items: CartItem[], invoiceFileName: string) {
  const lines: string[] = [];
  lines.push(`Hello ${COMPANY.name} 👋`);
  lines.push("Please find my selection attached as a PDF invoice.");
  lines.push("");
  items.forEach((it, i) => {
    lines.push(`${i + 1}. ${it.product_name} — Qty ${it.qty}${it.item_code ? ` (Code: ${it.item_code})` : ""}`);
  });
  lines.push("");
  lines.push(`Invoice file: ${invoiceFileName}`);
  return lines.join("\n");
}

export const WHATSAPP_NUMBER = "2347066786626";

export async function shareInvoice(items: CartItem[], customer: CustomerInfo): Promise<{ shared: boolean; downloaded: boolean; fileName: string }> {
  const blob = await generateInvoicePDF(items, customer);
  const fileName = `DE-GREAT-INVOICE-${Date.now()}.pdf`;
  const file = new File([blob], fileName, { type: "application/pdf" });
  const text = buildWhatsAppText(items, fileName);

  const nav: any = typeof navigator !== "undefined" ? navigator : null;
  if (nav && nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "DE GREAT JAPHETH Invoice", text });
      return { shared: true, downloaded: false, fileName };
    } catch {
      // user cancelled or failed — fall through to download
    }
  }

  // Fallback: download PDF + open WhatsApp chat with text
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);

  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text + "\n\n(Attach the downloaded PDF to this chat.)")}`;
  window.open(waUrl, "_blank");
  return { shared: false, downloaded: true, fileName };
}
