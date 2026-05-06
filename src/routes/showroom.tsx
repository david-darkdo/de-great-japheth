import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { CATEGORIES, categorySlug } from "@/lib/categories";

export const Route = createFileRoute("/showroom")({
  head: () => ({
    meta: [
      { title: "Showroom — DE GREAT JAPHETH" },
      { name: "description", content: "Browse our full collection of premium building materials and finishing products." },
    ],
  }),
  component: ShowroomPage,
});

type Product = {
  id: string;
  product_name: string;
  category: string | null;
  product_type: string | null;
  product_image: string | null;
  price: number | null;
};

function ShowroomPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [active, setActive] = useState<string>("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("products")
      .select("id, product_name, category, product_type, product_image, price")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setProducts((data as Product[]) || []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(
    () => (active === "All" ? products : products.filter((p) => p.category === active)),
    [products, active]
  );

  return (
    <SiteLayout>
      <section className="border-b border-border bg-accent/40">
        <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
          <p className="text-xs tracking-[0.3em] text-secondary uppercase mb-2">Showroom</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-primary">Explore Our Collection</h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Discover premium materials across every finishing category.
          </p>
        </div>
      </section>

      {/* Category tabs */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-none -mx-1 px-1">
            {(["All", ...CATEGORIES] as const).map((c) => (
              <button
                key={c}
                onClick={() => setActive(c)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  active === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-secondary hover:text-secondary"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {loading ? (
          <p className="text-muted-foreground">Loading products...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-16">No products in this category yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {filtered.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

export function ProductCard({ p }: { p: Product }) {
  return (
    <Link
      to="/product/$id"
      params={{ id: p.id }}
      className="group block"
    >
      <div className="aspect-square overflow-hidden rounded-lg bg-muted border border-border">
        {p.product_image ? (
          <img
            src={p.product_image}
            alt={p.product_name}
            loading="lazy"
            className="w-full h-full object-contain bg-white group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            No image
          </div>
        )}
      </div>
      <div className="mt-2">
        <h3 className="text-sm md:text-base font-medium text-primary truncate">{p.product_name}</h3>
        <p className="text-xs text-muted-foreground">
          {p.category}{p.product_type ? ` · ${p.product_type}` : ""}
        </p>
        {p.price != null && (
          <p className="text-sm text-secondary font-semibold mt-0.5">
            ₦{Number(p.price).toLocaleString()}
          </p>
        )}
      </div>
    </Link>
  );
}

export { categorySlug };
