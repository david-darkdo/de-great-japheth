import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, ShoppingBag, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { ProductCard } from "@/routes/showroom";
import { cart } from "@/lib/cart";

export const Route = createFileRoute("/product/$id")({
  component: ProductPage,
});

type Product = {
  id: string;
  product_name: string;
  item_code: string | null;
  category: string | null;
  product_type: string | null;
  product_image: string | null;
  finished_image: string | null;
  full_details: string | null;
  price: number | null;
};

function ProductPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setProduct(data as Product | null);
        setLoading(false);
        if (data?.category) {
          supabase
            .from("products")
            .select("id, product_name, category, product_type, product_image, price")
            .eq("category", data.category)
            .neq("id", id)
            .limit(4)
            .then(({ data: r }) => setRelated((r as Product[]) || []));
        }
      });
  }, [id]);

  if (loading) {
    return <SiteLayout><div className="max-w-7xl mx-auto px-4 py-16">Loading...</div></SiteLayout>;
  }
  if (!product) {
    return (
      <SiteLayout>
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-2xl text-primary">Product not found</h1>
          <Link to="/showroom" className="text-secondary underline mt-4 inline-block">Back to Showroom</Link>
        </div>
      </SiteLayout>
    );
  }

  const waText = encodeURIComponent(
    `Hello, I'm interested in: ${product.product_name}${product.item_code ? ` (${product.item_code})` : ""}`
  );

  return (
    <SiteLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        <Link to="/showroom" className="text-xs text-muted-foreground hover:text-secondary">← Showroom</Link>

        {/* 1. Main product image */}
        <div className="mt-4 bg-muted border border-border rounded-lg overflow-hidden">
          {product.product_image ? (
            <img
              src={product.product_image}
              alt={product.product_name}
              className="w-full h-auto max-h-[600px] object-contain bg-white"
            />
          ) : (
            <div className="aspect-square flex items-center justify-center text-muted-foreground">No image</div>
          )}
        </div>

        {/* 2. Finished work image */}
        {product.finished_image && (
          <div className="mt-6">
            <p className="text-xs tracking-[0.25em] text-secondary uppercase mb-3">Finished Work</p>
            <div className="bg-muted border border-border rounded-lg overflow-hidden">
              <img
                src={product.finished_image}
                alt={`${product.product_name} installed`}
                loading="lazy"
                className="w-full h-auto max-h-[600px] object-contain bg-white"
              />
            </div>
          </div>
        )}

        {/* 3. Description */}
        <div className="mt-8">
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
            {product.category}{product.product_type ? ` · ${product.product_type}` : ""}
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-primary mt-1">
            {product.product_name}
          </h1>
          {product.item_code && (
            <p className="text-xs text-muted-foreground mt-1">Item code: {product.item_code}</p>
          )}
          {product.price != null && (
            <p className="text-2xl font-semibold text-secondary mt-3">
              ₦{Number(product.price).toLocaleString()}
            </p>
          )}
          {product.full_details && (
            <p className="mt-5 text-foreground/80 leading-relaxed whitespace-pre-line">
              {product.full_details}
            </p>
          )}

          <a
            href={`https://wa.me/2347066786626?text=${waText}`}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-[var(--cta)] text-[var(--cta-foreground)] px-6 py-3 text-sm font-semibold hover:opacity-90"
          >
            <MessageCircle size={16} /> Enquire on WhatsApp
          </a>
        </div>

        {/* 4. Related */}
        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="font-display text-xl md:text-2xl font-bold text-primary mb-6">Related Products</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {related.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
