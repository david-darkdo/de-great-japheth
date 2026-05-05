import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Showroom,
});

type Product = {
  id: string;
  product_name: string;
  category: string | null;
  price: number | null;
  product_image: string | null;
};

function Showroom() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("products")
      .select("id, product_name, category, price, product_image")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error);
        setProducts((data as Product[]) || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold">Showroom</h1>
          <Link to="/admin" className="text-sm underline">Admin</Link>
        </header>

        {loading ? (
          <p>Loading...</p>
        ) : products.length === 0 ? (
          <p className="text-muted-foreground">No products yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <div key={p.id} className="border rounded-lg overflow-hidden">
                {p.product_image && (
                  <img src={p.product_image} alt={p.product_name} className="w-full aspect-square object-cover" />
                )}
                <div className="p-3">
                  <h2 className="font-medium truncate">{p.product_name}</h2>
                  {p.category && <p className="text-xs text-muted-foreground">{p.category}</p>}
                  {p.price != null && <p className="text-sm mt-1">${Number(p.price).toFixed(2)}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
