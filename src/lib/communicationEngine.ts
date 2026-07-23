import { supabase } from "@/integrations/supabase/client";
import { getProductUrl, getPublicUrl } from "@/lib/url";

export type TemplateKey =
  | "welcome"
  | "collection_reminder"
  | "abandoned_collection"
  | "monthly_newsletter"
  | "holiday_christmas"
  | "holiday_newyear"
  | "manual_campaign"
  | "system_notification";

export interface SendEmailPayload {
  templateKey: TemplateKey;
  recipientEmail: string;
  recipientId?: string;
  variables?: Record<string, string>;
  campaignId?: string;
  metadata?: Record<string, any>; // AI compatible: AI recommendations, subject lines, personalized tags
}

export interface EmailTemplate {
  id: string;
  key: TemplateKey;
  name: string;
  subject: string;
  body_html: string;
  body_text?: string;
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

/**
 * Centralized Communication Engine
 * Every email flows through this single architecture.
 */
export class CommunicationEngine {
  /**
   * Fetch editable template from Supabase database
   */
  static async getTemplate(key: TemplateKey): Promise<EmailTemplate | null> {
    const { data } = await supabase
      .from("email_templates")
      .select("*")
      .eq("key", key)
      .maybeSingle();
    return data as EmailTemplate | null;
  }

  /**
   * Process dynamic variables into template HTML & Subject
   */
  static interpolate(text: string, variables: Record<string, string>): string {
    let result = text;
    const defaultVars: Record<string, string> = {
      shop_url: getPublicUrl("/showroom"),
      home_url: getPublicUrl("/"),
      ...variables,
    };

    for (const [k, v] of Object.entries(defaultVars)) {
      const reg = new RegExp(`{{\\s*${k}\\s*}}`, "g");
      result = result.replace(reg, v || "");
    }
    return result;
  }

  /**
   * Unified Send Email Engine
   */
  static async send(payload: SendEmailPayload): Promise<{ success: boolean; logId?: string; error?: string }> {
    try {
      const template = await this.getTemplate(payload.templateKey);
      const rawSubject = template?.subject || "Notification from DE GREAT JAPHET";
      const rawBody = template?.body_html || "<p>Hello {{customer_name}}, thank you for visiting De Great Japhet.</p>";

      const vars = {
        customer_name: payload.recipientEmail.split("@")[0],
        ...payload.variables,
      };

      const finalSubject = this.interpolate(rawSubject, vars);
      const finalBody = this.interpolate(rawBody, vars);

      // Attempt sending via server API endpoint or fallback logging
      let sendSuccess = true;
      let errorMsg: string | undefined;

      try {
        const res = await fetch("/api/communication/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientEmail: payload.recipientEmail,
            subject: finalSubject,
            bodyHtml: finalBody,
            templateKey: payload.templateKey,
          }),
        });
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          errorMsg = errJson.error || `HTTP ${res.status}`;
        }
      } catch (err: any) {
        errorMsg = err.message || "Network send error";
      }

      // Record in Delivery History (email_logs) — AI Compatible
      const { data: log, error: logErr } = await supabase
        .from("email_logs")
        .insert({
          user_id: payload.recipientId || null,
          recipient_email: payload.recipientEmail,
          template_key: payload.templateKey,
          campaign_id: payload.campaignId || null,
          subject: finalSubject,
          status: sendSuccess ? "sent" : "failed",
          error_message: errorMsg || null,
          metadata: {
            ai_compatible: true,
            engine_version: "2.0",
            vars_used: vars,
            ...payload.metadata,
          },
        })
        .select("id")
        .single();

      if (logErr) {
        console.warn("Failed to write email_log:", logErr);
      }

      return {
        success: sendSuccess,
        logId: log?.id,
        error: errorMsg,
      };
    } catch (err: any) {
      console.error("CommunicationEngine.send error:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Helper: Trigger automatic Welcome email on signup
   */
  static async triggerWelcome(email: string, userId?: string, name?: string): Promise<void> {
    await this.send({
      templateKey: "welcome",
      recipientEmail: email,
      recipientId: userId,
      variables: {
        customer_name: name || email.split("@")[0],
      },
    });
  }

  /**
   * Helper: Trigger automatic Collection Reminder (24h)
   */
  static async triggerCollectionReminder(email: string, collectionUrl: string, userId?: string): Promise<void> {
    await this.send({
      templateKey: "collection_reminder",
      recipientEmail: email,
      recipientId: userId,
      variables: {
        collection_url: collectionUrl,
      },
    });
  }
}
