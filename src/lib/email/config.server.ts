// Server-only configuration for the Email Automation Engine.
// Never import this from client/component code.

export const WHATSAPP_NUMBER = "2347066786626";

export function getPublicBaseUrl(): string {
  return (process.env.EMAIL_PUBLIC_BASE_URL || "https://de-great-japheth.lovable.app").replace(/\/$/, "");
}

export function getSendgridConfig() {
  return {
    apiKey: process.env.SENDGRID_API_KEY || "",
    fromEmail: process.env.SENDGRID_FROM_EMAIL || "no-reply@de-great-japheth.lovable.app",
    fromName: process.env.SENDGRID_FROM_NAME || "DE GREAT JAPHET",
  };
}

export function getCronSecret(): string {
  return process.env.EMAIL_CRON_SECRET || "";
}

export function getWebhookSecret(): string {
  return process.env.SENDGRID_WEBHOOK_SECRET || "";
}

export function getAdminEmail(): string {
  // Optional dedicated admin/test recipient; falls back to the from address.
  return process.env.ADMIN_EMAIL || process.env.SENDGRID_FROM_EMAIL || "";
}

// Batch tuning — process users in pages, send in throttled sub-batches.
export const BATCH_SIZE = 50;
export const BATCH_PAUSE_MS = 1500;
export const DB_PAGE_SIZE = 200;

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
