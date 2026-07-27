import { createAPIFileRoute } from "@tanstack/react-start/api";
import { generateSitemapXml } from "@/lib/sitemapGenerator";

export const APIRoute = createAPIFileRoute("/api/sitemap.xml")({
  GET: async () => {
    const xml = await generateSitemapXml();
    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  },
});
