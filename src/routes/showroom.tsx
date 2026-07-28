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
  seo_keywords?: string[] | string | null;
  canonical_product_name?: string | null;
  related_terms?: string[] | string | null;
  product_summary?: string | null;
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
      .select("id, product_name, category, product_type, product_image, price, item_code, family, full_details, search_keywords, search_tags, brand, seo_keywords, canonical_product_name, related_terms, product_summary")
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

      // LEVEL 1: Manual Product Data (Highest Priority & Authoritative)
      const nameMatch = (p.product_name || "").toLowerCase().includes(q);
      const typeMatch = (p.product_type || "").toLowerCase().includes(q);
      const catMatch = (p.category || "").toLowerCase().includes(q);
      const familyMatch = (p.family || "").toLowerCase().includes(q);
      const brandMatch = (p.brand || "").toLowerCase().includes(q);
      const codeMatch = (p.item_code || "").toLowerCase().includes(q);

      if (nameMatch || typeMatch || catMatch || familyMatch || brandMatch || codeMatch) {
        return true;
      }

      // LEVEL 2: AI Product Intelligence (Enhancement)
      const kwMatch = (p.search_keywords || "").toLowerCase().includes(q);
      const tagMatch = (p.search_tags || "").toLowerCase().includes(q);
      const canonicalMatch = (p.canonical_product_name || "").toLowerCase().includes(q);
      const detailsMatch = (p.full_details || "").toLowerCase().includes(q);
      const summaryMatch = (p.product_summary || "").toLowerCase().includes(q);

      const seoKwMatch = Array.isArray(p.seo_keywords)
        ? p.seo_keywords.some((k: string) => (k || "").toLowerCase().includes(q))
        : (p.seo_keywords || "").toLowerCase().includes(q);

      const relatedMatch = Array.isArray(p.related_terms)
        ? p.related_terms.some((t: string) => (t || "").toLowerCase().includes(q))
        : (p.related_terms || "").toLowerCase().includes(q);

      return (
        kwMatch ||
        tagMatch ||
        canonicalMatch ||
        detailsMatch ||
        summaryMatch ||
        seoKwMatch ||
        relatedMatch
      );
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
                  className="absolute right-4 text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Category Pills */}
      <div className="border-b border-border bg-card/50 sticky top-16 z-20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              setActiveCategory("All");
              navigate({
                to: "/showroom",
                search: (prev) => ({ ...prev, category: undefined }),
                replace: true,
              });
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeCategory === "All"
                ? "bg-gradient-gold text-[var(--cta-foreground)] shadow-gold"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            All Products ({products.length})
          </button>
          {CATEGORIES.map((c) => {
            const count = products.filter((p) => p.category === c).length;
            return (
              <button
                key={c}
                onClick={() => {
                  setActiveCategory(c);
                  navigate({
                    to: "/showroom",
                    search: (prev) => ({ ...prev, category: c }),
                    replace: true,
                  });
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory === c
                    ? "bg-gradient-gold text-[var(--cta-foreground)] shadow-gold"
                    : "border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {c} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid */}
      <section className="max-w-7xl mx-auto px-4 py-10 md:py-16">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="glass rounded-2xl p-4 h-64 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-display text-xl text-foreground font-semibold">No products found</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your search term or category filter.</p>
            <button
              onClick={() => {
                setActiveCategory("All");
                setSearchQuery("");
                navigate({ to: "/showroom", search: {}, replace: true });
              }}
              className="mt-4 btn-gold text-xs py-2 px-4 inline-flex"
            >
              Reset Filters
            </button>
          </div>
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
  const [added, setAdded] = useState(false);

  return (
    <div className="group glass rounded-2xl p-4 flex flex-col justify-between hover:border-[oklch(0.82_0.14_86/0.5)] transition-all duration-300 hover:-translate-y-1 shadow-gold">
      <Link to="/product/$id" params={{ id: p.id }} className="block">
        <div className="aspect-square rounded-xl bg-muted overflow-hidden relative border border-border/40">
          {p.product_image ? (
            <img
              src={p.product_image}
              alt={p.product_name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
              No image
            </div>
          )}
          {p.category && (
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md glass text-[10px] uppercase font-semibold text-gold tracking-wider">
              {p.category}
            </span>
          )}
        </div>

        <div className="mt-3">
          <h3 className="font-display text-sm font-semibold text-foreground group-hover:text-gold transition-colors line-clamp-2">
            {p.product_name}
          </h3>
          {p.family && <p className="text-[11px] text-muted-foreground mt-0.5">{p.family}</p>}
          <p className="mt-2 text-sm font-bold text-shimmer">
            {p.price != null ? `₦${Number(p.price).toLocaleString()}` : "Price on Request"}
          </p>
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
        className={`mt-4 w-full py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
          added
            ? "bg-emerald-500 text-white"
            : "btn-gold"
        }`}
      >
        {added ? (
          <>
            <Check size={14} /> Added
          </>
        ) : (
          <>
            <Plus size={14} /> Add to Selection
          </>
        )}
      </button>
    </div>
  );
}
