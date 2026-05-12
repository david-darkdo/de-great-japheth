import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ShoppingBag, MessageCircle } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "Order History — DE GREAT JAFFET" }] }),
  component: OrdersPage,
});

const WA = "2347066786626";

type Order = {
  id: string;
  order_code: string;
  items: any[];
  item_count: number;
  total_estimate: number | null;
  created_at: string;
};

function OrdersPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/auth", search: { redirect: "/orders", mode: "signin" } });
        return;
      }
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_code, items, item_count, total_estimate, created_at")
        .eq("user_id", sess.session.user.id)
        .order("created_at", { ascending: false });
      if (!error) setOrders((data as any) || []);
      setLoading(false);
    })();
  }, [navigate]);

  return (
    <SiteLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        <Link to="/showroom" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-gold transition">
          <ArrowLeft size={14} /> Back to showroom
        </Link>
        <div className="mt-3">
          <p className="text-xs tracking-[0.3em] text-gold uppercase mb-2">Your Orders</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-shimmer">Order History</h1>
        </div>

        {loading ? (
          <p className="mt-12 text-center text-sm text-muted-foreground">Loading…</p>
        ) : orders.length === 0 ? (
          <div className="mt-10 glass rounded-xl p-10 text-center">
            <ShoppingBag className="mx-auto text-gold mb-4" size={36} />
            <h2 className="font-display text-xl">No orders yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">Your previous selections will appear here.</p>
            <Link to="/showroom" className="btn-gold mt-6">Browse Showroom</Link>
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {orders.map((o, idx) => {
              const reorderText = `Hello DE GREAT JAFFET, I'd like to follow up on my order ${o.order_code}.`;
              const waUrl = `https://wa.me/${WA}?text=${encodeURIComponent(reorderText)}`;
              return (
                <li
                  key={o.id}
                  className="glass rounded-xl p-4 md:p-5 animate-[fade-up_.5s_ease-out_both]"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] tracking-[0.3em] text-gold uppercase">Order Code</p>
                      <p className="font-display text-lg font-bold">{o.order_code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
                      <p className="text-xs">{o.item_count} item{o.item_count !== 1 ? "s" : ""}</p>
                      {o.total_estimate ? (
                        <p className="text-sm text-gold font-semibold">₦{Number(o.total_estimate).toLocaleString()}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {(o.items || []).slice(0, 8).map((it: any, i: number) => (
                      <div key={i} className="shrink-0 w-16 text-center">
                        <div className="w-16 h-16 rounded-md overflow-hidden bg-muted border border-border">
                          {it.product_image ? (
                            <img src={it.product_image} alt={it.product_name} className="w-full h-full object-cover" />
                          ) : null}
                        </div>
                        <p className="mt-1 text-[10px] text-muted-foreground truncate">{it.product_name}</p>
                      </div>
                    ))}
                  </div>
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-xs text-gold hover:underline"
                  >
                    <MessageCircle size={14} /> Follow up on WhatsApp
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </SiteLayout>
  );
}
