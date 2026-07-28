import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/sitemap.xml")({
  head: () => ({
    meta: [
      { title: "Sitemap XML — DE GREAT JAPHET" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: SitemapComponent,
});

function SitemapComponent() {
  const [xmlContent, setXmlContent] = useState<string>("Loading sitemap...");

  useEffect(() => {
    fetch("/sitemap.xml")
      .then((res) => res.text())
      .then((text) => setXmlContent(text))
      .catch(() => setXmlContent("<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"><url><loc>https://degreatjaphet.com.ng</loc></url></urlset>"));
  }, []);

  return (
    <pre style={{ margin: 0, padding: "20px", background: "#0a0a0a", color: "#00ffcc", fontFamily: "monospace", fontSize: "12px", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
      {xmlContent}
    </pre>
  );
}
