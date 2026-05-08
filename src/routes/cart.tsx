import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2, Minus, Plus, MessageCircle, ShoppingBag, ArrowLeft } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { cart, useCart } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Your Selection — DE GREAT JAPHETH" }] }),
  component: CartPage,
});

const WA = "2347066786626";

function buildNarrative(items: ReturnType<typeof useCart>) {
  const lines: string[] = [];
  lines.push("Hello DE GREAT JAPHETH 👋");
  lines.push("I'd like to enquire about the following items from your showroom:");
  lines.push("");
  items.forEach((it, i) => {
    const code = it.item_code ? ` (Code: ${it.item_code})` : "";
    const cat = it.category ? ` — ${it.category}` : "";
    const price = it.price != null ? ` — ₦${Number(it.price).toLocaleString()}` : "";
    lines.push(`${i + 1}. ${it.product_name}${cat}${code}`);
    lines.push(`   Quantity: ${it.qty}${price}`);
    if (it.product_image) lines.push(`   Image: ${it.product_image}`);
    lines.push("");
  });
  lines.push("Please confirm availability, total price and delivery options. Thank you.");
  return lines.join("\n");
}

function CartPage() {
  const items = useCart();
  const total = items.reduce((s, x) => s + (x.price ?? 0) * x.qty, 0);

  const waUrl = `https://wa.me/${WA}?text=${encodeURIComponent(buildNarrative(items))}`;

  return (
    <SiteLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        <Link to="/showroom" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-gold transition">
          <ArrowLeft size={14} /> Continue browsing
        </Link>
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
                  </div>
                </li>
              ))}
            </ul>

            {/* Summary */}
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
                Final price confirmed on WhatsApp. We'll send the full list with names and images of each item.
              </p>
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-gold w-full mt-5 animate-[glow-pulse_2.4s_ease-in-out_infinite]"
              >
                <MessageCircle size={16} /> Send Selection on WhatsApp
              </a>
            </div>
          </>
        )}
      </div>
    </SiteLayout>
  );
}
