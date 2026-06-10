import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { categoryFromSlug } from "@/lib/categories";
import { ProductCard } from "@/routes/showroom";

export const Route = createFileRoute("/category/$slug")({
  component: CategoryPage,
});

type Product = {
  id: string;
  product_name: string;
  category: string | null;
  product_type: string | null;
  product_image: string | null;
  price: number | null;
  currency?: string | null;
};

function CategoryPage() {
  const { slug } = Route.useParams();
  const category = categoryFromSlug(slug);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!category) return;
    setLoading(true);
    supabase
      .from("products")
      .select("id, product_name, category, product_type, product_image, price, currency")
      .eq("category", category)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setProducts((data as Product[]) || []);
        setLoading(false);
      });
  }, [category]);

  if (!category) {
    return (
      <SiteLayout>
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-3xl text-primary">Category not found</h1>
          <Link to="/showroom" className="text-secondary underline mt-4 inline-block">
            Back to Showroom
          </Link>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="border-b border-border bg-accent/40">
        <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
          <Link to="/showroom" className="text-xs text-muted-foreground hover:text-secondary">
            ← Showroom
          </Link>
          <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold text-primary">{category}</h1>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : products.length === 0 ? (
          <p className="text-muted-foreground text-center py-16">No products yet in this category.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {products.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
