import { useEffect, useState, useSyncExternalStore } from "react";

export type CartItem = {
  id: string;
  product_name: string;
  item_code?: string | null;
  category?: string | null;
  product_image?: string | null;
  price?: number | null;
  currency?: string | null;
  qty: number;
  note?: string | null;
};

const KEY = "dgj_cart_v1";
let items: CartItem[] = [];
const listeners = new Set<() => void>();

function load() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    items = raw ? JSON.parse(raw) : [];
  } catch { items = []; }
}
function persist() {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") load();

export const cart = {
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
  get(): CartItem[] { return items; },
  add(item: Omit<CartItem, "qty">, qty = 1) {
    const i = items.findIndex((x) => x.id === item.id);
    if (i >= 0) items[i] = { ...items[i], qty: items[i].qty + qty };
    else items = [...items, { ...item, qty }];
    persist();
  },
  setQty(id: string, qty: number) {
    items = items.map((x) => (x.id === id ? { ...x, qty: Math.max(1, qty) } : x));
    persist();
  },
  setNote(id: string, note: string) {
    items = items.map((x) => (x.id === id ? { ...x, note } : x));
    persist();
  },
  remove(id: string) {
    items = items.filter((x) => x.id !== id);
    persist();
  },
  clear() { items = []; persist(); },
  count() { return items.reduce((s, x) => s + x.qty, 0); },
};

export function useCart() {
  // SSR-safe: start empty, hydrate after mount
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { load(); setHydrated(true); listeners.forEach((l) => l()); }, []);
  const snap = useSyncExternalStore(
    (l) => cart.subscribe(l),
    () => items,
    () => [] as CartItem[]
  );
  return hydrated ? snap : [];
}
