import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { CATEGORIES, categorySlug } from "@/lib/categories";
import { cart } from "@/lib/cart";
import { formatPrice } from "@/lib/currency";

export const Route = createFileRoute("/showroom")({
  head: () => ({
    meta: [
      { title: "Showroom — DE GREAT JAPHET" },
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
  currency?: string | null;
  item_code?: string | null;
};

function ShowroomPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [active, setActive] = useState<string>("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("products")
      .select("id, product_name, category, product_type, product_image, price, currency, item_code")
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
      <section className="relative overflow-hidden border-b border-[oklch(0.82_0.14_86/0.15)]">
        <div className="absolute inset-0 bg-gradient-blue opacity-60" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[oklch(0.82_0.14_86/0.12)] blur-3xl animate-[float_8s_ease-in-out_infinite]" />
        <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-20 animate-[fade-up_.7s_ease-out_both]">
          <p className="text-xs tracking-[0.3em] text-gold uppercase mb-2">Showroom</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-shimmer">Explore Our Collection</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Discover premium materials across every finishing category. Tap to add to your selection — send everything together on WhatsApp.
          </p>
        </div>
      </section>

      {/* Category tabs */}
      <div className="sticky top-16 z-40 glass border-b border-[oklch(0.82_0.14_86/0.12)]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-none -mx-1 px-1">
            {(["All", ...CATEGORIES] as const).map((c) => (
              <button
                key={c}
                onClick={() => setActive(c)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                  active === c
                    ? "bg-gradient-gold text-[var(--cta-foreground)] border-transparent shadow-gold"
                    : "bg-background/40 text-muted-foreground border-border hover:border-gold hover:text-gold"
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
            {filtered.map((p, i) => (
              <div key={p.id} className="animate-[fade-up_.5s_ease-out_both]" style={{ animationDelay: `${i * 50}ms` }}>
                <ProductCard p={p} />
              </div>
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

export function ProductCard({ p }: { p: Product }) {
  const [added, setAdded] = useState(false);
  return (
    <div className="group relative">
      <Link to="/product/$id" params={{ id: p.id }} className="block">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-muted border border-border hover-lift">
          {p.product_image ? (
            <img
              src={p.product_image}
              alt={p.product_name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
              No image
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault();
          cart.add({
            id: p.id,
            product_name: p.product_name,
            item_code: p.item_code,
            category: p.category,
            product_image: p.product_image,
            price: p.price,
            currency: p.currency,
          });
          setAdded(true);
          setTimeout(() => setAdded(false), 1400);
        }}
        aria-label="Add to selection"
        className={`absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
          added
            ? "bg-gradient-gold text-[var(--cta-foreground)] scale-110"
            : "glass text-gold hover:bg-gradient-gold hover:text-[var(--cta-foreground)]"
        }`}
      >
        {added ? <Check size={16} /> : <Plus size={16} />}
      </button>
      <Link to="/product/$id" params={{ id: p.id }} className="block mt-2">
        <h3 className="text-sm md:text-base font-medium text-foreground truncate group-hover:text-gold transition">{p.product_name}</h3>
        <p className="text-xs text-muted-foreground">
          {p.category}{p.product_type ? ` · ${p.product_type}` : ""}
        </p>
        {p.price != null && (
          <p className="text-sm text-gold font-semibold mt-0.5">
            ₦{Number(p.price).toLocaleString()}
          </p>
        )}
      </Link>
    </div>
  );
}

export { categorySlug };
