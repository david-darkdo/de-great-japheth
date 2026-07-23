import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Check, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { CATEGORIES, categorySlug } from "@/lib/categories";
import { cart } from "@/lib/cart";

type SearchParams = {
  q?: string;
  category?: string;
};

export const Route = createFileRoute("/showroom")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: typeof search.q === "string" ? search.q : undefined,
    category: typeof search.category === "string" ? search.category : undefined,
  }),
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
  item_code?: string | null;
  family?: string | null;
  full_details?: string | null;
  search_keywords?: string | null;
  search_tags?: string | null;
  brand?: string | null;
};

function ShowroomPage() {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: "/showroom" });
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>(searchParams.category || "All");
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.q || "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (searchParams.q !== undefined) setSearchQuery(searchParams.q);
    if (searchParams.category !== undefined) setActiveCategory(searchParams.category);
  }, [searchParams.q, searchParams.category]);

  useEffect(() => {
    supabase
      .from("products")
      .select("id, product_name, category, product_type, product_image, price, item_code, family, full_details, search_keywords, search_tags, brand")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setProducts((data as Product[]) || []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = activeCategory === "All" || p.category === activeCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = (p.product_name || "").toLowerCase().includes(q);
      const catMatch = (p.category || "").toLowerCase().includes(q);
      const familyMatch = (p.family || "").toLowerCase().includes(q);
      const detailsMatch = (p.full_details || "").toLowerCase().includes(q);
      const kwMatch = (p.search_keywords || "").toLowerCase().includes(q);
      const tagMatch = (p.search_tags || "").toLowerCase().includes(q);
      const brandMatch = (p.brand || "").toLowerCase().includes(q);
      const codeMatch = (p.item_code || "").toLowerCase().includes(q);

      return nameMatch || catMatch || familyMatch || detailsMatch || kwMatch || tagMatch || brandMatch || codeMatch;
    });
  }, [products, activeCategory, searchQuery]);

  return (
    <SiteLayout>
      <section className="relative overflow-hidden border-b border-[oklch(0.82_0.14_86/0.15)]">
        <div className="absolute inset-0 bg-gradient-blue opacity-60" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[oklch(0.82_0.14_86/0.12)] blur-3xl animate-[float_8s_ease-in-out_infinite]" />
        <div className="relative max-w-7xl mx-auto px-4 py-10 md:py-16 animate-[fade-up_.7s_ease-out_both]">
          <p className="text-xs tracking-[0.3em] text-gold uppercase mb-2">Showroom</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-shimmer">Explore Our Collection</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl text-sm md:text-base">
            Discover premium building materials across every category. Tap to add to your selection — send everything together on WhatsApp.
          </p>

          {/* Search Bar UI */}
          <div className="mt-6 max-w-2xl relative">
            <div className="relative flex items-center">
              <Search className="absolute left-4 text-gold" size={20} />
              <input
                type="text"
                placeholder="Search products by name, keywords, brand, doors, tiles, electrical..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  navigate({
                    to: "/showroom",
                    search: (prev) => ({ ...prev, q: e.target.value || undefined }),
                    replace: true,
                  });
                }}
                className="w-full pl-12 pr-10 py-3.5 rounded-2xl glass border border-[oklch(0.82_0.14_86/0.25)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold transition-all shadow-gold"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    navigate({
                      to: "/showroom",
                      search: (prev) => ({ ...prev, q: undefined }),
                      replace: true,
                    });
                  }}
                  className="absolute right-4 text-muted-foreground hover:text-gold transition"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Category tabs */}
      <div className="sticky top-16 z-40 glass border-b border-[oklch(0.82_0.14_86/0.12)]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-none -mx-1 px-1">
            {(["All", ...CATEGORIES] as const).map((c) => (
              <button
                key={c}
                onClick={() => {
                  setActiveCategory(c);
                  navigate({
                    to: "/showroom",
                    search: (prev) => ({ ...prev, category: c === "All" ? undefined : c }),
                    replace: true,
                  });
                }}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                  activeCategory === c
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
          <p className="text-muted-foreground text-center py-16">Loading products...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 glass rounded-2xl p-8 max-w-md mx-auto">
            <Search className="mx-auto text-muted-foreground mb-3" size={32} />
            <p className="text-foreground font-medium">No products found</p>
            <p className="text-xs text-muted-foreground mt-1">Try clearing your search query or selecting a different category.</p>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("All");
                  navigate({ to: "/showroom", search: {}, replace: true });
                }}
                className="mt-4 btn-outline-gold text-xs"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {filtered.map((p, i) => (
              <div key={p.id} className="animate-[fade-up_.5s_ease-out_both]" style={{ animationDelay: `${i * 40}ms` }}>
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
