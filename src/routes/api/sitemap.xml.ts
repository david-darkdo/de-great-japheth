import { createAPIFileRoute } from "@tanstack/react-start/api";
import { supabase } from "@/integrations/supabase/client";

export const APIRoute = createAPIFileRoute("/api/sitemap.xml")({
  GET: async () => {
    const baseUrl = "https://great-japhet.vercel.app";

    const { data: products } = await supabase
      .from("products")
      .select("id, created_at")
      .order("created_at", { ascending: false });

    const staticPages = ["", "/showroom", "/contact", "/start-project"];

    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticPages
    .map(
      (path) => `
  <url>
    <loc>${baseUrl}${path}</loc>
    <changefreq>daily</changefreq>
    <priority>${path === "" ? "1.0" : "0.8"}</priority>
  </url>`
    )
    .join("")}
  ${(products || [])
    .map(
      (p) => `
  <url>
    <loc>${baseUrl}/product/${p.id}</loc>
    <lastmod>${new Date(p.created_at || Date.now()).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`
    )
    .join("")}
</urlset>`;

    return new Response(sitemapXml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  },
});
