import { createAPIFileRoute } from "@tanstack/react-start/api";
import { getPublicUrl } from "@/lib/url";

export const APIRoute = createAPIFileRoute("/api/robots.txt")({
  GET: () => {
    const sitemapUrl = getPublicUrl("/api/sitemap.xml");
    const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /collection/

Sitemap: ${sitemapUrl}`;

    return new Response(robotsTxt, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
  },
});
