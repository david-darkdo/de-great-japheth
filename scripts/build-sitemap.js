import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Helper to load .env / .env.local variables without external dependencies
function loadEnvFiles() {
  const envFiles = [".env", ".env.local"];
  envFiles.forEach((file) => {
    const fullPath = path.resolve(file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      content.split("\n").forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const [key, ...valParts] = trimmed.split("=");
          const keyName = key.trim();
          const val = valParts.join("=").trim().replace(/^["']|["']$/g, "");
          if (keyName && !process.env[keyName]) {
            process.env[keyName] = val;
          }
        }
      });
    }
  });
}

loadEnvFiles();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://brznpdgwkowiiyuwgtpp.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const BASE_DOMAINS = [
  "https://thegreatjapheth.com.ng",
  "https://degreatjaphet.com.ng",
];

const CATEGORIES = [
  "Tiles",
  "Doors",
  "Sanitary Ware",
  "Lighting",
  "Electrical Fittings",
  "Roofing",
  "Paints",
  "Pipes & Plumbing",
  "Iron, Steel & Metal",
  "Ceiling & Plaster",
];

function categorySlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function buildSitemap() {
  console.log("🚀 Building dynamic sitemap.xml from production database...");

  let products = [];
  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from("products")
      .select("id, product_name, category, product_type, family, created_at, item_code")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("⚠️ Warning fetching products for sitemap:", error.message);
    } else {
      products = data || [];
    }
  } else {
    console.warn("⚠️ Supabase credentials missing during build-sitemap execution. Generating base sitemap.");
  }

  const primaryDomain = BASE_DOMAINS[0];
  const nowStr = new Date().toISOString().split("T")[0];

  const staticPages = [
    { path: "", priority: "1.0", changefreq: "daily" },
    { path: "/showroom", priority: "0.9", changefreq: "daily" },
    { path: "/contact", priority: "0.8", changefreq: "weekly" },
    { path: "/start-project", priority: "0.8", changefreq: "weekly" },
  ];

  const subcategoryMap = new Map();
  const familyMap = new Map();

  products.forEach((p) => {
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

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // 1. Static Pages
  staticPages.forEach((sp) => {
    xml += `  <url>\n`;
    xml += `    <loc>${primaryDomain}${sp.path}</loc>\n`;
    xml += `    <lastmod>${nowStr}</lastmod>\n`;
    xml += `    <changefreq>${sp.changefreq}</changefreq>\n`;
    xml += `    <priority>${sp.priority}</priority>\n`;
    xml += `  </url>\n`;
  });

  // 2. Category Pages
  CATEGORIES.forEach((catName) => {
    const slug = categorySlug(catName);
    xml += `  <url>\n`;
    xml += `    <loc>${primaryDomain}/category/${slug}</loc>\n`;
    xml += `    <lastmod>${nowStr}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.9</priority>\n`;
    xml += `  </url>\n`;
  });

  // 3. Subcategories
  Array.from(subcategoryMap.values()).forEach((sub) => {
    xml += `  <url>\n`;
    xml += `    <loc>${primaryDomain}/category/${sub.catSlug}?sub=${encodeURIComponent(sub.subName)}</loc>\n`;
    xml += `    <lastmod>${nowStr}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  });

  // 4. Family Groups
  Array.from(familyMap.values()).forEach((fam) => {
    xml += `  <url>\n`;
    xml += `    <loc>${primaryDomain}/family/${fam.familySlug}</loc>\n`;
    xml += `    <lastmod>${nowStr}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  });

  // 5. Products
  products.forEach((p) => {
    const modDate = p.created_at || nowStr;
    const formattedDate = new Date(modDate).toISOString().split("T")[0];
    const itemTarget = p.id;
    xml += `  <url>\n`;
    xml += `    <loc>${primaryDomain}/product/${itemTarget}</loc>\n`;
    xml += `    <lastmod>${formattedDate}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.7</priority>\n`;
    xml += `  </url>\n`;
  });

  xml += `</urlset>`;

  const publicDir = path.resolve("public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const sitemapPath = path.join(publicDir, "sitemap.xml");
  fs.writeFileSync(sitemapPath, xml, "utf-8");
  console.log(`✅ Successfully generated public/sitemap.xml with ${products.length} products, ${CATEGORIES.length} categories, and ${familyMap.size} family groups!`);
}

buildSitemap().catch((err) => {
  console.error("❌ Failed to build sitemap:", err);
  process.exit(1);
});
