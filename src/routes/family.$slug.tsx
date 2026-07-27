import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { ProductCard } from "@/routes/showroom";
import { getPublicUrl, getFamilyUrl } from "@/lib/url";

export const Route = createFileRoute("/family/$slug")({
  head: ({ params }) => {
    const familyTitle = (params.slug || "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
    const title = `${familyTitle} Series & Collection | DE GREAT JAPHET`;
    const desc = `Explore the ${familyTitle} series at DE GREAT JAPHET. Premium architectural finishing, tiles, and security doors imported for luxury builds in Nigeria.`;
    const canonical = getFamilyUrl(params.slug);

    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: canonical },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: FamilyPage,
});

type Product = {
  id: string;
  product_name: string;
  category: string | null;
  product_type: string | null;
  product_image: string | null;
  price: number | null;
  family?: string | null;
};

function FamilyPage() {
  const { slug } = Route.useParams();
  const familyName = slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("products")
      .select("id, product_name, category, product_type, product_image, price, family")
      .ilike("family", `%${familyName}%`)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setProducts((data as Product[]) || []);
        setLoading(false);
      });
  }, [slug, familyName]);

  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "ItemList",
    "name": `${familyName} Series Collection`,
    "description": `Luxury architectural products in the ${familyName} family by DE GREAT JAPHET.`,
    "url": getFamilyUrl(slug),
    "itemListElement": products.map((p, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": p.product_name,
      "url": getPublicUrl(`/product/${p.id}`),
    })),
  };

  return (
    <SiteLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="border-b border-border bg-accent/40">
        <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <Link to="/" className="hover:text-gold">Home</Link>
            <span>/</span>
            <Link to="/showroom" className="hover:text-gold">Showroom</Link>
            <span>/</span>
            <span className="text-foreground font-medium">Family Group</span>
          </div>
          <p className="text-xs tracking-[0.25em] text-gold uppercase font-semibold">Family Series Collection</p>
          <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold text-primary">{familyName}</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl">
            Browse all products in the authoritative {familyName} product family. Every item is verified for luxury finishing quality.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {loading ? (
          <p className="text-muted-foreground text-center py-16">Loading {familyName} family products...</p>
        ) : products.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-muted-foreground">No products currently found in the '{familyName}' family series.</p>
            <Link to="/showroom" className="btn-gold inline-block text-xs py-2.5 px-5">
              Explore Full Showroom Catalog
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-xs text-muted-foreground mb-6 font-medium">Showing {products.length} items in {familyName} series</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {products.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
