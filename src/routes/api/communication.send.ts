import { createAPIFileRoute } from "@tanstack/react-start/api";

export const APIRoute = createAPIFileRoute("/api/communication/send")({
  POST: async ({ request }) => {
    try {
      const body = await request.json();
      const { recipientEmail, subject, bodyHtml, bodyText, templateKey, fromEmail, fromName } = body;

      if (!recipientEmail || !subject || !bodyHtml) {
        return new Response(
          JSON.stringify({ error: "Missing required parameters (recipientEmail, subject, bodyHtml)" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Retrieve SendGrid API Key & Verified Sender Email from environment
      const apiKey = process.env.SENDGRID_API_KEY || (import.meta as any).env?.VITE_SENDGRID_API_KEY;
      const senderEmail =
        fromEmail ||
        process.env.SENDGRID_FROM_EMAIL ||
        process.env.SENDGRID_SENDER_EMAIL ||
        (import.meta as any).env?.VITE_SENDGRID_FROM_EMAIL ||
        "info@degreatjaphet.com";
      const senderName = fromName || "DE GREAT JAPHET";

      if (!apiKey) {
        return new Response(
          JSON.stringify({
            error: "SENDGRID_API_KEY environment variable is missing on Vercel/server.",
            provider: "sendgrid",
            status: "failed",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // SendGrid v3 Mail Send Payload
      const payload = {
        personalizations: [
          {
            to: [{ email: recipientEmail }],
          },
        ],
        from: {
          email: senderEmail,
          name: senderName,
        },
        subject: subject,
        content: [
          { type: "text/html", value: bodyHtml },
          { type: "text/plain", value: bodyText || bodyHtml.replace(/<[^>]*>/g, "") },
        ],
      };

      const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const messageId = sgRes.headers.get("x-message-id") || `sg-${Date.now()}`;

      if (sgRes.status >= 200 && sgRes.status < 300) {
        return new Response(
          JSON.stringify({
            success: true,
            provider: "sendgrid",
            status: "sent",
            messageId,
            recipient: recipientEmail,
            sender: senderEmail,
            templateKey,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      } else {
        const errorText = await sgRes.text().catch(() => "Unknown SendGrid Error");
        return new Response(
          JSON.stringify({
            error: `SendGrid HTTP ${sgRes.status}: ${errorText}`,
            provider: "sendgrid",
            status: "failed",
            messageId,
          }),
          {
            status: sgRes.status,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: err.message || "Failed to deliver email via SendGrid" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
});
