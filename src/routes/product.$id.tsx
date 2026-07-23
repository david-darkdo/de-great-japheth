import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, ShoppingBag, Check, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { ProductCard } from "@/routes/showroom";
import { cart } from "@/lib/cart";

export const Route = createFileRoute("/product/$id")({
  head: ({ loaderData }: any) => {
    const prod = loaderData;
    const title = prod?.product_name ? `${prod.product_name} | DE GREAT JAPHET` : "Product | DE GREAT JAPHET";
    const desc = prod?.full_details || "Premium building materials and finishing for modern interiors by De Great Japhet.";
    const img = prod?.product_image || "https://great-japhet.vercel.app/hero-interior.jpg";
    const canonical = `https://great-japhet.vercel.app/product/${prod?.id || ""}`;

    return {
      meta: [
        { title },
        { name: "description", content: desc },

        // Open Graph
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:image", content: img },
        { property: "og:url", content: canonical },
        { property: "og:type", content: "product" },

        // Twitter Card
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { name: "twitter:image", content: img },
      ],
      links: [
        { rel: "canonical", href: canonical },
      ],
    };
  },
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();
    return data;
  },
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
  family?: string | null;
  search_keywords?: string | null;
  search_tags?: string | null;
  brand?: string | null;
  manufacturer?: string | null;
  product_code?: string | null;
};

function ProductPage() {
  const { id } = Route.useParams();
  const loaderProduct = Route.useLoaderData();
  const nav = useNavigate();

  const [product, setProduct] = useState<Product | null>(loaderProduct as Product | null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(!loaderProduct);
  const [added, setAdded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!product || product.id !== id) {
      setLoading(true);
      supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle()
        .then(({ data }) => {
          const prod = data as Product | null;
          setProduct(prod);
          setLoading(false);
        });
    }
  }, [id]);

  useEffect(() => {
    if (product?.category) {
      let q = supabase
        .from("products")
        .select("id, product_name, category, product_type, product_image, price, family")
        .eq("category", product.category)
        .neq("id", product.id);
      if (product.family) q = q.eq("family", product.family);
      q.order("created_at", { ascending: false }).limit(4).then(({ data: r }) => setRelated((r as Product[]) || []));
    }
  }, [product]);

  if (loading) {
    return <SiteLayout><div className="max-w-7xl mx-auto px-4 py-20 text-center">Loading product details...</div></SiteLayout>;
  }
  if (!product) {
    return (
      <SiteLayout>
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-2xl text-foreground">Product not found</h1>
          <Link to="/showroom" className="text-gold underline mt-4 inline-block">Back to Showroom</Link>
        </div>
      </SiteLayout>
    );
  }

  const productUrl = `https://great-japhet.vercel.app/product/${product.id}`;
  const formattedPrice = product.price != null ? `₦${Number(product.price).toLocaleString()}` : "Price on Request";

  const waMessage = `Hello Great Japhet,

I am interested in this product.

Product:
${product.product_name}

Price:
${formattedPrice}

Product Link:
${productUrl}

Please confirm availability.

Thank you.`;

  const waUrl = `https://wa.me/2347066786626?text=${encodeURIComponent(waMessage)}`;

  // JSON-LD Structured Data Schema for Google Indexing
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.product_name,
    "image": [product.product_image, product.finished_image].filter(Boolean),
    "description": product.full_details || product.product_name,
    "sku": product.item_code || product.product_code || product.id,
    "brand": {
      "@type": "Brand",
      "name": product.brand || "DE GREAT JAPHET"
    },
    "offers": {
      "@type": "Offer",
      "url": productUrl,
      "priceCurrency": "NGN",
      "price": product.price || 0,
      "availability": "https://schema.org/InStock",
      "seller": {
        "@type": "Organization",
        "name": "De Great Japhet"
      }
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(productUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SiteLayout>
      {/* Inject JSON-LD Product Schema for Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
          <Link to="/" className="hover:text-gold">Home</Link>
          <span>/</span>
          <Link to="/showroom" className="hover:text-gold">Showroom</Link>
          <span>/</span>
          <span className="text-foreground truncate max-w-[200px]">{product.product_name}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="bg-muted/30 border border-border/80 rounded-2xl overflow-hidden shadow-gold">
              {product.product_image ? (
                <img
                  src={product.product_image}
                  alt={product.product_name}
                  className="w-full h-auto max-h-[500px] object-contain bg-white/5"
                />
              ) : (
                <div className="aspect-square flex items-center justify-center text-muted-foreground">No image</div>
              )}
            </div>

            {/* Finished/Lifestyle Image */}
            {product.finished_image && (
              <div>
                <p className="text-xs tracking-[0.25em] text-gold uppercase mb-2">Installed / Lifestyle Finish</p>
                <div className="bg-muted/30 border border-border/80 rounded-2xl overflow-hidden">
                  <img
                    src={product.finished_image}
                    alt={`${product.product_name} installed`}
                    loading="lazy"
                    className="w-full h-auto max-h-[400px] object-contain bg-white/5"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Product Details & Actions */}
          <div className="animate-[fade-up_.6s_ease-out_both]">
            <p className="text-xs tracking-[0.25em] text-gold uppercase font-semibold">
              {product.category}{product.family ? ` · ${product.family}` : ""}
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2 leading-tight">
              {product.product_name}
            </h1>
            
            {product.item_code && (
              <p className="text-xs text-muted-foreground mt-1">Product Code: {product.item_code}</p>
            )}

            <div className="mt-4 flex items-baseline gap-3">
              <p className="font-display text-3xl text-shimmer font-bold">
                {formattedPrice}
              </p>
            </div>

            {/* Unified Description */}
            {product.full_details && (
              <div className="mt-6 pt-6 border-t border-border/60">
                <h3 className="text-xs tracking-[0.2em] text-gold uppercase font-semibold mb-2">Description</h3>
                <p className="text-foreground/80 leading-relaxed text-sm md:text-base whitespace-pre-line">
                  {product.full_details}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-8 space-y-3">
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-gold w-full flex items-center justify-center gap-2 text-base py-3.5"
              >
                <MessageCircle size={20} /> Buy On WhatsApp
              </a>

              <div className="grid grid-cols-2 gap-3">
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
                  className="btn-outline-gold flex items-center justify-center gap-2 py-3"
                >
                  {added ? <><Check size={16} /> Added</> : <><ShoppingBag size={16} /> Add to Collection</>}
                </button>

                <button
                  onClick={copyShareLink}
                  className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-semibold text-muted-foreground hover:text-gold hover:border-gold transition"
                >
                  <Share2 size={16} /> {copied ? "Link Copied!" : "Share Product"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mt-20 pt-10 border-t border-border/60">
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              {product.family ? `More in ${product.family}` : "Related Products"}
            </h2>
            <p className="text-xs text-muted-foreground mb-6">
              Discover matching items in the {product.category} collection.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {related.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
