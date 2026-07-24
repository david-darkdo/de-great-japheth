import { createFileRoute } from "@tanstack/react-router";

function getEnvVar(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env && process.env[name]) {
    return process.env[name];
  }
  if (typeof import.meta !== "undefined" && (import.meta as any).env && (import.meta as any).env[name]) {
    return (import.meta as any).env[name];
  }
  return undefined;
}

export const Route = createFileRoute("/api/communication/send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { recipientEmail, subject, bodyHtml, bodyText, templateKey, fromEmail, fromName } = body;

          if (!recipientEmail || !subject || !bodyHtml) {
            return Response.json(
              { error: "Missing required parameters (recipientEmail, subject, bodyHtml)" },
              { status: 400 }
            );
          }

          // Retrieve SendGrid API Key & Verified Sender Email from environment
          const apiKey =
            getEnvVar("SENDGRID_API_KEY") ||
            getEnvVar("VITE_SENDGRID_API_KEY");

          const senderEmail =
            fromEmail ||
            getEnvVar("SENDGRID_FROM_EMAIL") ||
            getEnvVar("SENDGRID_SENDER_EMAIL") ||
            getEnvVar("VITE_SENDGRID_FROM_EMAIL") ||
            "greatjaphethenterprises@gmail.com";

          const senderName = fromName || "DE GREAT JAPHET";

          if (!apiKey) {
            return Response.json(
              {
                error: "SENDGRID_API_KEY environment variable is missing on server/Vercel.",
                provider: "sendgrid",
                status: "failed",
              },
              { status: 500 }
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
            reply_to: {
              email: senderEmail,
              name: `${senderName} Support`,
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
            return Response.json({
              success: true,
              provider: "sendgrid",
              status: "sent",
              messageId,
              recipient: recipientEmail,
              sender: senderEmail,
              templateKey,
            });
          } else {
            const errorText = await sgRes.text().catch(() => "Unknown SendGrid Error");
            return Response.json(
              {
                error: `SendGrid HTTP ${sgRes.status}: ${errorText}`,
                provider: "sendgrid",
                status: "failed",
                messageId,
              },
              { status: sgRes.status }
            );
          }
        } catch (err: any) {
          return Response.json(
            { error: err.message || "Failed to deliver email via SendGrid" },
            { status: 500 }
          );
        }
      },
    },
  },
});
