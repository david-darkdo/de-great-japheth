import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function getEnvVar(name: string): string | undefined {
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name];
  }
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[name]) {
    return import.meta.env[name];
  }
  return undefined;
}

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
          const incoming = await request.formData();
          const file = incoming.get("file");
          if (!(file instanceof File) || file.size === 0) {
            return Response.json({ error: "No file provided" }, { status: 400 });
          }

          console.log("[upload-image] received file:", file.name, file.size);

          // 1. Try Cloudinary if environment variables are present
          const cloudName =
            getEnvVar("CLOUDINARY_CLOUD_NAME") ||
            getEnvVar("VITE_CLOUDINARY_CLOUD_NAME");

          const apiKey =
            getEnvVar("CLOUDINARY_API_KEY") ||
            getEnvVar("VITE_CLOUDINARY_API_KEY");

          const apiSecret =
            getEnvVar("CLOUDINARY_API_SECRET") ||
            getEnvVar("VITE_CLOUDINARY_API_SECRET");

          if (cloudName && apiKey && apiSecret) {
            try {
              const timestamp = Math.floor(Date.now() / 1000).toString();
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
              if (res.ok && json?.secure_url) {
                console.log("[upload-image] uploaded to Cloudinary:", json.secure_url);
                return Response.json({ url: json.secure_url });
              }
              console.warn("[upload-image] Cloudinary upload warning, falling back to Supabase Storage:", json);
            } catch (cErr) {
              console.warn("[upload-image] Cloudinary exception, falling back to Supabase Storage:", cErr);
            }
          }

          // 2. Fallback to Supabase Storage (bucket 'product-images' or 'order-pdfs')
          const arrayBuffer = await file.arrayBuffer();
          const buffer = new Uint8Array(arrayBuffer);
          const ext = (file.name.split(".").pop() || "png").toLowerCase();
          const filename = `products/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

          // Ensure bucket 'product-images' exists or upload to 'order-pdfs'
          let bucketName = "product-images";
          try {
            await supabaseAdmin.storage.createBucket(bucketName, { public: true });
          } catch {}

          const { data: upData, error: upErr } = await supabaseAdmin.storage
            .from(bucketName)
            .upload(filename, buffer, {
              contentType: file.type || "image/png",
              upsert: true,
            });

          if (upErr) {
            console.error("[upload-image] Supabase Storage upload error:", upErr);
            // Fallback to order-pdfs bucket if product-images fails
            bucketName = "order-pdfs";
            const { error: fallbackErr } = await supabaseAdmin.storage
              .from(bucketName)
              .upload(filename, buffer, {
                contentType: file.type || "image/png",
                upsert: true,
              });
            if (fallbackErr) {
              return Response.json({ error: fallbackErr.message || "Upload failed" }, { status: 500 });
            }
          }

          const { data: urlData } = supabaseAdmin.storage
            .from(bucketName)
            .getPublicUrl(filename);

          console.log("[upload-image] uploaded to Supabase Storage:", urlData.publicUrl);
          return Response.json({ url: urlData.publicUrl });
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
