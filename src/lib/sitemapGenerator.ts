import { supabase } from "@/integrations/supabase/client";
import { getPublicUrl, getProductUrl, getCategoryUrl, getFamilyUrl } from "@/lib/url";
import { CATEGORIES, categorySlug } from "@/lib/categories";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function generateSitemapXml(): Promise<string> {
  const baseUrl = "https://degreatjaphet.com.ng";
  const nowStr = new Date().toISOString().split("T")[0];

  // Fetch all published products from production database
  const { data: products } = await supabase
    .from("products")
    .select("id, slug, product_name, category, product_type, family, created_at, updated_at")
    .order("created_at", { ascending: false });

  const publishedProducts = (products || []).filter(p => Boolean(p.id));

  // Static Public Pages
  const staticPages = [
    { path: "", priority: "1.0", changefreq: "daily" },
    { path: "/showroom", priority: "0.9", changefreq: "daily" },
    { path: "/contact", priority: "0.8", changefreq: "weekly" },
    { path: "/start-project", priority: "0.8", changefreq: "weekly" },
  ];

  // Categories (Priority 0.9)
  const categoryUrls = CATEGORIES.map((catName) => {
    const slug = categorySlug(catName);
    return {
      url: `${baseUrl}/category/${slug}`,
      priority: "0.9",
      changefreq: "weekly",
      lastmod: nowStr,
    };
  });

  // Subcategories (Priority 0.8) & Family Groups (Priority 0.8)
  const subcategoryMap = new Map<string, { catSlug: string; subName: string }>();
  const familyMap = new Map<string, { familyName: string; familySlug: string }>();

  publishedProducts.forEach((p) => {
    if (p.category && p.product_type) {
      const catSlug = categorySlug(p.category);
      const subKey = `${catSlug}:${p.product_type.trim().toLowerCase()}`;
      if (!subcategoryMap.has(subKey)) {
        subcategoryMap.set(subKey, { catSlug, subName: p.product_type.trim() });
      }
    }
    if (p.family && p.family.trim()) {
      const famName = p.family.trim();
      const famSlug = slugify(famName);
      if (!familyMap.has(famSlug)) {
        familyMap.set(famSlug, { familyName: famName, familySlug: famSlug });
      }
    }
  });

  const subcategoryUrls = Array.from(subcategoryMap.values()).map((sub) => ({
    url: `${baseUrl}/category/${sub.catSlug}?sub=${encodeURIComponent(sub.subName)}`,
    priority: "0.8",
    changefreq: "weekly",
    lastmod: nowStr,
  }));

  const familyUrls = Array.from(familyMap.values()).map((fam) => ({
    url: `${baseUrl}/family/${fam.familySlug}`,
    priority: "0.8",
    changefreq: "weekly",
    lastmod: nowStr,
  }));

  // Products (Priority 0.7)
  const productUrls = publishedProducts.map((p) => {
    const modDate = p.updated_at || p.created_at || nowStr;
    const formattedDate = new Date(modDate).toISOString().split("T")[0];
    const itemTarget = p.slug || p.id;
    return {
      url: `${baseUrl}/product/${itemTarget}`,
      priority: "0.7",
      changefreq: "weekly",
      lastmod: formattedDate,
    };
  });

  // Construct XML String
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // 1. Static Pages
  staticPages.forEach((sp) => {
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}${sp.path}</loc>\n`;
    xml += `    <lastmod>${nowStr}</lastmod>\n`;
    xml += `    <changefreq>${sp.changefreq}</changefreq>\n`;
    xml += `    <priority>${sp.priority}</priority>\n`;
    xml += `  </url>\n`;
  });

  // 2. Category Landing Pages
  categoryUrls.forEach((c) => {
    xml += `  <url>\n`;
    xml += `    <loc>${c.url}</loc>\n`;
    xml += `    <lastmod>${c.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${c.changefreq}</changefreq>\n`;
    xml += `    <priority>${c.priority}</priority>\n`;
    xml += `  </url>\n`;
  });

  // 3. Subcategory Landing Pages
  subcategoryUrls.forEach((sub) => {
    xml += `  <url>\n`;
    xml += `    <loc>${sub.url}</loc>\n`;
    xml += `    <lastmod>${sub.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${sub.changefreq}</changefreq>\n`;
    xml += `    <priority>${sub.priority}</priority>\n`;
    xml += `  </url>\n`;
  });

  // 4. Family Group Pages
  familyUrls.forEach((fam) => {
    xml += `  <url>\n`;
    xml += `    <loc>${fam.url}</loc>\n`;
    xml += `    <lastmod>${fam.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${fam.changefreq}</changefreq>\n`;
    xml += `    <priority>${fam.priority}</priority>\n`;
    xml += `  </url>\n`;
  });

  // 5. Product Landing Pages
  productUrls.forEach((prod) => {
    xml += `  <url>\n`;
    xml += `    <loc>${prod.url}</loc>\n`;
    xml += `    <lastmod>${prod.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${prod.changefreq}</changefreq>\n`;
    xml += `    <priority>${prod.priority}</priority>\n`;
    xml += `  </url>\n`;
  });

  xml += `</urlset>`;
  return xml;
}

export function generateRobotsTxt(): string {
  const baseUrl = "https://degreatjaphet.com.ng";
  return `User-agent: *
Allow: /

# Block Private & Administrative Pages
Disallow: /admin
Disallow: /system-login
Disallow: /api/
Disallow: /auth

# Sitemap Location
Sitemap: ${baseUrl}/sitemap.xml
`;
}
