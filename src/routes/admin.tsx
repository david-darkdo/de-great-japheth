import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
});

type Product = {
  id: string;
  product_name: string;
  category: string | null;
  price: number | null;
  product_image: string | null;
  item_code?: string | null;
  product_type?: string | null;
  full_details?: string | null;
};

type Customer = { id: string; email: string; created_at: string };
type ActivityLog = {
  id: string;
  action: string;
  user_email: string | null;
  created_at: string;
  details: any;
};

type Tab = "dashboard" | "products" | "upload" | "customers" | "analytics";
type ImageFileSetter = (file: File | null) => void;

const IMAGE_PICKER_ACCEPT = "";

async function openSystemImagePicker(setFile: ImageFileSetter, fallbackInput: HTMLInputElement | null) {
  const picker = (window as any).showOpenFilePicker;

  if (typeof picker === "function") {
    try {
      const [handle] = await picker({
        multiple: false,
        excludeAcceptAllOption: false,
        types: [
          {
            description: "Image files",
            accept: {
              "image/jpeg": [".jpg", ".jpeg"],
              "image/png": [".png"],
              "image/webp": [".webp"],
              "image/gif": [".gif"],
            },
          },
        ],
      });
      const file = await handle.getFile();
      setFile(file);
      return;
    } catch (error: any) {
      if (error?.name === "AbortError") return;
    }
  }

  fallbackInput?.click();
}

