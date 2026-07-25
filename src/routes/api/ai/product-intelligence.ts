import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function getEnvVar(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env && process.env[name]) {
    return process.env[name];
  }
  if (typeof import.meta !== "undefined" && (import.meta as any).env && (import.meta as any).env[name]) {
    return (import.meta as any).env[name];
  }
  return undefined;
}

function cleanJsonString(str: string): string {
  return str
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function generateSlug(name: string): string {
  return (name || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const Route = createFileRoute("/api/ai/product-intelligence")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { productName, category, family, brand, price, currency = "NGN", description, manualSpecs, productImage } = body;

          if (!productName) {
            return Response.json({ error: "Product name is required for AI generation" }, { status: 400 });
          }

          let systemPrompt = "You are an expert luxury building materials catalog editor, Google SEO specialist, and search intelligence architect for DE GREAT JAPHET — Nigeria premier supplier and installer of luxury tiles, security doors, interior finishing, ceiling panels, and sanitary ware. Generate authoritative, professional product metadata.";
          let userPromptTpl = `Analyze the following product details and image (if provided):
- Product Name: {{product_name}}
- Category: {{category}}
- Family: {{family}}
- Brand: {{brand}}
- Price: {{currency}} {{price}}
- Existing Description: {{description}}
- Manual Specs: {{manual_specs}}

Return strict valid JSON ONLY with exact keys:
{
  "description": "Comprehensive, luxurious, professional 2-3 paragraph product description highlighting craftsmanship, applications, durability, and finishing suitability.",
  "seo_title": "SEO Title optimized for Google search under 60 chars (e.g. Luxury Virony Marble Tile | DE GREAT JAPHET)",
  "meta_description": "Meta description under 160 chars highlighting premium features, pricing, and WhatsApp order inquiry.",
  "seo_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "slug": "url-friendly-kebab-case-slug",
  "search_keywords": ["internal", "showroom", "search", "terms"],
  "canonical_product_name": "Standardized canonical product name for search aliasing",
  "related_terms": ["synonym1", "related-room-type", "installation-type"],
  "product_summary": "1-sentence quick preview summary",
  "confidence": 0.98
}`;

          try {
            const { data: tplRow } = await supabaseAdmin
              .from("ai_prompt_templates")
              .select("system_prompt, user_prompt_template")
              .eq("template_name", "Product Intelligence")
              .maybeSingle();

            if (tplRow?.system_prompt) systemPrompt = tplRow.system_prompt;
            if (tplRow?.user_prompt_template) userPromptTpl = tplRow.user_prompt_template;
          } catch {}

          const userPrompt = userPromptTpl
            .replace(/{{product_name}}/g, productName || "")
            .replace(/{{category}}/g, category || "Building Materials")
            .replace(/{{family}}/g, family || "Standard Series")
            .replace(/{{brand}}/g, brand || "DE GREAT JAPHET")
            .replace(/{{currency}}/g, currency || "NGN")
            .replace(/{{price}}/g, price ? String(price) : "Contact for Pricing")
            .replace(/{{description}}/g, description || "")
            .replace(/{{manual_specs}}/g, manualSpecs || "");

          const geminiKey = getEnvVar("GEMINI_API_KEY") || getEnvVar("VITE_GEMINI_API_KEY");
          const openaiKey = getEnvVar("OPENAI_API_KEY") || getEnvVar("VITE_OPENAI_API_KEY");

          let aiRawResponse = "";

          if (geminiKey) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
            const parts: any[] = [{ text: `${systemPrompt}\n\n${userPrompt}` }];

            const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: [{ parts }] }),
            });

            if (res.ok) {
              const data: any = await res.json();
              aiRawResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            }
          }

          if (!aiRawResponse && openaiKey) {
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${openaiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userPrompt },
                ],
                response_format: { type: "json_object" },
              }),
            });

            if (res.ok) {
              const data: any = await res.json();
              aiRawResponse = data.choices?.[0]?.message?.content || "";
            }
          }

          let parsedOutput: any = null;
          if (aiRawResponse) {
            try {
              parsedOutput = JSON.parse(cleanJsonString(aiRawResponse));
            } catch (pErr) {
              console.warn("[AI Product Intelligence] Failed to parse JSON:", pErr);
            }
          }

          const fallbackSlug = generateSlug(productName);
          const fallbackDescription = description || `Premium ${productName} supplied and professionally installed by DE GREAT JAPHET. High-grade materials designed for modern residential and commercial architecture.`;

          const result = {
            description: parsedOutput?.description || fallbackDescription,
            seo_title: parsedOutput?.seo_title || `${productName} | Luxury Finishing | DE GREAT JAPHET`,
            meta_description: parsedOutput?.meta_description || `Order ${productName} from DE GREAT JAPHET. Premium finishing, professional installation & direct delivery across Nigeria.`,
            seo_keywords: Array.isArray(parsedOutput?.seo_keywords) ? parsedOutput.seo_keywords : [productName, category, family, "DE GREAT JAPHET", "Building Materials Nigeria"].filter(Boolean),
            slug: parsedOutput?.slug ? generateSlug(parsedOutput.slug) : fallbackSlug,
            search_keywords: Array.isArray(parsedOutput?.search_keywords) ? parsedOutput.search_keywords : [productName, category, family, brand, "luxury"].filter(Boolean),
            canonical_product_name: parsedOutput?.canonical_product_name || productName,
            related_terms: Array.isArray(parsedOutput?.related_terms) ? parsedOutput.related_terms : [category, family, "interior finishing", "building materials"].filter(Boolean),
            product_summary: parsedOutput?.product_summary || `${productName} - Premium ${category || "Building Finishing"}`,
            confidence: typeof parsedOutput?.confidence === "number" ? parsedOutput.confidence : (aiRawResponse ? 0.95 : 0.85),
          };

          return Response.json(result);
        } catch (err: any) {
          console.error("[api/ai/product-intelligence] exception:", err);
          return Response.json({ error: err.message || "Failed to generate product intelligence" }, { status: 500 });
        }
      },
    },
  },
});
