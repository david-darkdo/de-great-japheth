import { generateProductIntelligence } from "@/lib/productIntelligence";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES } from "@/lib/categories";
import { Search, Globe, Tag, Sparkles, Mail, Send, Filter, History as HistoryIcon, LayoutTemplate, BarChart3, CheckCircle, Clock, Zap, UserCheck, Shield, Upload, Image as ImageIcon, Edit, Eye, Save, Trash2, RefreshCw, Users, Layers, UserPlus } from "lucide-react";
import { CommunicationEngine, EmailTemplate, EmailLog, DEFAULT_TEMPLATES, TemplateKey } from "@/lib/communicationEngine";

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

type Tab = "dashboard" | "products" | "upload" | "orders" | "customers" | "users" | "analytics" | "communication";
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

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload-image", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Image upload failed");
  return data.url;
}

function AdminDashboard() {
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadEmailData = useCallback(async () => {
    const [tplData, logData] = await Promise.all([
      CommunicationEngine.getTemplates(),
      CommunicationEngine.getLogs(),
    ]);
    setEmailTemplates((tplData as EmailTemplate[]) || []);
    setEmailLogs((logData as EmailLog[]) || []);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate({ to: "/system-login", search: { redirect: "/admin" } });
        return;
      }
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!data || (data.role !== "admin" && data.role !== "super_admin")) {
            navigate({ to: "/system-login", search: { redirect: "/admin" } });
          } else {
            setAuthed(true);
            setLoading(false);
          }
        });
    });
  }, [navigate]);

  const loadProducts = () =>
    supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setProducts((data as Product[]) || []));

  const loadCustomers = () =>
    supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setCustomers((data as Customer[]) || []));

  const loadLogs = () =>
    supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => setLogs((data as ActivityLog[]) || []));

  const loadRoles = () =>
    supabase
      .from("user_roles")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRoles((data as UserRole[]) || []));

  const loadOrders = () =>
    supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data as Order[]) || []));

  useEffect(() => {
    if (!authed) return;
    loadProducts();
    loadCustomers();
    loadLogs();
    loadRoles();
    loadOrders();
    loadEmailData();

    const sub = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => loadProducts())
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, () => loadCustomers())
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_logs" }, () => loadLogs())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => loadRoles())
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadOrders())
      .on("postgres_changes", { event: "*", schema: "public", table: "email_logs" }, () => loadEmailData())
      .on("postgres_changes", { event: "*", schema: "public", table: "email_templates" }, () => loadEmailData())
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [authed, loadEmailData]);

  const deleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    await supabase.from("products").delete().eq("id", id);
    loadProducts();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/system-login" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        Checking admin permissions...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-shimmer">De Great Japhet Admin</h1>
          <p className="text-xs text-muted-foreground">Showroom Catalog & Customer Operating System</p>
        </div>
        <button
          onClick={handleSignOut}
          className="text-xs text-muted-foreground hover:text-foreground border border-border rounded px-3 py-1.5"
        >
          Sign Out
        </button>
      </header>

      <div className="border-b border-border bg-card/50 px-6">
        <nav className="flex gap-4 overflow-x-auto">
          {(["dashboard", "products", "upload", "orders", "communication", "customers", "users", "analytics"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 text-sm border-b-2 capitalize transition-colors whitespace-nowrap ${
                tab === t ? "border-primary font-medium text-gold" : "border-transparent text-muted-foreground"
              }`}
            >
              {t === "communication" ? "Customer Communication" : t === "users" ? "User Management" : t}
            </button>
          ))}
        </nav>
      </div>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {tab === "dashboard" && (
          <DashboardTab
            products={products}
            customers={customers}
            orders={orders}
            logs={logs}
            onNav={setTab}
          />
        )}
        {tab === "products" && (
          <ProductsTab products={products} onEdit={setEditing} onDelete={deleteProduct} />
        )}
        {tab === "upload" && <UploadTab onDone={loadProducts} />}
        {tab === "orders" && <OrdersTab orders={orders} />}
        {tab === "communication" && (
          <CommunicationCenterTab
            templates={emailTemplates}
            logs={emailLogs}
            customers={customers}
            roles={roles}
            orders={orders}
            onRefresh={loadEmailData}
          />
        )}
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

function DashboardTab({
  products,
  customers,
  orders,
  logs,
  onNav,
}: {
  products: Product[];
  customers: Customer[];
  orders: Order[];
  logs: ActivityLog[];
  onNav: (t: Tab) => void;
}) {
  const totalVal = products.reduce((s, p) => s + (p.price ?? 0), 0);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="border rounded-xl p-4 bg-card">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Products</p>
          <p className="text-2xl font-bold mt-1 text-gold">{products.length}</p>
        </div>
        <div className="border rounded-xl p-4 bg-card">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Customers</p>
          <p className="text-2xl font-bold mt-1 text-gold">{customers.length}</p>
        </div>
        <div className="border rounded-xl p-4 bg-card">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Orders / Enquiries</p>
          <p className="text-2xl font-bold mt-1 text-gold">{orders.length}</p>
        </div>
        <div className="border rounded-xl p-4 bg-card">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Catalog Value</p>
          <p className="text-2xl font-bold mt-1 text-gold">₦{totalVal.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="border rounded-xl p-5 bg-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onNav("upload")}
              className="p-3 border rounded-lg hover:border-gold hover:text-gold text-xs text-left transition flex items-center gap-2"
            >
              <Sparkles size={16} className="text-gold" /> Upload New Product
            </button>
            <button
              onClick={() => onNav("communication")}
              className="p-3 border rounded-lg hover:border-gold hover:text-gold text-xs text-left transition flex items-center gap-2"
            >
              <Mail size={16} className="text-gold" /> Email Operating System
            </button>
          </div>
        </div>

        <div className="border rounded-xl p-5 bg-card">
          <h3 className="text-sm font-semibold mb-3">Recent Activity</h3>
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No recent activity recorded.</p>
          ) : (
            <div className="space-y-2">
              {logs.slice(0, 5).map((l) => (
                <div key={l.id} className="text-xs flex justify-between border-b pb-1.5 border-border/40">
                  <span className="font-medium text-foreground">{l.action}</span>
                  <span className="text-muted-foreground">{new Date(l.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
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
  const [q, setQ] = useState("");
  const filtered = products.filter(
    (p) =>
      p.product_name.toLowerCase().includes(q.toLowerCase()) ||
      (p.category || "").toLowerCase().includes(q.toLowerCase()) ||
      (p.family || "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Search catalog products..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="border rounded px-3 py-2 text-xs bg-background max-w-xs w-full"
        />
        <p className="text-xs text-muted-foreground">Showing {filtered.length} products</p>
      </div>

      <div className="border rounded-xl overflow-hidden bg-card">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/50 border-b border-border uppercase tracking-wider text-[10px] text-muted-foreground">
            <tr>
              <th className="p-3">Product Name</th>
              <th className="p-3">Category</th>
              <th className="p-3">Family</th>
              <th className="p-3">Price</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-muted/20">
                <td className="p-3 font-medium flex items-center gap-2">
                  {p.product_image && <img src={p.product_image} alt="" className="w-8 h-8 object-cover rounded" />}
                  <span>{p.product_name}</span>
                </td>
                <td className="p-3 text-muted-foreground">{p.category || "—"}</td>
                <td className="p-3 text-muted-foreground">{p.family || "—"}</td>
                <td className="p-3 font-semibold text-gold">₦{Number(p.price || 0).toLocaleString()}</td>
                <td className="p-3 text-right space-x-2">
                  <button onClick={() => onEdit(p)} className="text-gold hover:underline">Edit</button>
                  <button onClick={() => onDelete(p.id)} className="text-red-400 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UploadTab({ onDone }: { onDone: () => void }) {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [family, setFamily] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [description, setDescription] = useState("");
  const [searchKeywords, setSearchKeywords] = useState("");
  const [searchTags, setSearchTags] = useState("");
  const [initialFile, setInitialFile] = useState<File | null>(null);
  const [finishedFile, setFinishedFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [showPromptManager, setShowPromptManager] = useState(false);

  const initRef = useRef<HTMLInputElement>(null);
  const finRef = useRef<HTMLInputElement>(null);

  const handleGenerateAi = async () => {
    if (!productName.trim()) {
      alert("Please enter a product name first before generating AI intelligence.");
      return;
    }
    setBusy(true);
    setStatus("Generating AI Product Intelligence & SEO...");
    try {
      let initUrl = "";
      if (initialFile) {
        setStatus("Uploading image for AI visual analysis...");
        initUrl = await uploadImage(initialFile);
      }
      const aiData = await generateProductIntelligence({
        productName,
        category: category || "Building Materials",
        family,
        price: price ? Number(price) : undefined,
        currency,
        description,
        manualSpecs: `Family: ${family}, Tags: ${searchTags}`,
        productImage: initUrl || undefined,
      });

      if (aiData) {
        if (aiData.description) setDescription(aiData.description);
        if (Array.isArray(aiData.search_keywords)) setSearchKeywords(aiData.search_keywords.join(", "));
        if (Array.isArray(aiData.seo_keywords)) setSearchTags(aiData.seo_keywords.join(", "));
        setStatus("✓ AI Product Intelligence generated successfully!");
      }
    } catch (e: any) {
      console.error(e);
      setStatus("Error generating AI: " + (e.message || "Failed"));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialFile) {
      alert("Please select a main product image.");
      return;
    }
    setBusy(true);
    setStatus("Uploading main product image...");
    try {
      const initUrl = await uploadImage(initialFile);
      let finUrl = "";
      if (finishedFile) {
        setStatus("Uploading finished/installed image...");
        finUrl = await uploadImage(finishedFile);
      }

      setStatus("Saving product catalog entry...");
      const { error } = await supabase.from("products").insert({
        product_name: productName,
        category: category || null,
        family: family.trim() || null,
        price: price ? Number(price) : null,
        currency,
        product_image: initUrl,
        finished_image: finUrl || null,
        full_details: description || null,
        search_keywords: searchKeywords.trim() || null,
        search_tags: searchTags.trim() || null,
      });

      if (error) throw error;
      setStatus("✓ Product uploaded successfully!");
      setProductName(""); setCategory(""); setFamily(""); setPrice(""); setDescription("");
      setSearchKeywords(""); setSearchTags(""); setInitialFile(null); setFinishedFile(null);
      onDone();
    } catch (err: any) {
      console.error(err);
      setStatus("Error: " + (err.message || "Failed to upload product"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-xl p-6 bg-card space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="text-gold" size={20} /> Upload Product with AI Intelligence
          </h2>
          <p className="text-xs text-muted-foreground">Every product automatically becomes a Google-indexable page & 2-level searchable showroom item.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowPromptManager(true)}
          className="text-xs border border-gold/40 text-gold hover:bg-gold/10 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition"
        >
          <Sparkles size={14} /> Prompt Manager
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold mb-1">Product Name *</label>
          <input
            type="text"
            required
            placeholder="e.g. Virony 60x60 Luxury Polish Tile"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          >
            <option value="">— Select Category —</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">Family / Collection Series</label>
          <input
            type="text"
            placeholder="e.g. 60x60, Turkish Armored, Royal Gold"
            value={family}
            onChange={(e) => setFamily(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          />
        </div>

        <div className="flex gap-2">
          <div className="w-1/3">
            <label className="block text-xs font-semibold mb-1">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full border rounded-md px-2 py-2 text-sm bg-background"
            >
              <option value="NGN">NGN (₦)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
          <div className="w-2/3">
            <label className="block text-xs font-semibold mb-1">Price</label>
            <input
              type="number"
              step="0.01"
              placeholder="e.g. 18500"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            />
          </div>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={handleGenerateAi}
          disabled={busy || !productName.trim()}
          className="w-full py-2.5 bg-gold/10 border border-gold/40 text-gold hover:bg-gold/20 font-semibold rounded-lg text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          <Sparkles size={16} /> Auto-Generate AI Description, SEO & Level-2 Search Metadata
        </button>
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1">Unified Product Description (AI Generated or Manual)</label>
        <textarea
          rows={4}
          placeholder="Authoritative description populated automatically by AI..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border rounded-md px-3 py-2 text-sm bg-background"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold mb-1">Master Search Keywords (Level 2 Index)</label>
          <input
            type="text"
            placeholder="e.g. polished marble, living room floor tiles"
            value={searchKeywords}
            onChange={(e) => setSearchKeywords(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          />
          <p className="text-[11px] text-muted-foreground mt-1">Used for Level-2 showroom search matching.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">Master Search Tags (Level 2 Index)</label>
          <input
            type="text"
            placeholder="e.g. virony, turkish, luxury, imported"
            value={searchTags}
            onChange={(e) => setSearchTags(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          />
          <p className="text-[11px] text-muted-foreground mt-1">Used for tag matching, Google tags, and collection discovery.</p>
        </div>
      </div>

      <div className="space-y-4 pt-2 border-t">
        <div>
          <p className="text-xs font-semibold mb-2">1. Initial Product Image *</p>
          <button
            type="button"
            onClick={() => openSystemImagePicker(setInitialFile, initRef.current)}
            className="block w-full text-center border-2 border-dashed rounded-lg p-5 cursor-pointer hover:bg-muted text-xs"
          >
            {initialFile ? `Selected: ${initialFile.name}` : "Choose Main Product Image"}
          </button>
          <input ref={initRef} type="file" accept={IMAGE_PICKER_ACCEPT} className="hidden"
            onChange={(e) => setInitialFile(e.target.files?.[0] ?? null)} />
        </div>

        <div>
          <p className="text-xs font-semibold mb-2">2. Finished / Installed Image (Optional)</p>
          <button
            type="button"
            onClick={() => openSystemImagePicker(setFinishedFile, finRef.current)}
            className="block w-full text-center border-2 border-dashed rounded-lg p-5 cursor-pointer hover:bg-muted text-xs"
          >
            {finishedFile ? `Selected: ${finishedFile.name}` : "Choose Installed/Finished Image"}
          </button>
          <input ref={finRef} type="file" accept={IMAGE_PICKER_ACCEPT} className="hidden"
            onChange={(e) => setFinishedFile(e.target.files?.[0] ?? null)} />
        </div>
      </div>

      {status && <p className="text-xs text-center font-medium">{status}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full py-3 bg-gradient-gold text-[var(--cta-foreground)] font-semibold rounded-lg shadow-gold hover:opacity-90 transition disabled:opacity-50 text-sm"
      >
        {busy ? "Uploading Product..." : "Publish Product"}
      </button>

      {showPromptManager && <PromptTemplateManagerModal onClose={() => setShowPromptManager(false)} />}
    </form>
  );
}

function CommunicationCenterTab({
  templates,
  logs,
  customers,
  roles,
  orders,
  onRefresh,
}: {
  templates: EmailTemplate[];
  logs: EmailLog[];
  customers: Customer[];
  roles: UserRole[];
  orders: Order[];
  onRefresh: () => void;
}) {
  const [commSubTab, setCommSubTab] = useState<"manual" | "templates" | "logs">("manual");
  
  // Manual Email state & Audience Filter
  const [audienceFilter, setAudienceFilter] = useState<"all" | "customers" | "admins" | "super_admins" | "recently_joined" | "collection_owners" | "custom">("all");
  const [manualRecipient, setManualRecipient] = useState<string>("");
  const [manualSubject, setManualSubject] = useState<string>("Direct Announcement — DE GREAT JAPHET");
  const [manualBody, setManualBody] = useState<string>("Thank you for choosing DE GREAT JAPHET for your architectural finishing project.");
  const [manualButtonText, setManualButtonText] = useState<string>("Browse Luxury Showroom");
  const [manualButtonUrl, setManualButtonUrl] = useState<string>("/showroom");
  const [manualPhotoFile, setManualPhotoFile] = useState<File | null>(null);
  const [manualPhotoUrl, setManualPhotoUrl] = useState<string>("/assets/email_welcome_banner.jpg");
  const [sendingManual, setSendingManual] = useState(false);
  const [manualSendResult, setManualSendResult] = useState<string>("");
  const manualFileRef = useRef<HTMLInputElement>(null);

  // Template Editor state
  const [selectedTplKey, setSelectedTplKey] = useState<TemplateKey>("welcome");
  const [tplSubject, setTplSubject] = useState("");
  const [tplTitle, setTplTitle] = useState("");
  const [tplBodyHtml, setTplBodyHtml] = useState("");
  const [tplButtonText, setTplButtonText] = useState("");
  const [tplButtonLink, setTplButtonLink] = useState("");
  const [tplFooterText, setTplFooterText] = useState("");
  const [tplBannerUrl, setTplBannerUrl] = useState("");
  const [tplBannerFile, setTplBannerFile] = useState<File | null>(null);
  const [savingTpl, setSavingTpl] = useState(false);
  const [tplResult, setTplResult] = useState("");
  const tplFileRef = useRef<HTMLInputElement>(null);

  // Log filter
  const [filterType, setFilterType] = useState<string>("all");

  const currentTemplate = templates.find((t) => t.key === selectedTplKey) || DEFAULT_TEMPLATES.find((t) => t.key === selectedTplKey);

  useEffect(() => {
    if (currentTemplate) {
      setTplSubject(currentTemplate.subject || "");
      setTplTitle(currentTemplate.title || currentTemplate.name);
      setTplBodyHtml(currentTemplate.body_html || "");
      setTplButtonText(currentTemplate.button_text || "Explore Showroom Catalog");
      setTplButtonLink(currentTemplate.button_link || "/showroom");
      setTplFooterText(currentTemplate.footer_text || "DE GREAT JAPHET • Quality & Luxury Architectural Finishing");
      setTplBannerUrl(currentTemplate.banner_url || "/assets/email_welcome_banner.jpg");
    }
  }, [selectedTplKey, templates]);

  // Compute recipients based on Audience Filter
  const getAudienceRecipients = (): string[] => {
    if (audienceFilter === "custom") {
      return manualRecipient ? [manualRecipient] : [];
    }
    if (audienceFilter === "all") {
      const emails = new Set<string>();
      customers.forEach(c => c.email && emails.add(c.email));
      roles.forEach(r => r.email && emails.add(r.email));
      return Array.from(emails);
    }
    if (audienceFilter === "customers") {
      return customers.map(c => c.email).filter(Boolean);
    }
    if (audienceFilter === "admins") {
      const adminUserIds = new Set(roles.filter(r => r.role === "admin" || r.role === "super_admin").map(r => r.user_id));
      return customers.filter(c => adminUserIds.has(c.user_id || c.id) || roles.some(r => r.email === c.email && r.role === "admin")).map(c => c.email);
    }
    if (audienceFilter === "super_admins") {
      const superAdminUserIds = new Set(roles.filter(r => r.role === "super_admin").map(r => r.user_id));
      return customers.filter(c => superAdminUserIds.has(c.user_id || c.id) || roles.some(r => r.email === c.email && r.role === "super_admin")).map(c => c.email);
    }
    if (audienceFilter === "recently_joined") {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return customers.filter(c => new Date(c.created_at) >= thirtyDaysAgo).map(c => c.email);
    }
    if (audienceFilter === "collection_owners") {
      const orderEmails = new Set(orders.map(o => o.customer_email).filter(Boolean));
      return Array.from(orderEmails) as string[];
    }
    return [];
  };

  const targetRecipients = getAudienceRecipients();

  const handleAttachPhoto = async (file: File | null) => {
    if (!file) return;
    setManualPhotoFile(file);
    try {
      const url = await uploadImage(file);
      setManualPhotoUrl(url);
    } catch (e: any) {
      alert("Failed to upload photo: " + e.message);
    }
  };

  const handleSendManualEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetRecipients.length === 0) {
      alert("No valid recipient emails found for the selected audience filter.");
      return;
    }
    setSendingManual(true);
    setManualSendResult("");
    try {
      let sentCount = 0;
      let failCount = 0;

      const renderedBodyHtml = CommunicationEngine.renderTemplateHtml({
        title: manualSubject,
        body_html: `<p style="line-height:1.6; color:#cccccc;">${manualBody.replace(/\n/g, '<br />')}</p>`,
        button_text: manualButtonText,
        button_link: manualButtonUrl,
        banner_url: manualPhotoUrl,
        footer_text: "DE GREAT JAPHET Direct Campaign Operations"
      });

      for (const email of targetRecipients) {
        const res = await CommunicationEngine.send({
          templateKey: "manual_campaign",
          recipientEmail: email,
          metadata: {
            customSubject: manualSubject,
            customBodyHtml: renderedBodyHtml,
            audienceFilter,
          },
        });
        if (res.success) sentCount++;
        else failCount++;
      }

      setManualSendResult(`✓ Manual Email Campaign delivered! Sent: ${sentCount}, Failed: ${failCount}`);
      onRefresh();
    } catch (err: any) {
      setManualSendResult(`Error sending campaign: ${err.message}`);
    } finally {
      setSendingManual(false);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTpl(true);
    setTplResult("");
    try {
      let banner = tplBannerUrl;
      if (tplBannerFile) {
        banner = await uploadImage(tplBannerFile);
      }
      const ok = await CommunicationEngine.updateTemplate(selectedTplKey, {
        name: currentTemplate?.name || selectedTplKey,
        subject: tplSubject,
        title: tplTitle,
        body_html: tplBodyHtml,
        button_text: tplButtonText,
        button_link: tplButtonLink,
        footer_text: tplFooterText,
        banner_url: banner,
      });

      if (ok) {
        setTplResult("✓ Email Template updated and saved to database successfully!");
        setTplBannerFile(null);
        onRefresh();
      } else {
        throw new Error("Failed to update template in database");
      }
    } catch (err: any) {
      setTplResult("Error: " + err.message);
    } finally {
      setSavingTpl(false);
    }
  };

  const filteredLogs = logs.filter((l) => (filterType === "all" ? true : l.status === filterType));

  return (
    <div className="space-y-6">
      <div className="border rounded-xl p-6 bg-card space-y-4">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Mail className="text-gold" size={20} /> Customer Communication Operating System
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Send targeted manual campaigns with image attachments, edit automated templates, and monitor SendGrid logs.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCommSubTab("manual")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                commSubTab === "manual" ? "bg-gold text-black shadow-gold" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Send size={14} /> Manual Composer
            </button>
            <button
              onClick={() => setCommSubTab("templates")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                commSubTab === "templates" ? "bg-gold text-black shadow-gold" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Edit size={14} /> Template Manager
            </button>
            <button
              onClick={() => setCommSubTab("logs")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                commSubTab === "logs" ? "bg-gold text-black shadow-gold" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <HistoryIcon size={14} /> Delivery Logs
            </button>
          </div>
        </div>

        {/* SUB-TAB 1: MANUAL EMAIL COMPOSER */}
        {commSubTab === "manual" && (
          <form onSubmit={handleSendManualEmail} className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-gold">
              <Send size={16} /> Restore Manual Email Composer (Audience Filters + Banner Image + Live Preview)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Target Audience Filter *</label>
                <select
                  value={audienceFilter}
                  onChange={(e) => setAudienceFilter(e.target.value as any)}
                  className="w-full border rounded px-3 py-2 text-xs bg-background font-medium mb-2"
                >
                  <option value="all">All Registered Users ({customers.length})</option>
                  <option value="customers">Customers Only ({customers.length})</option>
                  <option value="admins">Admins & Staff ({roles.filter(r => r.role === 'admin' || r.role === 'super_admin').length})</option>
                  <option value="super_admins">Super Admins Only ({roles.filter(r => r.role === 'super_admin').length})</option>
                  <option value="recently_joined">Recently Joined (Last 30 Days)</option>
                  <option value="collection_owners">Collection / Order Owners ({orders.length})</option>
                  <option value="custom">Custom Selection / Single Email</option>
                </select>

                {audienceFilter === "custom" && (
                  <input
                    type="email"
                    placeholder="Enter custom recipient email address *"
                    value={manualRecipient}
                    onChange={(e) => setManualRecipient(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-xs bg-background"
                    required
                  />
                )}

                <p className="text-[11px] text-gold font-medium mt-1">
                  Targeted Recipients ({targetRecipients.length}): {targetRecipients.slice(0, 3).join(", ")}{targetRecipients.length > 3 ? "..." : ""}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Email Subject Line *</label>
                <input
                  type="text"
                  placeholder="e.g. Official Project Estimate Presentation — DE GREAT JAPHET"
                  value={manualSubject}
                  onChange={(e) => setManualSubject(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-xs bg-background"
                  required
                />
              </div>
            </div>

            {/* Banner Image Upload & Controls (Upload, Preview, Replace, Remove) */}
            <div className="border border-border/80 rounded-lg p-4 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ImageIcon size={15} className="text-gold" /> Banner Image Attachment
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openSystemImagePicker(handleAttachPhoto, manualFileRef.current)}
                    className="px-3 py-1 border rounded text-[11px] hover:bg-muted transition flex items-center gap-1"
                  >
                    <Upload size={12} /> {manualPhotoUrl ? "Replace Banner" : "Upload Banner"}
                  </button>
                  {manualPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => { setManualPhotoFile(null); setManualPhotoUrl(""); }}
                      className="px-3 py-1 border border-red-500/40 text-red-400 rounded text-[11px] hover:bg-red-500/10 transition flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  )}
                </div>
              </div>

              <input
                ref={manualFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleAttachPhoto(e.target.files?.[0] || null)}
              />

              {manualPhotoUrl ? (
                <div className="border rounded p-2 bg-black/40 flex items-center gap-3">
                  <img src={manualPhotoUrl} alt="Banner Preview" className="w-20 h-12 object-cover rounded border" />
                  <div>
                    <p className="text-xs font-semibold text-gold">Banner Image Preview</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-xs">{manualPhotoUrl}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No banner image attached.</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Rich Text Body Content</label>
              <textarea
                rows={5}
                placeholder="Type main email message text..."
                value={manualBody}
                onChange={(e) => setManualBody(e.target.value)}
                className="w-full border rounded px-3 py-2 text-xs bg-background font-sans"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Action Button Text</label>
                <input
                  type="text"
                  value={manualButtonText}
                  onChange={(e) => setManualButtonText(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-xs bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Action Button Target URL</label>
                <input
                  type="text"
                  value={manualButtonUrl}
                  onChange={(e) => setManualButtonUrl(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-xs bg-background"
                />
              </div>
            </div>

            {/* Live Interactive Email Preview Box */}
            <div className="border rounded-lg p-4 bg-black/40 space-y-2">
              <p className="text-xs font-semibold text-gold flex items-center gap-1.5">
                <Eye size={14} /> Outgoing Campaign Live Visual Preview
              </p>
              <div className="border border-border/60 rounded p-4 bg-[#111] text-xs text-foreground">
                <div
                  dangerouslySetInnerHTML={{
                    __html: CommunicationEngine.renderTemplateHtml({
                      title: manualSubject,
                      body_html: `<p style="line-height:1.6; color:#cccccc;">${manualBody.replace(/\n/g, '<br />')}</p>`,
                      button_text: manualButtonText,
                      button_link: manualButtonUrl,
                      banner_url: manualPhotoUrl,
                      footer_text: "DE GREAT JAPHET Direct Campaign Operations"
                    }),
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {manualSendResult ? (
                <p className={`text-xs font-medium ${manualSendResult.startsWith("✓") ? "text-emerald-400" : "text-red-400"}`}>
                  {manualSendResult}
                </p>
              ) : <span />}
              <button
                type="submit"
                disabled={sendingManual || targetRecipients.length === 0}
                className="px-6 py-2.5 bg-gradient-gold text-[var(--cta-foreground)] font-semibold rounded-lg text-xs shadow-gold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                <Send size={15} /> {sendingManual ? "Dispatching Campaign..." : `Send Campaign (${targetRecipients.length} Recipients)`}
              </button>
            </div>
          </form>
        )}

        {/* SUB-TAB 2: TEMPLATE MANAGER */}
        {commSubTab === "templates" && (
          <form onSubmit={handleSaveTemplate} className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-gold">
              <Edit size={16} /> Edit Automated Email Templates (Subject, Title, Body, Button, Footer, Banner Image)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Select Template *</label>
                <select
                  value={selectedTplKey}
                  onChange={(e) => setSelectedTplKey(e.target.value as TemplateKey)}
                  className="w-full border rounded px-3 py-2 text-xs bg-background font-medium"
                >
                  <option value="welcome">Welcome Email</option>
                  <option value="collection_reminder">Collection Reminder (24h)</option>
                  <option value="abandoned_collection">Abandoned Collection (72h)</option>
                  <option value="monthly_newsletter">Monthly Newsletter</option>
                  <option value="holiday_campaign">Holiday Special Campaign</option>
                  <option value="manual_campaign">Manual Campaign Template</option>
                  <option value="system_notification">System Notification</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Subject Line *</label>
                <input
                  type="text"
                  value={tplSubject}
                  onChange={(e) => setTplSubject(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-xs bg-background"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Header Title *</label>
                <input
                  type="text"
                  value={tplTitle}
                  onChange={(e) => setTplTitle(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-xs bg-background"
                  required
                />
              </div>
            </div>

            {/* Template Banner Image Controls (Upload, Preview, Replace, Remove) */}
            <div className="border border-border/80 rounded-lg p-4 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ImageIcon size={15} className="text-gold" /> Template Banner Image (Upload / Preview / Replace / Remove)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openSystemImagePicker(setTplBannerFile, tplFileRef.current)}
                    className="px-3 py-1 border rounded text-[11px] hover:bg-muted transition flex items-center gap-1"
                  >
                    <Upload size={12} /> {tplBannerUrl || tplBannerFile ? "Replace Banner" : "Upload Banner"}
                  </button>
                  {(tplBannerUrl || tplBannerFile) && (
                    <button
                      type="button"
                      onClick={() => { setTplBannerFile(null); setTplBannerUrl(""); }}
                      className="px-3 py-1 border border-red-500/40 text-red-400 rounded text-[11px] hover:bg-red-500/10 transition flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  )}
                </div>
              </div>

              <input
                ref={tplFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setTplBannerFile(e.target.files?.[0] || null)}
              />

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTplBannerUrl("/assets/email_welcome_banner.jpg")}
                  className={`p-1.5 border rounded text-[11px] ${tplBannerUrl === "/assets/email_welcome_banner.jpg" ? "border-gold text-gold" : ""}`}
                >
                  Welcome Banner Placeholder
                </button>
                <button
                  type="button"
                  onClick={() => setTplBannerUrl("/assets/email_collection_banner.jpg")}
                  className={`p-1.5 border rounded text-[11px] ${tplBannerUrl === "/assets/email_collection_banner.jpg" ? "border-gold text-gold" : ""}`}
                >
                  Collection Banner Placeholder
                </button>
                <button
                  type="button"
                  onClick={() => setTplBannerUrl("/assets/email_newsletter_banner.jpg")}
                  className={`p-1.5 border rounded text-[11px] ${tplBannerUrl === "/assets/email_newsletter_banner.jpg" ? "border-gold text-gold" : ""}`}
                >
                  Newsletter Banner Placeholder
                </button>
              </div>

              {(tplBannerFile || tplBannerUrl) && (
                <div className="border rounded p-2 bg-black/40 flex items-center gap-3">
                  <img src={tplBannerFile ? URL.createObjectURL(tplBannerFile) : tplBannerUrl} alt="Banner Preview" className="w-20 h-12 object-cover rounded border" />
                  <p className="text-[11px] text-muted-foreground truncate max-w-xs">{tplBannerFile ? tplBannerFile.name : tplBannerUrl}</p>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold">Email Body HTML / Text</label>
                <span className="text-[10px] text-gold font-mono">Variables: {"{{customer_name}}, {{shop_url}}, {{banner_url}}"}</span>
              </div>
              <textarea
                rows={6}
                value={tplBodyHtml}
                onChange={(e) => setTplBodyHtml(e.target.value)}
                className="w-full border rounded px-3 py-2 text-xs bg-background font-mono leading-relaxed"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Button Text</label>
                <input
                  type="text"
                  value={tplButtonText}
                  onChange={(e) => setTplButtonText(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-xs bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Button Link / Route</label>
                <input
                  type="text"
                  value={tplButtonLink}
                  onChange={(e) => setTplButtonLink(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-xs bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Footer Text</label>
                <input
                  type="text"
                  value={tplFooterText}
                  onChange={(e) => setTplFooterText(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-xs bg-background"
                />
              </div>
            </div>

            {/* Template Rendered Live Visual Preview */}
            <div className="border rounded-lg p-4 bg-black/40 space-y-2">
              <p className="text-xs font-semibold text-gold flex items-center gap-1.5">
                <Eye size={14} /> Template Rendered Visual Preview
              </p>
              <div className="border border-border/60 rounded p-4 bg-[#111] text-xs text-foreground overflow-x-auto">
                <div
                  dangerouslySetInnerHTML={{
                    __html: CommunicationEngine.renderTemplateHtml({
                      title: tplTitle,
                      body_html: tplBodyHtml,
                      button_text: tplButtonText,
                      button_link: tplButtonLink,
                      footer_text: tplFooterText,
                      banner_url: tplBannerFile ? URL.createObjectURL(tplBannerFile) : tplBannerUrl,
                    }, { customer_name: "Valued Customer" }),
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {tplResult ? (
                <p className={`text-xs font-medium ${tplResult.startsWith("✓") ? "text-emerald-400" : "text-red-400"}`}>
                  {tplResult}
                </p>
              ) : <span />}
              <button
                type="submit"
                disabled={savingTpl}
                className="px-6 py-2.5 bg-gradient-gold text-[var(--cta-foreground)] font-semibold rounded-lg text-xs shadow-gold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={15} /> {savingTpl ? "Saving Template Changes..." : "Save Template Changes"}
              </button>
            </div>
          </form>
        )}

        {/* SUB-TAB 3: DELIVERY LOGS */}
        {commSubTab === "logs" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <HistoryIcon size={16} className="text-gold" /> Delivery Logs History
              </h3>
              <div className="flex gap-2">
                {(["all", "sent", "failed", "pending"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterType(s)}
                    className={`px-3 py-1 rounded text-xs capitalize border ${
                      filterType === s ? "bg-gold/20 text-gold border-gold" : "border-border text-muted-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b border-border uppercase tracking-wider text-[10px] text-muted-foreground">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Campaign / Workflow</th>
                    <th className="p-3">Recipient</th>
                    <th className="p-3">Subject</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground">
                        No delivery logs found for filter '{filterType}'.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.slice(0, 50).map((l) => (
                      <tr key={l.id} className="hover:bg-muted/20">
                        <td className="p-3 text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td>
                        <td className="p-3 font-medium text-foreground">{l.template_key || l.campaign_id}</td>
                        <td className="p-3 text-muted-foreground">{l.recipient_email}</td>
                        <td className="p-3 text-foreground font-medium max-w-xs truncate">{l.subject}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              l.status === "sent" || l.status === "delivered"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : l.status === "failed"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-amber-500/20 text-amber-400"
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
  const [name, setName] = useState(product.product_name || "");
  const [category, setCategory] = useState(product.category || "");
  const [family, setFamily] = useState(product.family || "");
  const [price, setPrice] = useState(product.price ? String(product.price) : "");
  const [currency, setCurrency] = useState(product.currency || "NGN");
  const [description, setDescription] = useState(product.full_details || "");
  const [searchKeywords, setSearchKeywords] = useState(product.search_keywords || "");
  const [searchTags, setSearchTags] = useState(product.search_tags || "");
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState(product.product_image || "");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const editFileRef = useRef<HTMLInputElement>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setStatus("Saving changes...");
    try {
      let url = imageUrl;
      if (file) {
        setStatus("Uploading new image...");
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
      setStatus("Error: " + (err.message || "Failed to update product"));
    } finally {
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
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Orders & Enquiries</h2>
      <div className="border rounded-xl overflow-hidden bg-card">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/50 border-b border-border uppercase tracking-wider text-[10px] text-muted-foreground">
            <tr>
              <th className="p-3">Order Code</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Items Count</th>
              <th className="p-3">Estimate</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {orders.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No orders found</td></tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="hover:bg-muted/20">
                  <td className="p-3 font-semibold text-gold">{o.order_code}</td>
                  <td className="p-3 text-foreground">{o.customer_name || o.customer_email || "Anonymous"}</td>
                  <td className="p-3 text-muted-foreground">{o.customer_phone || "—"}</td>
                  <td className="p-3">{o.item_count} items</td>
                  <td className="p-3 font-medium">₦{Number(o.total_estimate || 0).toLocaleString()}</td>
                  <td className="p-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomersTab({ customers, logs }: { customers: Customer[]; logs: ActivityLog[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const filtered = customers.filter(
    (c) =>
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone || "").includes(searchQuery)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserCheck className="text-gold" size={20} /> Registered Customers ({customers.length})
          </h2>
          <p className="text-xs text-muted-foreground">All authenticated users who signed up or placed enquiries.</p>
        </div>
        <input
          type="text"
          placeholder="Filter customers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border rounded px-3 py-1.5 text-xs bg-background w-64"
        />
      </div>

      <div className="border rounded-xl overflow-hidden bg-card">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/50 border-b border-border uppercase tracking-wider text-[10px] text-muted-foreground">
            <tr>
              <th className="p-3">Full Name</th>
              <th className="p-3">Email Address</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Auth Provider</th>
              <th className="p-3">User ID</th>
              <th className="p-3">Joined Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No customers found</td></tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-muted/20">
                  <td className="p-3 font-medium text-foreground">{c.full_name || "—"}</td>
                  <td className="p-3 text-gold font-medium">{c.email}</td>
                  <td className="p-3 text-muted-foreground">{c.phone || "—"}</td>
                  <td className="p-3 capitalize text-muted-foreground">{c.provider || "email"}</td>
                  <td className="p-3 font-mono text-[10px] text-muted-foreground">{c.user_id || c.id}</td>
                  <td className="p-3 text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersTab({ roles, customers, onChanged }: { roles: UserRole[]; customers: Customer[]; onChanged: () => void }) {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("customer");
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  // Merge registered customers with existing user roles so ALL signed in users appear
  const userMap = new Map<string, { userId: string; email: string; name: string; currentRole: string; joinedDate: string; lastLogin: string; status: string }>();

  // Add all from customers table
  customers.forEach((c) => {
    const uid = c.user_id || c.id;
    const r = roles.find((role) => role.user_id === uid || role.email === c.email);
    userMap.set(uid, {
      userId: uid,
      email: c.email,
      name: c.full_name || c.email.split("@")[0],
      currentRole: r?.role || "customer",
      joinedDate: c.created_at ? new Date(c.created_at).toLocaleDateString() : "—",
      lastLogin: c.last_login_at ? new Date(c.last_login_at).toLocaleString() : c.created_at ? new Date(c.created_at).toLocaleDateString() : "Active Now",
      status: "Active",
    });
  });

  // Add any additional from roles table
  roles.forEach((r) => {
    if (!userMap.has(r.user_id)) {
      userMap.set(r.user_id, {
        userId: r.user_id,
        email: r.email || "—",
        name: r.email ? r.email.split("@")[0] : "System User",
        currentRole: r.role,
        joinedDate: r.created_at ? new Date(r.created_at).toLocaleDateString() : "—",
        lastLogin: "Active Now",
        status: "Active",
      });
    }
  });

  const allUsersList = Array.from(userMap.values());

  const handleSaveRole = async (userId: string, email: string, roleToAssign: string) => {
    setSaving(true);
    setStatusMsg("");
    try {
      const { error } = await supabase.from("user_roles").upsert({
        user_id: userId,
        email: email,
        role: roleToAssign,
      }, { onConflict: "user_id" });

      if (error) throw error;
      setStatusMsg(`✓ Role "${roleToAssign.toUpperCase()}" assigned to ${email} successfully!`);
      setEditingUserId(null);
      onChanged();
    } catch (e: any) {
      setStatusMsg("Error: " + (e.message || "Failed to update user role"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="text-gold" size={20} /> User & Role Management ({allUsersList.length})
          </h2>
          <p className="text-xs text-muted-foreground">Every registered user automatically appears here for immediate role & permission management.</p>
        </div>
        {statusMsg && (
          <p className={`text-xs font-medium ${statusMsg.startsWith("✓") ? "text-emerald-400" : "text-red-400"}`}>
            {statusMsg}
          </p>
        )}
      </div>

      <div className="border rounded-xl overflow-hidden bg-card">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/50 border-b border-border uppercase tracking-wider text-[10px] text-muted-foreground">
            <tr>
              <th className="p-3">Full Name</th>
              <th className="p-3">Email Address</th>
              <th className="p-3">Registration Date</th>
              <th className="p-3">Current Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Last Login</th>
              <th className="p-3 text-right">Assign Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {allUsersList.map((u) => (
              <tr key={u.userId} className="hover:bg-muted/20">
                <td className="p-3 font-medium text-foreground">{u.name}</td>
                <td className="p-3 text-gold font-medium">{u.email}</td>
                <td className="p-3 text-muted-foreground">{u.joinedDate}</td>
                <td className="p-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      u.currentRole === "super_admin"
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                        : u.currentRole === "admin"
                        ? "bg-amber-500/20 text-gold border border-gold/40"
                        : u.currentRole === "staff"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {u.currentRole}
                  </span>
                </td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400">
                    {u.status}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">{u.lastLogin}</td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <select
                      value={editingUserId === u.userId ? selectedRole : u.currentRole}
                      onChange={(e) => {
                        setEditingUserId(u.userId);
                        setSelectedRole(e.target.value);
                      }}
                      className="border rounded px-2 py-1 text-xs bg-background font-medium"
                    >
                      <option value="customer">Customer</option>
                      <option value="user">Standard User</option>
                      <option value="staff">Staff Member</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>

                    <button
                      onClick={() => handleSaveRole(u.userId, u.email, editingUserId === u.userId ? selectedRole : u.currentRole)}
                      disabled={saving}
                      className="px-3 py-1 bg-gold text-black font-semibold rounded text-[11px] hover:opacity-90 transition shadow-gold disabled:opacity-50"
                    >
                      Save Role
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnalyticsTab({ logs }: { logs: ActivityLog[] }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">System Analytics & Logs</h2>
      <div className="border rounded-xl overflow-hidden bg-card">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/50 border-b border-border uppercase tracking-wider text-[10px] text-muted-foreground">
            <tr>
              <th className="p-3">Timestamp</th>
              <th className="p-3">Action</th>
              <th className="p-3">User</th>
              <th className="p-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-muted/20">
                <td className="p-3 text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td>
                <td className="p-3 font-medium text-foreground">{l.action}</td>
                <td className="p-3 text-muted-foreground">{l.user_email || "System"}</td>
                <td className="p-3 font-mono text-[10px] max-w-xs truncate">{JSON.stringify(l.details)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PromptTemplateManagerModal({ onClose }: { onClose: () => void }) {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPromptTemplate, setUserPromptTemplate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase
      .from("ai_prompt_templates")
      .select("system_prompt, user_prompt_template")
      .eq("template_name", "Product Intelligence")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSystemPrompt(data.system_prompt || "");
          setUserPromptTemplate(data.user_prompt_template || "");
        }
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      const { error } = await supabase
        .from("ai_prompt_templates")
        .upsert({
          template_name: "Product Intelligence",
          template_type: "product_intelligence",
          system_prompt: systemPrompt,
          user_prompt_template: userPromptTemplate,
          updated_at: new Date().toISOString(),
        }, { onConflict: "template_name" });

      if (error) throw error;
      setMsg("✓ Prompt Template updated successfully!");
      setTimeout(() => onClose(), 1200);
    } catch (e: any) {
      setMsg("Error: " + (e.message || "Failed to update prompt template"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-background w-full max-w-2xl rounded-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="text-gold" size={18} /> Product Intelligence Prompt Manager
        </h2>
        <p className="text-xs text-muted-foreground">
          Edit the authoritative prompt template used by the Product Intelligence Engine. Changes immediately take effect for future product generations without code changes.
        </p>

        {loading ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Loading prompt template...</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1">System Persona Prompt</label>
              <textarea
                rows={3}
                className="w-full border rounded px-3 py-2 text-xs bg-background"
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">User Template Prompt</label>
              <textarea
                rows={10}
                className="w-full border rounded px-3 py-2 text-xs bg-background font-mono"
                value={userPromptTemplate}
                onChange={e => setUserPromptTemplate(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground mt-1">Available placeholders: {"{{product_name}}, {{category}}, {{family}}, {{brand}}, {{price}}, {{currency}}, {{description}}, {{manual_specs}}"}</p>
            </div>

            {msg && <p className="text-xs text-center font-medium">{msg}</p>}

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 border rounded py-2 text-xs">Cancel</button>
              <button type="button" onClick={save} disabled={saving} className="flex-1 bg-gradient-gold text-[var(--cta-foreground)] font-semibold rounded py-2 text-xs disabled:opacity-50">
                {saving ? "Saving..." : "Save Prompt Template"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
