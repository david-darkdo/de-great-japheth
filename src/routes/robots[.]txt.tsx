import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots.txt")({
  head: () => ({
    meta: [
      { title: "Robots TXT — DE GREAT JAPHET" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: RobotsComponent,
});

function RobotsComponent() {
  const robotsTxt = `User-agent: *
Allow: /

# Block Administrative & Internal API Endpoints
Disallow: /admin
Disallow: /system-login
Disallow: /api/
Disallow: /auth

# Search Engine Sitemaps
Sitemap: https://thegreatjapheth.com.ng/sitemap.xml
Sitemap: https://degreatjaphet.com.ng/sitemap.xml
`;

  return (
    <pre style={{ margin: 0, padding: "20px", background: "#0a0a0a", color: "#ffffff", fontFamily: "monospace", fontSize: "14px", whiteSpace: "pre-wrap" }}>
      {robotsTxt}
    </pre>
  );
}
