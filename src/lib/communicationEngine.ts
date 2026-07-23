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
  fromEmail?: string;
  fromName?: string;
  metadata?: Record<string, any>;
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
 * Centralized Customer Communication Engine with SendGrid v3 Integration
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
   * Unified Send Email Engine via SendGrid API
   */
  static async send(payload: SendEmailPayload): Promise<{ success: boolean; logId?: string; messageId?: string; error?: string }> {
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

      // Record in Delivery History (email_logs)
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
            provider: "sendgrid",
            message_id: messageId || null,
            delivery_timestamp: new Date().toISOString(),
            engine_version: "2.0-sendgrid",
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
        messageId,
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