function AdminDashboard() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);

  // Auth + role check
  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;
      console.log("[admin] auth user:", user?.email);
      if (!user) {
        navigate({ to: "/system-login" });
        return;
      }
      setUserEmail(user.email ?? null);

      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      console.log("[admin] role check:", roles, error);

      const ok = !!roles?.some((r: any) => ["super_admin", "staff"].includes(r.role));
      if (!ok) {
        await supabase.auth.signOut();
        navigate({ to: "/system-login" });
        return;
      }
      setAuthorized(true);
      setAuthChecked(true);
    })();
  }, [navigate]);

  const loadProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    console.log("[admin] products:", data?.length, error);
    setProducts((data as Product[]) || []);
  }, []);

  const loadCustomers = useCallback(async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("id, email, created_at")
      .order("created_at", { ascending: false });
    console.log("[admin] customers:", data?.length, error);
    setCustomers((data as Customer[]) || []);
  }, []);

  const loadLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("id, action, user_email, created_at, details")
      .order("created_at", { ascending: false })
      .limit(20);
    console.log("[admin] logs:", data?.length, error);
    setLogs((data as ActivityLog[]) || []);
  }, []);

  useEffect(() => {
    if (!authorized) return;
    loadProducts();
    loadCustomers();
    loadLogs();

    const ch = supabase
      .channel("admin-products")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => loadProducts())
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, () => loadCustomers())
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_logs" }, () => loadLogs())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [authorized, loadProducts, loadCustomers, loadLogs]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/system-login" });
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    setProducts((p) => p.filter((x) => x.id !== id));
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      console.error(error);
      alert("Delete failed: " + error.message);
      loadProducts();
    }
  };

  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const whatsappClicks = logs.filter((l) =>
    (l.action || "").toLowerCase().includes("whatsapp"),
  ).length;
  // For total whatsapp orders/clicks across all-time we need a separate count
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Command Center</h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground hidden sm:inline">{userEmail}</span>
            <button onClick={signOut} className="underline">Sign out</button>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-6 flex gap-2 overflow-x-auto">
          {(["dashboard", "products", "upload", "customers", "analytics"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2 px-3 text-sm border-b-2 capitalize ${
                tab === t ? "border-primary font-medium" : "border-transparent text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {tab === "dashboard" && (
          <DashboardTab
            productCount={products.length}
            customerCount={customers.length}
            whatsappClicks={whatsappClicks}
          />
        )}
        {tab === "products" && (
          <ProductsTab products={products} onEdit={setEditing} onDelete={deleteProduct} />
        )}
        {tab === "upload" && <UploadTab onDone={loadProducts} />}
        {tab === "customers" && <CustomersTab customers={customers} />}
        {tab === "analytics" && <AnalyticsTab logs={logs} />}
      </main>

      {editing && (
        <EditProductModal
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            loadProducts();
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border rounded-lg p-6">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold mt-2">{value}</p>
    </div>
  );
}

function DashboardTab({
  productCount,
  customerCount,
  whatsappClicks,
}: {
  productCount: number;
  customerCount: number;
  whatsappClicks: number;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard label="Total Products" value={productCount} />
      <StatCard label="Total Customers" value={customerCount} />
      <StatCard label="WhatsApp Clicks (recent)" value={whatsappClicks} />
    </div>
  );
}

function ProductsTab({
  products,
  onEdit,
  onDelete,
}: {
  products: Product[];
  onEdit: (p: Product) => void;
  onDelete: (id: string) => void;
}) {
  if (products.length === 0)
    return <p className="text-muted-foreground">No products yet.</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((p) => (
        <div key={p.id} className="border rounded-lg overflow-hidden">
          {p.product_image && (
            <img src={p.product_image} alt={p.product_name} className="w-full aspect-square object-cover" />
          )}
          <div className="p-3 space-y-1">
            <h3 className="font-medium truncate">{p.product_name}</h3>
            <p className="text-xs text-muted-foreground">{p.category || "—"}</p>
            <p className="text-sm">{p.price != null ? `$${Number(p.price).toFixed(2)}` : "—"}</p>
            <div className="flex gap-2 pt-2">
              <button onClick={() => onEdit(p)} className="flex-1 border rounded py-1 text-sm">Edit</button>
              <button
                onClick={() => onDelete(p.id)}
                className="flex-1 bg-destructive text-destructive-foreground rounded py-1 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  console.log("[upload] →", file.name, file.size);
  const res = await fetch("/api/upload-image", { method: "POST", body: fd });
  const json = await res.json();
  console.log("[upload] response:", json);
  if (!res.ok || !json.url) throw new Error(json.error || "Upload failed");
  return json.url;
}

function UploadTab({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [initialFile, setInitialFile] = useState<File | null>(null);
  const [finishedFile, setFinishedFile] = useState<File | null>(null);
  const [initialPreview, setInitialPreview] = useState<string | null>(null);
  const [finishedPreview, setFinishedPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const initRef = useRef<HTMLInputElement>(null);
  const finRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!initialFile) return setInitialPreview(null);
    const u = URL.createObjectURL(initialFile);
    setInitialPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [initialFile]);

  useEffect(() => {
    if (!finishedFile) return setFinishedPreview(null);
    const u = URL.createObjectURL(finishedFile);
    setFinishedPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [finishedFile]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialFile) return setStatus("Select the initial product image.");
    if (!name.trim()) return setStatus("Name required.");
    setBusy(true);
    setStatus("Uploading initial image...");
    try {
      const productImageUrl = await uploadImage(initialFile);
      let finishedImageUrl: string | null = null;
      if (finishedFile) {
        setStatus("Uploading finished image...");
        finishedImageUrl = await uploadImage(finishedFile);
      }
      setStatus("Saving...");
      const { data, error } = await supabase
        .from("products")
        .insert({
          product_name: name,
          category: category || null,
          price: price ? Number(price) : null,
          product_image: productImageUrl,
          finished_image: finishedImageUrl,
          full_details: description || null,
        })
        .select()
        .single();
      if (error) throw error;
      console.log("[upload] saved:", data);
      setStatus("✓ Uploaded");
      setName(""); setCategory(""); setPrice(""); setDescription("");
      setInitialFile(null); setFinishedFile(null);
      if (initRef.current) initRef.current.value = "";
      if (finRef.current) finRef.current.value = "";
      onDone();
    } catch (err: any) {
      console.error(err);
      setStatus("Error: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4 border rounded-lg p-6">
      <input type="text" placeholder="Product Name" value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full border rounded px-3 py-2" required />
      <input type="text" placeholder="Category" value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full border rounded px-3 py-2" />
      <input type="number" step="0.01" placeholder="Price" value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="w-full border rounded px-3 py-2" />
      <textarea
        placeholder="Product Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
        className="w-full border rounded px-3 py-2"
      />

      <div>
        <p className="text-sm font-medium mb-2">1. Initial Product Image *</p>
        <button type="button"
          onClick={() => openSystemImagePicker(setInitialFile, initRef.current)}
          className="block w-full text-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-muted">
          {initialFile ? `Selected: ${initialFile.name}` : "Tap to Upload Initial Product Image"}
        </button>
        <input id="upl-init" ref={initRef} type="file" accept={IMAGE_PICKER_ACCEPT} className="hidden"
          onChange={(e) => setInitialFile(e.target.files?.[0] ?? null)} />
        {initialPreview && (
          <img src={initialPreview} alt="initial preview" className="mt-2 w-full max-h-56 object-contain border rounded" />
        )}
      </div>

      <div>
        <p className="text-sm font-medium mb-2">2. Finished Product Image (installed)</p>
        <button type="button"
          onClick={() => openSystemImagePicker(setFinishedFile, finRef.current)}
          className="block w-full text-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-muted">
          {finishedFile ? `Selected: ${finishedFile.name}` : "Tap to Upload Finished Product Image"}
        </button>
        <input id="upl-fin" ref={finRef} type="file" accept={IMAGE_PICKER_ACCEPT} className="hidden"
          onChange={(e) => setFinishedFile(e.target.files?.[0] ?? null)} />
        {finishedPreview && (
          <img src={finishedPreview} alt="finished preview" className="mt-2 w-full max-h-56 object-contain border rounded" />
        )}
      </div>

      <button type="submit" disabled={busy}
        className="w-full bg-primary text-primary-foreground rounded py-2 disabled:opacity-50">
        {busy ? "Uploading..." : "Save Product"}
      </button>
      {status && <p className="text-sm">{status}</p>}
    </form>
  );
}

function CustomersTab({ customers }: { customers: Customer[] }) {
  if (customers.length === 0) return <p className="text-muted-foreground">No customers yet.</p>;
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="text-left p-3">Email</th>
            <th className="text-left p-3">Joined</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="p-3">{c.email}</td>
              <td className="p-3">{new Date(c.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnalyticsTab({ logs }: { logs: ActivityLog[] }) {
  const whatsappOrders = logs.filter((l) =>
    (l.action || "").toLowerCase().includes("whatsapp"),
  ).length;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard label="WhatsApp Orders (recent)" value={whatsappOrders} />
        <StatCard label="Recent Activity" value={logs.length} />
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Action</th>
              <th className="text-left p-3">Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-3">{l.user_email || "—"}</td>
                <td className="p-3">{l.action}</td>
                <td className="p-3">{new Date(l.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EditProductModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product.product_name);
  const [category, setCategory] = useState(product.category || "");
  const [price, setPrice] = useState(product.price?.toString() || "");
  const [imageUrl, setImageUrl] = useState(product.product_image || "");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setStatus("Saving...");
    try {
      let url = imageUrl;
      if (file) {
        setStatus("Uploading image...");
        url = await uploadImage(file);
      }
      const { error } = await supabase
        .from("products")
        .update({
          product_name: name,
          category: category || null,
          price: price ? Number(price) : null,
          product_image: url || null,
        })
        .eq("id", product.id);
      if (error) throw error;
      onSaved();
    } catch (err: any) {
      console.error(err);
      setStatus("Error: " + err.message);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="bg-background w-full max-w-md rounded-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-lg font-semibold">Edit Product</h2>
        <input className="w-full border rounded px-3 py-2" value={name}
          onChange={(e) => setName(e.target.value)} required />
        <input className="w-full border rounded px-3 py-2" placeholder="Category" value={category}
          onChange={(e) => setCategory(e.target.value)} />
        <input className="w-full border rounded px-3 py-2" type="number" step="0.01" placeholder="Price" value={price}
          onChange={(e) => setPrice(e.target.value)} />
        {(file ? URL.createObjectURL(file) : imageUrl) && (
          <img
            src={file ? URL.createObjectURL(file) : imageUrl}
            alt="preview"
            className="w-full max-h-48 object-contain border rounded"
          />
        )}
        <button
          type="button"
          onClick={() => openSystemImagePicker(setFile, null)}
          className="block w-full text-center border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted text-sm"
        >
          {file ? `Selected: ${file.name}` : "Replace Image"}
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 border rounded py-2">Cancel</button>
          <button type="submit" disabled={busy}
            className="flex-1 bg-primary text-primary-foreground rounded py-2 disabled:opacity-50">
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
        {status && <p className="text-sm">{status}</p>}
      </form>
    </div>
  );
}
