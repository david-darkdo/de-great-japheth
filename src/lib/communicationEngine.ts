import { supabase } from "@/integrations/supabase/client";
import { getProductUrl, getPublicUrl } from "@/lib/url";

export type TemplateKey =
  | "welcome"
  | "collection_reminder"
  | "abandoned_collection"
  | "monthly_newsletter"
  | "holiday_campaign"
  | "manual_campaign"
  | "system_notification";

export interface SendEmailPayload {
  templateKey: TemplateKey;
  recipientEmail: string;
  recipientId?: string;
  variables?: Record<string, string>;
  campaignId?: string;
  fromEmail?: string;
  fromName?: string;
  metadata?: Record<string, any>;
}

export interface EmailTemplate {
  id?: string;
  key: TemplateKey;
  name: string;
  subject: string;
  title?: string;
  body_html: string;
  body_text?: string;
  button_text?: string;
  button_link?: string;
  footer_text?: string;
  banner_url?: string;
  variables?: string[];
  updated_at?: string;
}

export interface EmailLog {
  id: string;
  user_id?: string;
  recipient_email: string;
  template_key: string;
  campaign_id?: string;
  subject: string;
  status: "sent" | "delivered" | "opened" | "failed" | "pending";
  error_message?: string;
  opened_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    key: "welcome",
    name: "Welcome Email",
    subject: "Welcome to DE GREAT JAPHET — Luxury Building Finishing",
    title: "Welcome to DE GREAT JAPHET",
    banner_url: "/assets/email_welcome_banner.jpg",
    button_text: "Explore Showroom Catalog",
    button_link: "/showroom",
    footer_text: "DE GREAT JAPHET • Quality & Luxury Architectural Finishing",
    body_html: `<p style="line-height: 1.6; color: #cccccc;">Thank you for creating an account with <strong>DE GREAT JAPHET</strong> — your premier supplier and installer of luxury tiles, armored security doors, sanitary ware, and architectural finishing in Nigeria.</p><p style="line-height: 1.6; color: #cccccc;">Browse our catalog and create your custom project collection to receive direct estimates and WhatsApp consultation.</p>`
  },
  {
    key: "collection_reminder",
    name: "Collection Reminder (24h)",
    subject: "Your Selected Items Are Saved — Request Your Quote",
    title: "Your Project Collection is Saved",
    banner_url: "/assets/email_collection_banner.jpg",
    button_text: "View Saved Collection & Get Quote",
    button_link: "/cart",
    footer_text: "DE GREAT JAPHET Customer Support",
    body_html: `<p style="line-height: 1.6; color: #cccccc;">You recently saved building materials to your project collection. Our management team is ready to verify inventory, calculate logistics, and issue your official quote.</p>`
  },
  {
    key: "abandoned_collection",
    name: "Abandoned Collection (72h)",
    subject: "Still Planning Your Build? Direct Support from Showroom Manager",
    title: "Complete Your Architectural Finishing",
    banner_url: "/assets/email_collection_banner.jpg",
    button_text: "Chat with Showroom Manager",
    button_link: "/contact",
    footer_text: "DE GREAT JAPHET Executive Sales Team",
    body_html: `<p style="color: #cccccc; line-height: 1.6;">Don't let your architectural vision wait. Speak directly with our head of sales on WhatsApp to review your tile measurements or custom door specifications.</p>`
  },
  {
    key: "monthly_newsletter",
    name: "Monthly Newsletter",
    subject: "DE GREAT JAPHET Monthly — New Arrivals & Architectural Trends",
    title: "Exclusive Monthly Catalog Updates",
    banner_url: "/assets/email_newsletter_banner.jpg",
    button_text: "Browse New Arrivals",
    button_link: "/showroom",
    footer_text: "DE GREAT JAPHET Monthly Digest",
    body_html: `<p style="color: #cccccc; line-height: 1.6;">Discover our newest arrivals in Spanish ceramic tiles, Turkish armored security doors, and high-end bathroom fixtures for modern residential and commercial builds.</p>`
  },
  {
    key: "holiday_campaign",
    name: "Holiday Special Campaign",
    subject: "Exclusive Holiday Offers on Luxury Building Finishing",
    title: "Season's Greetings from DE GREAT JAPHET!",
    banner_url: "/assets/email_welcome_banner.jpg",
    button_text: "Claim Holiday Discount",
    button_link: "/showroom",
    footer_text: "DE GREAT JAPHET Holiday Special",
    body_html: `<p style="color: #cccccc; line-height: 1.6;">Celebrate the season with special promotional rates on complete building finishing packages, security doors, and imported tiles.</p>`
  },
  {
    key: "manual_campaign",
    name: "Manual Campaign",
    subject: "Direct Communication from DE GREAT JAPHET",
    title: "Special Update from Management",
    banner_url: "/assets/email_welcome_banner.jpg",
    button_text: "Visit DE GREAT JAPHET",
    button_link: "/showroom",
    footer_text: "DE GREAT JAPHET Customer Operations",
    body_html: `<p style="color: #cccccc; line-height: 1.6;">Thank you for choosing DE GREAT JAPHET for your architectural finishing needs.</p>`
  },
  {
    key: "system_notification",
    name: "System Notification",
    subject: "Update Regarding Your DE GREAT JAPHET Order",
    title: "Important System Notification",
    banner_url: "/assets/email_welcome_banner.jpg",
    button_text: "View Order Details",
    button_link: "/orders",
    footer_text: "DE GREAT JAPHET Customer Operations",
    body_html: `<p style="color: #cccccc; line-height: 1.6;">Hello {{customer_name}}, {{message_content}}</p>`
  }
];

