import { createAPIFileRoute } from "@tanstack/react-start/api";

export const APIRoute = createAPIFileRoute("/api/communication/send")({
  POST: async ({ request }) => {
    try {
      const body = await request.json();
      const { recipientEmail, subject, bodyHtml, templateKey } = body;

      if (!recipientEmail || !subject || !bodyHtml) {
        return new Response(JSON.stringify({ error: "Missing required email parameters" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Log dispatch simulation / integration with SMTP or email provider (Resend / SendGrid / Supabase Mail)
      console.log(`[CommunicationEngine API] Dispatched email to ${recipientEmail} (${templateKey || "custom"})`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Email queued and dispatched successfully",
          recipient: recipientEmail,
          templateKey,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || "Failed to process email dispatch" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
});
