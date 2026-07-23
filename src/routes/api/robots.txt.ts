import { createAPIFileRoute } from "@tanstack/react-start/api";

export const APIRoute = createAPIFileRoute("/api/robots.txt")({
  GET: () => {
    const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /collection/

Sitemap: https://great-japhet.vercel.app/api/sitemap.xml`;

    return new Response(robotsTxt, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
  },
});