export class CommunicationEngine {
  static async getTemplates(): Promise<EmailTemplate[]> {
    const { data } = await supabase.from("email_templates").select("*").order("name");
    if (data && data.length > 0) return data as EmailTemplate[];

    // Seed default templates if database table is empty
    for (const tpl of DEFAULT_TEMPLATES) {
      await supabase.from("email_templates").upsert(tpl, { onConflict: "key" });
    }
    const { data: seeded } = await supabase.from("email_templates").select("*").order("name");
    return (seeded as EmailTemplate[]) || DEFAULT_TEMPLATES;
  }

  static async getTemplate(key: TemplateKey): Promise<EmailTemplate | null> {
    const { data } = await supabase.from("email_templates").select("*").eq("key", key).maybeSingle();
    if (data) return data as EmailTemplate;
    return DEFAULT_TEMPLATES.find(t => t.key === key) || null;
  }

  static async updateTemplate(key: TemplateKey, updates: Partial<EmailTemplate>): Promise<boolean> {
    const { error } = await supabase.from("email_templates").upsert({
      key,
      name: updates.name,
      subject: updates.subject,
      title: updates.title,
      body_html: updates.body_html,
      button_text: updates.button_text,
      button_link: updates.button_link,
      footer_text: updates.footer_text,
      banner_url: updates.banner_url,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });
    return !error;
  }

  static async getLogs(): Promise<EmailLog[]> {
    const { data } = await supabase.from("email_logs").select("*").order("created_at", { ascending: false }).limit(100);
    return (data as EmailLog[]) || [];
  }

  static interpolate(text: string, variables: Record<string, string>): string {
    let result = text || "";
    const defaultVars: Record<string, string> = {
      shop_url: getPublicUrl("/showroom"),
      home_url: getPublicUrl("/"),
      banner_url: "/assets/email_welcome_banner.jpg",
      ...variables,
    };

    for (const [k, v] of Object.entries(defaultVars)) {
      const reg = new RegExp(`{{\\s*${k}\\s*}}`, "g");
      result = result.replace(reg, v || "");
    }
    return result;
  }

