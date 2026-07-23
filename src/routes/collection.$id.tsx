import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, FileText, CheckCircle2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { getCollectionUrl } from "@/lib/url";

export const Route = createFileRoute("/collection/$id")({
  head: () => ({
    meta: [
      { title: "Collection Quote Review — DE GREAT JAPHET" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: async ({ params }) => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);
    let query = supabase.from("orders").select("*");
    if (isUuid) {
      query = query.eq("id", params.id);
    } else {
      query = query.eq("order_code", params.id);
    }
    const { data } = await query.maybeSingle();
    return data;
  },
  component: CollectionPage,
});

type OrderItem = {
  id: string;
  product_name: string;
  item_code?: string;
  category?: string;
  product_image?: string;
  price?: number;
  qty: number;
  note?: string;
};

type Order = {
  id: string;
  order_code: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  items: OrderItem[];
  item_count: number;
  total_estimate: number | null;
  created_at: string;
};

function CollectionPage() {
  const { id } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const [collection, setCollection] = useState<Order | null>(loaderData as Order | null);
  const [loading, setLoading] = useState(!loaderData);

  useEffect(() => {
    if (!collection || (collection.id !== id && collection.order_code !== id)) {
      setLoading(true);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let query = supabase.from("orders").select("*");
      if (isUuid) {
        query = query.eq("id", id);
      } else {
        query = query.eq("order_code", id);
      }
      query.maybeSingle().then(({ data }) => {
        setCollection(data as Order | null);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) {
    return <SiteLayout><div className="max-w-7xl mx-auto px-4 py-20 text-center">Loading Collection...</div></SiteLayout>;
  }

  if (!collection) {
    return (
      <SiteLayout>
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-2xl text-foreground">Collection Not Found</h1>
          <p className="text-muted-foreground text-sm mt-2">This collection quote link may be expired or invalid.</p>
          <Link to="/showroom" className="btn-gold mt-6 inline-flex">Explore Showroom</Link>
        </div>
      </SiteLayout>
    );
  }

  const items = collection.items || [];
  const total = collection.total_estimate || items.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
  const collectionUrl = getCollectionUrl(collection.order_code);

  const waText = encodeURIComponent(
    `Hello Great Japhet,\n\nI am reviewing Collection ${collection.order_code}.\n\nCollection Link:\n${collectionUrl}\n\nPlease confirm availability and installation terms.`
  );

  return (
    <SiteLayout>
      <div className="max-w-4xl mx-auto px-4 py-10 md:py-16">
        <div className="glass rounded-2xl p-6 md:p-10 border border-[oklch(0.82_0.14_86/0.25)] shadow-gold animate-[fade-up_.6s_ease-out_both]">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
            <div>
              <p className="text-xs tracking-[0.3em] text-gold uppercase mb-1">Official Quotation Review</p>
              <h1 className="font-display text-3xl font-bold text-foreground">DE GREAT JAPHET</h1>
              <p className="text-xs text-muted-foreground mt-1">Collection Ref: <span className="font-mono font-semibold text-foreground">{collection.order_code}</span></p>
            </div>
            <div className="text-left md:text-right">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-gold text-[var(--cta-foreground)]">
                <ShieldCheck size={14} /> Verified Collection
              </span>
              <p className="text-xs text-muted-foreground mt-2">Created: {new Date(collection.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Customer info if available */}
          {(collection.customer_name || collection.customer_phone) && (
            <div className="py-4 border-b border-border text-xs text-muted-foreground flex flex-wrap gap-4">
              {collection.customer_name && <span>Customer: <strong className="text-foreground">{collection.customer_name}</strong></span>}
              {collection.customer_phone && <span>Phone: <strong className="text-foreground">{collection.customer_phone}</strong></span>}
            </div>
          )}

          {/* Items Table / List */}
          <div className="mt-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Selected Items ({items.length})</h2>
            
            <div className="divide-y divide-border">
              {items.map((item, idx) => (
                <div key={idx} className="py-4 flex gap-4 items-center">
                  <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden border border-border shrink-0">
                    {item.product_image ? (
                      <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">No image</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{item.product_name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {item.category}{item.item_code ? ` · ${item.item_code}` : ""}
                    </p>
                    <p className="text-xs font-medium text-gold mt-0.5">
                      Qty: {item.qty} {item.price != null && `× ₦${Number(item.price).toLocaleString()}`}
                    </p>
                  </div>

                  {item.price != null && (
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-foreground">
                        ₦{(Number(item.price) * (item.qty || 1)).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Total Summary */}
          <div className="mt-6 pt-6 border-t border-border flex items-center justify-between bg-muted/30 p-4 rounded-xl">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Value</p>
              <p className="font-display text-2xl font-bold text-shimmer">
                ₦{Number(total).toLocaleString()}
              </p>
            </div>

            <a
              href={`https://wa.me/2347066786626?text=${waText}`}
              target="_blank"
              rel="noreferrer"
              className="btn-gold flex items-center gap-2 text-sm"
            >
              <MessageCircle size={18} /> Send on WhatsApp
            </a>
          </div>

          <div className="mt-8 text-center border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Dei Dei Building Materials Market, Front Shop No. 14, Abuja · 0706 678 6626
            </p>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
