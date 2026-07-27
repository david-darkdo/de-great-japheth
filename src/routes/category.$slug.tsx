import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { categoryFromSlug, categorySlug } from "@/lib/categories";
import { ProductCard } from "@/routes/showroom";
import { getCategoryUrl, getPublicUrl } from "@/lib/url";

type CategorySearchParams = {
  sub?: string;
};

export const Route = createFileRoute("/category/$slug")({
  validateSearch: (search: Record<string, unknown>): CategorySearchParams => ({
    sub: typeof search.sub === "string" ? search.sub : undefined,
  }),
  head: ({ params }) => {
    const categoryName = categoryFromSlug(params.slug) || params.slug;
    const title = `${categoryName} Collection | DE GREAT JAPHET Luxury Finishing`;
    const desc = `Browse luxury ${categoryName} at DE GREAT JAPHET. Premier supplier of imported tiles, security doors, sanitary ware, and architectural materials in Nigeria.`;
    const canonical = getCategoryUrl(params.slug);

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
  component: CategoryPage,
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

function CategoryPage() {
  const { slug } = Route.useParams();
  const { sub } = useSearch({ from: "/category/$slug" });
  const category = categoryFromSlug(slug);
  const [products, setProducts] = useState<Product[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!category) return;
    setLoading(true);

    let query = supabase
      .from("products")
      .select("id, product_name, category, product_type, product_image, price, family")
      .eq("category", category);

    if (sub) {
      query = query.ilike("product_type", `%${sub}%`);
    }

    query.order("created_at", { ascending: false }).then(({ data }) => {
      const prods = (data as Product[]) || [];
      setProducts(prods);
      setLoading(false);
    });

    // Fetch distinct subcategories for filter pills
    supabase
      .from("products")
      .select("product_type")
      .eq("category", category)
      .not("product_type", "is", null)
      .then(({ data }) => {
        const types = new Set<string>();
        (data || []).forEach((item) => {
          if (item.product_type && item.product_type.trim()) {
            types.add(item.product_type.trim());
          }
        });
        setSubcategories(Array.from(types));
      });
  }, [category, sub]);

  if (!category) {
    return (
      <SiteLayout>
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-3xl text-primary">Category not found</h1>
          <Link to="/showroom" className="text-gold underline mt-4 inline-block">
            Back to Showroom
          </Link>
        </div>
      </SiteLayout>
    );
  }

  const currentCategoryUrl = getCategoryUrl(slug, sub);

  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "ItemList",
    "name": sub ? `${category} - ${sub} Collection` : `${category} Collection`,
    "description": `Browse luxury ${category} products for architectural finishing at DE GREAT JAPHET.`,
    "url": currentCategoryUrl,
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
            <span className="text-foreground font-medium">{category}</span>
          </div>

          <h1 className="font-display text-3xl md:text-4xl font-bold text-primary">
            {sub ? `${category} — ${sub}` : category}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Discover imported {category} engineered for modern residential and commercial finishing.
          </p>

          {/* Subcategory Pill Filters */}
          {subcategories.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Link
                to={`/category/${slug}`}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  !sub
                    ? "bg-gold text-black border-gold shadow-gold"
                    : "border-border text-muted-foreground hover:border-gold hover:text-gold"
                }`}
              >
                All {category}
              </Link>
              {subcategories.map((subItem) => (
                <Link
                  key={subItem}
                  to={`/category/${slug}`}
                  search={{ sub: subItem }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    sub === subItem
                      ? "bg-gold text-black border-gold shadow-gold"
                      : "border-border text-muted-foreground hover:border-gold hover:text-gold"
                  }`}
                >
                  {subItem}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {loading ? (
          <p className="text-muted-foreground text-center py-16">Loading {category} products...</p>
        ) : products.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-muted-foreground">No products currently available under {sub ? `${category} (${sub})` : category}.</p>
            <Link to="/showroom" className="btn-gold inline-block text-xs py-2.5 px-5">
              Explore Full Showroom Catalog
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-xs text-muted-foreground mb-6 font-medium">Showing {products.length} products</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {products.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