  static renderTemplateHtml(template: Partial<EmailTemplate>, vars: Record<string, string> = {}): string {
    const bannerUrl = template.banner_url || "/assets/email_welcome_banner.jpg";
    const title = template.title || "DE GREAT JAPHET Notification";
    const bodyHtml = template.body_html || "";
    const buttonText = template.button_text || "";
    const buttonLink = template.button_link ? getPublicUrl(template.button_link) : getPublicUrl("/showroom");
    const footerText = template.footer_text || "DE GREAT JAPHET • Quality & Luxury Architectural Finishing";

    const bannerBlock = bannerUrl ? `<img src="${bannerUrl}" alt="Header Banner" style="width: 100%; max-height: 220px; object-fit: cover; border-radius: 8px; margin-bottom: 20px; display: block;" />` : "";
    const buttonBlock = buttonText ? `<div style="text-align: center; margin: 28px 0;"><a href="${buttonLink}" style="background: linear-gradient(135deg, #d4af37 0%, #b8860b 100%); color: #000000; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; display: inline-block;">${buttonText}</a></div>` : "";

    const rawFullHtml = `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #111111; color: #f5f5f5; padding: 24px; border-radius: 12px; border: 1px solid #333333;">${bannerBlock}<h2 style="color: #d4af37; margin-top: 0;">${title}</h2>${bodyHtml}${buttonBlock}<p style="font-size: 12px; color: #777777; text-align: center; margin-top: 24px;">${footerText}</p></div>`;

    return this.interpolate(rawFullHtml, vars);
  }

  static async send(payload: SendEmailPayload): Promise<{ success: boolean; logId?: string; messageId?: string; error?: string }> {
    try {
      const template = await this.getTemplate(payload.templateKey);
      const rawSubject = payload.metadata?.customSubject || template?.subject || "Notification from DE GREAT JAPHET";

      const vars = {
        customer_name: payload.recipientEmail.split("@")[0],
        banner_url: template?.banner_url || "/assets/email_welcome_banner.jpg",
        ...payload.variables,
      };

      const finalSubject = this.interpolate(rawSubject, vars);
      let finalBody = payload.metadata?.customBodyHtml;

      if (!finalBody && template) {
        finalBody = this.renderTemplateHtml(template, vars);
      } else if (!finalBody) {
        finalBody = `<p>Hello {{customer_name}}, thank you for visiting DE GREAT JAPHET.</p>`;
      }

      let sendSuccess = false;
      let errorMsg: string | undefined;
      let messageId: string | undefined;

      try {
        const res = await fetch("/api/communication/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientEmail: payload.recipientEmail,
            subject: finalSubject,
            bodyHtml: finalBody,
            templateKey: payload.templateKey,
            fromEmail: payload.fromEmail,
            fromName: payload.fromName,
          }),
        });

        const json = await res.json().catch(() => ({}));
        if (res.ok && json.success) {
          sendSuccess = true;
          messageId = json.messageId;
        } else {
          errorMsg = json.error || `SendGrid HTTP ${res.status}`;
          messageId = json.messageId;
        }
      } catch (err: any) {
        errorMsg = err.message || "Network request error";
      }

      const { data: log } = await supabase.from("email_logs").insert({
        user_id: payload.recipientId || null,
        recipient_email: payload.recipientEmail,
        template_key: payload.templateKey,
        campaign_id: payload.campaignId || "manual",
        subject: finalSubject,
        status: sendSuccess ? "sent" : "failed",
        error_message: errorMsg || null,
        metadata: {
          provider: "sendgrid",
          message_id: messageId || null,
          delivery_timestamp: new Date().toISOString(),
          ...payload.metadata,
        },
      }).select("id").maybeSingle();

      return { success: sendSuccess, logId: log?.id, messageId, error: errorMsg };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async triggerWelcome(email: string, userId?: string, name?: string): Promise<void> {
    await this.send({
      templateKey: "welcome",
      recipientEmail: email,
      recipientId: userId,
      variables: { customer_name: name || email.split("@")[0] },
    });
  }

  static async triggerCollectionReminder(email: string, collectionUrl: string, userId?: string): Promise<void> {
    await this.send({
      templateKey: "collection_reminder",
      recipientEmail: email,
      recipientId: userId,
      variables: { collection_url: collectionUrl },
    });
  }
}
