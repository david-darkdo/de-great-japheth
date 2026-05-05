import { createFileRoute } from "@tanstack/react-router";

async function sha1Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const Route = createFileRoute("/api/upload-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
          const apiKey = process.env.CLOUDINARY_API_KEY;
          const apiSecret = process.env.CLOUDINARY_API_SECRET;

          if (!cloudName || !apiKey || !apiSecret) {
            console.error("[upload-image] Missing Cloudinary env vars");
            return Response.json(
              { error: "Cloudinary not configured" },
              { status: 500 },
            );
          }

          const incoming = await request.formData();
          const file = incoming.get("file");
          if (!(file instanceof File) || file.size === 0) {
            return Response.json({ error: "No file provided" }, { status: 400 });
          }

          console.log("[upload-image] received file:", file.name, file.size);

          const timestamp = Math.floor(Date.now() / 1000).toString();
          // Signed upload — sign only `timestamp` (no upload_preset).
          const signature = await sha1Hex(`timestamp=${timestamp}${apiSecret}`);

          const fd = new FormData();
          fd.append("file", file);
          fd.append("api_key", apiKey);
          fd.append("timestamp", timestamp);
          fd.append("signature", signature);

          const res = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            { method: "POST", body: fd },
          );

          const json: any = await res.json();
          if (!res.ok) {
            console.error("[upload-image] Cloudinary error:", json);
            return Response.json(
              { error: json?.error?.message || "Upload failed" },
              { status: 500 },
            );
          }

          console.log("[upload-image] uploaded:", json.secure_url);
          return Response.json({ url: json.secure_url });
        } catch (err) {
          console.error("[upload-image] exception:", err);
          return Response.json(
            { error: (err as Error).message || "Server error" },
            { status: 500 },
          );
        }
      },
    },
  },
});
