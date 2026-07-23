import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES } from "@/lib/categories";
import { Search, Globe, Tag, Sparkles } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
});

type Product = {
  id: string;
  product_name: string;
  category: string | null;
  price: number | null;
  currency?: string | null;
  product_image: string | null;
  finished_image?: string | null;
  item_code?: string | null;
  product_type?: string | null;
  full_details?: string | null;
  family?: string | null;
  search_keywords?: string | null;
  search_tags?: string | null;
  brand?: string | null;
  manufacturer?: string | null;
  product_code?: string | null;
};

type Customer = {
  id: string;
  email: string;
  created_at: string;
  full_name?: string | null;
  phone?: string | null;
  provider?: string | null;
  last_login_at?: string | null;
  user_id?: string | null;
};
type ActivityLog = {
  id: string;
  action: string;
  user_email: string | null;
  created_at: string;
  details: any;
};
type UserRole = { id: string; user_id: string; email: string | null; role: string; created_at: string };
type Order = {
  id: string;
  order_code: string;
  user_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  items: any[];
  item_count: number;
  total_estimate: number | null;
  pdf_path: string | null;
  whatsapp_status: string;
  created_at: string;
};

type Tab = "dashboard" | "products" | "upload" | "orders" | "customers" | "users" | "analytics";
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
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);

  // Auth + role check
  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;
      if (!user) {
        navigate({ to: "/system-login" });
        return;
      }
      setUserEmail(user.email ?? null);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

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
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    setProducts((data as Product[]) || []);
  }, []);

  const loadCustomers = useCallback(async () => {
    const { data } = await supabase
      .from("customers")
      .select("id, email, created_at, full_name, phone, provider, last_login_at, user_id")
      .order("created_at", { ascending: false });
    setCustomers((data as Customer[]) || []);
  }, []);

  const loadLogs = useCallback(async () => {
    const { data } = await supabase
      .from("activity_logs")
      .select("id, action, user_email, created_at, details")
      .order("created_at", { ascending: false })
      .limit(50);
    setLogs((data as ActivityLog[]) || []);
  }, []);

  const loadRoles = useCallback(async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("id, user_id, email, role, created_at")
      .order("created_at", { ascending: false });
    setRoles((data as UserRole[]) || []);
  }, []);

  const loadOrders = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setOrders((data as Order[]) || []);
  }, []);

  useEffect(() => {
    if (!authorized) return;
    loadProducts();
    loadCustomers();
    loadLogs();
    loadRoles();
    loadOrders();

    const ch = supabase
      .channel("admin-products")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => loadProducts())
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, () => loadCustomers())
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_logs" }, () => loadLogs())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => loadRoles())
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadOrders())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [authorized, loadProducts, loadCustomers, loadLogs, loadRoles, loadOrders]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/system-login" });
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    setProducts((p) => p.filter((x) => x.id !== id));
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      alert("Delete failed: " + error.message);
      loadProducts();
    }
  };

  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center">Loading Command Center...</div>;
  }

  const whatsappClicks = logs.filter((l) =>
    (l.action || "").toLowerCase().includes("whatsapp"),
  ).length;

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
          {(["dashboard", "products", "upload", "orders", "customers", "users", "analytics"] as Tab[]).map((t) => (
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
        {tab === "orders" && <OrdersTab orders={orders} />}
        {tab === "customers" && <CustomersTab customers={customers} logs={logs} />}
        {tab === "users" && <UsersTab roles={roles} customers={customers} onChanged={loadRoles} />}
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
            <p className="text-xs text-muted-foreground">
              {p.category || "—"}{p.family ? ` · ${p.family}` : ""}
            </p>
            <p className="text-sm">{p.price != null ? `${p.currency === "USD" ? "$" : "₦"}${Number(p.price).toLocaleString()}` : "—"}</p>
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
  try {
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    
    const { data: upData, error: upErr } = await supabase.storage
      .from("product-images")
      .upload(filename, file, { upsert: true });

    if (!upErr && upData) {
      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filename);
      if (urlData?.publicUrl) return urlData.publicUrl;
    }
  } catch (sErr) {
    console.warn("[upload] Storage error, falling back to API", sErr);
  }

  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload-image", { method: "POST", body: fd });
  const json = await res.json();
  if (!res.ok || !json.url) throw new Error(json.error || "Image upload failed");
  return json.url;
}

function UploadTab({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [family, setFamily] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [description, setDescription] = useState("");
  const [searchKeywords, setSearchKeywords] = useState("");
  const [searchTags, setSearchTags] = useState("");
  
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
    if (!name.trim()) return setStatus("Name required.");
    if (!category) return setStatus("Select a category.");
    if (!initialFile) return setStatus("Select the initial product image.");
    setBusy(true);
    setStatus("Uploading initial image...");
    try {
      const productImageUrl = await uploadImage(initialFile);
      let finishedImageUrl: string | null = null;
      if (finishedFile) {
        setStatus("Uploading finished image...");
        finishedImageUrl = await uploadImage(finishedFile);
      }
      setStatus("Saving product to database...");
      const { data, error } = await supabase
        .from("products")
        .insert({
          product_name: name,
          category: category || null,
          family: family.trim() || null,
          price: price ? Number(price) : null,
          currency,
          product_image: productImageUrl,
          finished_image: finishedImageUrl,
          full_details: description || null,
          search_keywords: searchKeywords.trim() || null,
          search_tags: searchTags.trim() || null,
        })
        .select()
        .single();
      if (error) throw error;
      setStatus("✓ Product uploaded successfully!");
      setName(""); setCategory(""); setFamily(""); setPrice(""); setCurrency("NGN"); setDescription("");
      setSearchKeywords(""); setSearchTags("");
      setInitialFile(null); setFinishedFile(null);
      if (initRef.current) initRef.current.value = "";
      if (finRef.current) finRef.current.value = "";
      onDone();
    } catch (err: any) {
      console.error(err);
      setStatus("Error: " + (err.message || "Failed to upload product"));
    } finally {
      setBusy(false);
    }
  };

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") || "product-name";

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6 border rounded-xl p-6 bg-card">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="text-gold" size={20} /> Upload New Product
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Single source of truth product configuration for Google, WhatsApp & Showroom.</p>
      </div>

      <div className="space-y-4">
        <input
          type="text"
          placeholder="Product Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          required
        />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          >
            <option value="">Select Category *</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Product Family (e.g. Turkish Luxury, 60x60)"
            value={family}
            onChange={(e) => setFamily(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            <option value="NGN">Naira (₦)</option>
            <option value="USD">USD ($)</option>
          </select>
          <input
            type="number"
            step="0.01"
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          />
        </div>

        <textarea
          placeholder="Unified Product Description (Used by Product Page, Google SEO & Search)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full border rounded-md px-3 py-2 text-sm bg-background"
        />

        {/* Master Search Keywords */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
            <Search size={14} className="text-gold" /> Master Search Keywords
          </label>
          <input
            type="text"
            placeholder="e.g. security door, armored door, luxury entrance, Turkish steel door"
            value={searchKeywords}
            onChange={(e) => setSearchKeywords(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          />
          <p className="text-[11px] text-muted-foreground mt-1">Shared by Google Indexing, Internal Showroom Search, and Recommendations.</p>
        </div>

        {/* Master Search Tags */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
            <Tag size={14} className="text-gold" /> Master Search Tags
          </label>
          <input
            type="text"
            placeholder="e.g. premium, heavy-duty, exterior, modern-design"
            value={searchTags}
            onChange={(e) => setSearchTags(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          />
          <p className="text-[11px] text-muted-foreground mt-1">Used for tag matching, Google tags, and collection discovery.</p>
        </div>
      </div>

      {/* Image Uploads */}
      <div className="space-y-4 pt-2 border-t">
        <div>
          <p className="text-xs font-semibold mb-2">1. Initial Product Image *</p>
          <button
            type="button"
            onClick={() => openSystemImagePicker(setInitialFile, initRef.current)}
            className="block w-full text-center border-2 border-dashed rounded-lg p-5 cursor-pointer hover:bg-muted text-xs"
          >
            {initialFile ? `Selected: ${initialFile.name}` : "Tap to Upload Initial Product Image"}
          </button>
          <input ref={initRef} type="file" accept={IMAGE_PICKER_ACCEPT} className="hidden"
            onChange={(e) => setInitialFile(e.target.files?.[0] ?? null)} />
          {initialPreview && (
            <img src={initialPreview} alt="initial preview" className="mt-2 w-full max-h-48 object-contain border rounded-md" />
          )}
        </div>

        <div>
          <p className="text-xs font-semibold mb-2">2. Finished/Lifestyle Installed Image (Optional)</p>
          <button
            type="button"
            onClick={() => openSystemImagePicker(setFinishedFile, finRef.current)}
            className="block w-full text-center border-2 border-dashed rounded-lg p-5 cursor-pointer hover:bg-muted text-xs"
          >
            {finishedFile ? `Selected: ${finishedFile.name}` : "Tap to Upload Finished/Lifestyle Image"}
          </button>
          <input ref={finRef} type="file" accept={IMAGE_PICKER_ACCEPT} className="hidden"
            onChange={(e) => setFinishedFile(e.target.files?.[0] ?? null)} />
          {finishedPreview && (
            <img src={finishedPreview} alt="finished preview" className="mt-2 w-full max-h-48 object-contain border rounded-md" />
          )}
        </div>
      </div>

      {/* Google SEO Live Preview */}
      <div className="border rounded-xl p-4 bg-muted/40 space-y-2 text-left">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Globe size={14} className="text-blue-500" /> Google Search Result Preview
        </p>
        <div className="font-sans">
          <p className="text-xs text-[#202124] truncate">https://great-japhet.vercel.app › product › {slug}</p>
          <h3 className="text-sm font-medium text-[#1a0dab] hover:underline truncate cursor-pointer">
            {name ? `${name} | DE GREAT JAPHET` : "Product Name | DE GREAT JAPHET"}
          </h3>
          <p className="text-xs text-[#4d5156] line-clamp-2 mt-0.5">
            {description || "Unified product description will automatically populate Google indexing, social Open Graph previews, and internal search."}
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 disabled:opacity-50 font-medium text-sm"
      >
        {busy ? "Uploading Product..." : "Save Product"}
      </button>
      {status && <p className="text-xs font-medium text-center">{status}</p>}
    </form>
  );
}

function CustomersTab({ customers, logs }: { customers: Customer[]; logs: ActivityLog[] }) {
  if (customers.length === 0) return <p className="text-muted-foreground text-sm">No customers yet.</p>;
  const requestsByEmail = new Map<string, number>();
  logs.forEach((l) => {
    if (!l.user_email) return;
    if ((l.action || "").toLowerCase().includes("whatsapp")) {
      requestsByEmail.set(l.user_email, (requestsByEmail.get(l.user_email) || 0) + 1);
    }
  });
  const lastByEmail = new Map<string, string>();
  logs.forEach((l) => {
    if (!l.user_email) return;
    if (!lastByEmail.has(l.user_email)) lastByEmail.set(l.user_email, l.created_at);
  });

  return (
    <div className="border rounded-lg overflow-x-auto">
      <table className="w-full text-sm min-w-[720px]">
        <thead className="bg-muted">
          <tr>
            <th className="text-left p-3">Name</th>
            <th className="text-left p-3">Email</th>
            <th className="text-left p-3">Phone</th>
            <th className="text-left p-3">Provider</th>
            <th className="text-left p-3">Joined</th>
            <th className="text-left p-3">Last Activity</th>
            <th className="text-left p-3">Requests</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="p-3">{c.full_name || "—"}</td>
              <td className="p-3">{c.email}</td>
              <td className="p-3">{c.phone || "—"}</td>
              <td className="p-3 capitalize">{c.provider || "email"}</td>
              <td className="p-3">{new Date(c.created_at).toLocaleString()}</td>
              <td className="p-3">{lastByEmail.get(c.email) ? new Date(lastByEmail.get(c.email)!).toLocaleString() : (c.last_login_at ? new Date(c.last_login_at).toLocaleString() : "—")}</td>
              <td className="p-3">{requestsByEmail.get(c.email) || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ROLE_OPTIONS = ["customer", "staff", "super_admin"] as const;

function UsersTab({ roles, customers, onChanged }: { roles: UserRole[]; customers: Customer[]; onChanged: () => void }) {
  const rolesByUser = new Map<string, UserRole[]>();
  roles.forEach((r) => {
    const arr = rolesByUser.get(r.user_id) || [];
    arr.push(r);
    rolesByUser.set(r.user_id, arr);
  });
  const customerByUserId = new Map(customers.filter((c) => c.user_id).map((c) => [c.user_id!, c]));

  const userIds = new Set<string>();
  customers.forEach((c) => c.user_id && userIds.add(c.user_id));
  roles.forEach((r) => userIds.add(r.user_id));

  const setRole = async (user_id: string, email: string | null, newRole: string) => {
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", user_id);
    if (delErr) { alert("Failed: " + delErr.message); return; }
    const { error: insErr } = await supabase.from("user_roles").insert({ user_id, email, role: newRole as any });
    if (insErr) { alert("Failed: " + insErr.message); return; }
    onChanged();
  };

  if (userIds.size === 0) return <p className="text-muted-foreground text-sm">No users yet.</p>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Promote any registered user to <span className="font-medium">staff</span> or <span className="font-medium">super_admin</span> to grant admin dashboard access.
      </p>
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Phone</th>
              <th className="text-left p-3">Current Role</th>
              <th className="text-left p-3">Change Role</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(userIds).map((uid) => {
              const c = customerByUserId.get(uid);
              const userRoles = rolesByUser.get(uid) || [];
              const currentRole = userRoles[0]?.role || "customer";
              const email = c?.email || userRoles[0]?.email || null;
              return (
                <tr key={uid} className="border-t">
                  <td className="p-3">{c?.full_name || "—"}</td>
                  <td className="p-3">{email || "—"}</td>
                  <td className="p-3">{c?.phone || "—"}</td>
                  <td className="p-3 capitalize">{currentRole}</td>
                  <td className="p-3">
                    <select
                      value={currentRole}
                      onChange={(e) => setRole(uid, email, e.target.value)}
                      className="border rounded px-2 py-1 bg-background text-sm"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
  const [family, setFamily] = useState(product.family || "");
  const [price, setPrice] = useState(product.price?.toString() || "");
  const [currency, setCurrency] = useState(product.currency || "NGN");
  const [description, setDescription] = useState(product.full_details || "");
  const [searchKeywords, setSearchKeywords] = useState(product.search_keywords || "");
  const [searchTags, setSearchTags] = useState(product.search_tags || "");
  const [imageUrl, setImageUrl] = useState(product.product_image || "");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const editFileRef = useRef<HTMLInputElement>(null);

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
          family: family.trim() || null,
          price: price ? Number(price) : null,
          currency,
          product_image: url || null,
          full_details: description || null,
          search_keywords: searchKeywords.trim() || null,
          search_tags: searchTags.trim() || null,
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
        className="bg-background w-full max-w-lg rounded-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-lg font-semibold">Edit Product</h2>
        <input className="w-full border rounded px-3 py-2 text-sm bg-background" value={name}
          onChange={(e) => setName(e.target.value)} required />
        <select className="w-full border rounded px-3 py-2 text-sm bg-background" value={category}
          onChange={(e) => setCategory(e.target.value)}>
          <option value="">— Category —</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input className="w-full border rounded px-3 py-2 text-sm bg-background" placeholder="Family (e.g. 60x60, Turkish Luxury)"
          value={family} onChange={(e) => setFamily(e.target.value)} />
        <div className="flex gap-2">
          <select className="border rounded px-3 py-2 text-sm bg-background" value={currency}
            onChange={(e) => setCurrency(e.target.value)}>
            <option value="NGN">Naira (₦)</option>
            <option value="USD">USD ($)</option>
          </select>
          <input className="w-full border rounded px-3 py-2 text-sm bg-background" type="number" step="0.01" placeholder="Price" value={price}
            onChange={(e) => setPrice(e.target.value)} />
        </div>
        <textarea
          className="w-full border rounded px-3 py-2 text-sm bg-background"
          rows={3}
          placeholder="Unified Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          className="w-full border rounded px-3 py-2 text-sm bg-background"
          placeholder="Master Search Keywords"
          value={searchKeywords}
          onChange={(e) => setSearchKeywords(e.target.value)}
        />
        <input
          className="w-full border rounded px-3 py-2 text-sm bg-background"
          placeholder="Master Search Tags"
          value={searchTags}
          onChange={(e) => setSearchTags(e.target.value)}
        />
        {(file ? URL.createObjectURL(file) : imageUrl) && (
          <img
            src={file ? URL.createObjectURL(file) : imageUrl}
            alt="preview"
            className="w-full max-h-48 object-contain border rounded-md"
          />
        )}
        <button
          type="button"
          onClick={() => openSystemImagePicker(setFile, editFileRef.current)}
          className="block w-full text-center border-2 border-dashed rounded-lg p-3 cursor-pointer hover:bg-muted text-xs"
        >
          {file ? `Selected: ${file.name}` : "Replace Image"}
        </button>
        <input ref={editFileRef} type="file" accept={IMAGE_PICKER_ACCEPT} className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 border rounded py-2 text-sm">Cancel</button>
          <button type="submit" disabled={busy}
            className="flex-1 bg-primary text-primary-foreground rounded py-2 text-sm disabled:opacity-50">
            {busy ? "Saving..." : "Save Changes"}
          </button>
        </div>
        {status && <p className="text-xs text-center">{status}</p>}
      </form>
    </div>
  );
}

function OrdersTab({ orders }: { orders: Order[] }) {
  const [q, setQ] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

  const filtered = orders.filter((o) => {
    if (!q.trim()) return true;
    const s = q.trim().toLowerCase();
    return (
      o.order_code.toLowerCase().includes(s) ||
      (o.customer_email || "").toLowerCase().includes(s) ||
      (o.customer_name || "").toLowerCase().includes(s) ||
      (o.customer_phone || "").toLowerCase().includes(s)
    );
  });

  const downloadPdf = async (order: Order) => {
    if (!order.pdf_path) { alert("No PDF on file for this order."); return; }
    setDownloading(order.id);
    try {
      const { data, error } = await supabase.storage
        .from("order-pdfs")
        .createSignedUrl(order.pdf_path, 60 * 5);
      if (error || !data?.signedUrl) throw error || new Error("No URL");
      window.open(data.signedUrl, "_blank");
    } catch (e: any) {
      alert("Could not load PDF: " + (e.message || "error"));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by order code (DGJ-XXXXX), email, name, phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 min-w-[220px] border rounded px-3 py-2 text-sm bg-background"
        />
        <span className="text-xs text-muted-foreground">{filtered.length} of {orders.length} orders</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No orders found.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((o) => (
            <li key={o.id} className="border rounded-lg p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Order Code</p>
                  <p className="font-mono font-bold text-base">{o.order_code}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(o.created_at).toLocaleString()} · {o.item_count} item{o.item_count !== 1 ? "s" : ""}
                    {o.total_estimate ? ` · ₦${Number(o.total_estimate).toLocaleString()}` : ""}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-medium">{o.customer_name || "—"}</p>
                  <p className="text-muted-foreground">{o.customer_email || "—"}</p>
                  <p className="text-muted-foreground">{o.customer_phone || "—"}</p>
                </div>
              </div>

              <ul className="mt-3 space-y-2">
                {(o.items || []).map((it: any, i: number) => (
                  <li key={i} className="flex gap-3 items-start border-t pt-2 first:border-t-0 first:pt-0">
                    <div className="w-14 h-14 rounded bg-muted overflow-hidden border shrink-0">
                      {it.product_image ? (
                        <img src={it.product_image} alt={it.product_name} className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{it.product_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {it.category}{it.item_code ? ` · ${it.item_code}` : ""} · Qty {it.qty}
                      </p>
                      {it.note && (
                        <p className="mt-1 text-xs italic border-l-2 border-primary/50 pl-2 text-foreground/80">
                          {it.note}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => downloadPdf(o)}
                  disabled={!o.pdf_path || downloading === o.id}
                  className="px-3 py-1.5 text-sm border rounded hover:bg-muted disabled:opacity-50"
                >
                  {downloading === o.id ? "Loading…" : o.pdf_path ? "View PDF Invoice" : "No PDF"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
