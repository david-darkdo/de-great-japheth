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
        <div className="mt-8 animate-[fade-up_.6s_ease-out_both]">
          <p className="text-xs tracking-[0.25em] text-gold uppercase">
            {product.category}{product.product_type ? ` · ${product.product_type}` : ""}
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-1">
            {product.product_name}
          </h1>
          {product.item_code && (
            <p className="text-xs text-muted-foreground mt-1">Item code: {product.item_code}</p>
          )}
          {product.price != null && (
            <p className="font-display text-3xl text-shimmer mt-3">
              ₦{Number(product.price).toLocaleString()}
            </p>
          )}
          {product.full_details && (
            <p className="mt-5 text-foreground/80 leading-relaxed whitespace-pre-line">
              {product.full_details}
            </p>
          )}

          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                cart.add({
                  id: product.id,
                  product_name: product.product_name,
                  item_code: product.item_code,
                  category: product.category,
                  product_image: product.product_image,
                  price: product.price,
                });
                setAdded(true);
                setTimeout(() => setAdded(false), 1600);
              }}
              className="btn-gold"
            >
              {added ? <><Check size={16} /> Added</> : <><ShoppingBag size={16} /> Add to Selection</>}
            </button>
            <button
              onClick={() => {
                cart.add({
                  id: product.id,
                  product_name: product.product_name,
                  item_code: product.item_code,
                  category: product.category,
                  product_image: product.product_image,
                  price: product.price,
                });
                nav({ to: "/cart" });
              }}
              className="btn-outline-gold"
            >
              Buy Now
            </button>
            <a
              href={`https://wa.me/2347066786626?text=${waText}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-6 py-3 text-sm font-semibold text-muted-foreground hover:text-gold hover:border-gold transition"
            >
              <MessageCircle size={16} /> Quick Enquire
            </a>
          </div>
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
