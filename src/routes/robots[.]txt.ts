import { createAPIFileRoute } from "@tanstack/react-start/api";
import { generateRobotsTxt } from "@/lib/sitemapGenerator";

export const APIRoute = createAPIFileRoute("/robots.txt")({
  GET: () => {
    const robotsTxt = generateRobotsTxt();
    return new Response(robotsTxt, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
  },
});
