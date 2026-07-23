import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2, Minus, Plus, MessageCircle, ShoppingBag, ArrowLeft, History, Loader2 } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { cart, useCart } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Your Selection — DE GREAT JAPHET" }] }),
  component: CartPage,
});

const WA = "2347066786626";

function buildNarrative(items: ReturnType<typeof useCart>, orderCode: string) {
  const collectionUrl = `https://great-japhet.vercel.app/collection/${orderCode}`;
  const total = items.reduce((s, x) => s + (x.price ?? 0) * x.qty, 0);

  const lines: string[] = [];
  lines.push("Hello Great Japhet,");
  lines.push("");
  lines.push("I am interested in this collection.");
  lines.push("");
  lines.push("Collection Link:");
  lines.push(collectionUrl);
  lines.push("");
  lines.push(`Order Code: ${orderCode}`);
  lines.push(`Items Selected: ${items.length}`);
  if (total > 0) lines.push(`Estimated Total: ₦${total.toLocaleString()}`);
  lines.push("");
  lines.push("Please confirm availability and assist me with delivery and installation.");
  lines.push("");
  lines.push("Thank you.");
  return lines.join("\n");
}

function CartPage() {
  const items = useCart();
  const navigate = useNavigate();
  const total = items.reduce((s, x) => s + (x.price ?? 0) * x.qty, 0);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setAuthed(!!sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSend = async () => {
    if (items.length === 0) return;
    if (!authed) {
      navigate({ to: "/auth", search: { redirect: "/cart", mode: "signin" } });
      return;
    }
    setErrMsg("");
    setPreparing(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Session expired. Please sign in again.");

      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items }),
      });
      const json = await res.json();
      if (!res.ok || !json.order_code) throw new Error(json.error || "Could not prepare order");

      const message = buildNarrative(items, json.order_code);
      const url = `https://wa.me/${WA}?text=${encodeURIComponent(message)}`;
      cart.clear();
      
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win) {
        try { (window.top ?? window).location.href = url; }
        catch { window.location.href = url; }
      }
      setPreparing(false);
    } catch (err: any) {
      setErrMsg(err.message || "Something went wrong");
      setPreparing(false);
    }
  };

  return (
    <SiteLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        <div className="flex items-center justify-between">
          <Link to="/showroom" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-gold transition">
            <ArrowLeft size={14} /> Continue browsing
          </Link>
          {authed && (
            <Link to="/orders" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-gold transition">
              <History size={14} /> Order history
            </Link>
          )}
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-xs tracking-[0.3em] text-gold uppercase mb-2">Your Selection</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-shimmer">Cart</h1>
          </div>
          {items.length > 0 && (
            <button onClick={() => cart.clear()} className="text-xs text-muted-foreground hover:text-destructive transition">
              Clear all
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="mt-12 glass rounded-xl p-12 text-center animate-[scale-in_.4s_ease-out_both]">
            <ShoppingBag className="mx-auto text-gold mb-4" size={40} />
            <h2 className="font-display text-xl text-foreground">Your selection is empty</h2>
            <p className="mt-2 text-sm text-muted-foreground">Add products from the showroom to build your enquiry.</p>
            <Link to="/showroom" className="btn-gold mt-6">Open Showroom</Link>
          </div>
        ) : (
          <>
            <ul className="mt-6 space-y-3">
              {items.map((it, idx) => (
                <li
                  key={it.id}
                  className="glass hover-lift rounded-xl p-3 md:p-4 flex gap-3 md:gap-4 animate-[fade-up_.5s_ease-out_both]"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <Link to="/product/$id" params={{ id: it.id }} className="shrink-0">
                    <div className="w-20 h-20 md:w-28 md:h-28 rounded-lg overflow-hidden bg-muted border border-border">
                      {it.product_image ? (
                        <img src={it.product_image} alt={it.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No image</div>
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to="/product/$id" params={{ id: it.id }} className="block">
                      <h3 className="font-medium text-foreground truncate hover:text-gold transition">{it.product_name}</h3>
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {it.category}{it.item_code ? ` · ${it.item_code}` : ""}
                    </p>
                    {it.price != null && (
                      <p className="text-sm text-gold font-semibold mt-1">₦{Number(it.price).toLocaleString()}</p>
                    )}
                    <div className="mt-2 flex items-center gap-3">
                      <div className="inline-flex items-center rounded-md border border-border bg-background/40">
                        <button onClick={() => cart.setQty(it.id, it.qty - 1)} className="p-2 hover:text-gold transition" aria-label="Decrease">
                          <Minus size={14} />
                        </button>
                        <span className="px-2 text-sm w-8 text-center">{it.qty}</span>
                        <button onClick={() => cart.setQty(it.id, it.qty + 1)} className="p-2 hover:text-gold transition" aria-label="Increase">
                          <Plus size={14} />
                        </button>
                      </div>
                      <button onClick={() => cart.remove(it.id)} className="text-xs text-muted-foreground hover:text-destructive transition inline-flex items-center gap-1">
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>
                    <textarea
                      value={it.note ?? ""}
                      onChange={(e) => cart.setNote(it.id, e.target.value)}
                      rows={2}
                      placeholder="Enter quantity, size, installation request, or custom details..."
                      className="mt-3 w-full rounded-md border border-border bg-background/40 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-gold transition resize-y"
                    />
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6 glass rounded-xl p-5 md:p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Items</span>
                <span className="text-sm">{items.reduce((s, x) => s + x.qty, 0)}</span>
              </div>
              {total > 0 && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estimated total</span>
                  <span className="font-display text-xl text-gold">₦{total.toLocaleString()}</span>
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Final price confirmed on WhatsApp. We'll send your shareable Collection Quote link.
              </p>
              <button
                type="button"
                onClick={handleSend}
                disabled={preparing}
                className="btn-gold w-full mt-5 animate-[glow-pulse_2.4s_ease-in-out_infinite] disabled:opacity-70"
              >
                {preparing ? (
                  <><Loader2 size={16} className="animate-spin" /> Preparing your order…</>
                ) : (
                  <><MessageCircle size={16} /> {authed === false ? "Login to Push to WhatsApp" : "Push to WhatsApp"}</>
                )}
              </button>
              {errMsg && <p className="mt-2 text-xs text-destructive text-center">{errMsg}</p>}
            </div>
          </>
        )}
      </div>

      {preparing && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center animate-[fade-in_.2s_ease-out_both]">
          <div className="glass rounded-2xl px-8 py-7 text-center max-w-xs">
            <Loader2 className="mx-auto text-gold animate-spin" size={36} />
            <p className="mt-4 font-display text-lg text-shimmer">Preparing your order…</p>
            <p className="mt-1 text-xs text-muted-foreground">Opening WhatsApp in a moment</p>
          </div>
        </div>
      )}
    </SiteLayout>
  );
}
