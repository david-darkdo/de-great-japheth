import { generateProductIntelligence } from "@/lib/productIntelligence";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES } from "@/lib/categories";
import { Search, Globe, Tag, Sparkles, Mail, Send, Filter, History as HistoryIcon, LayoutTemplate, BarChart3, CheckCircle, Clock, Zap } from "lucide-react";
import { CommunicationEngine, EmailTemplate, EmailLog } from "@/lib/communicationEngine";

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
              {t === "communication" ? "Customer Communication" : t}
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
          className="border rounded-md px-3 py-2 text-sm bg-background w-full max-w-sm"
        />
        <p className="text-xs text-muted-foreground">{filtered.length} products found</p>
      </div>

      <div className="border rounded-xl overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border uppercase tracking-wider text-[10px] text-muted-foreground">
              <tr>
                <th className="p-3">Image</th>
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
                  <td className="p-3">
                    {p.product_image ? (
                      <img src={p.product_image} alt={p.product_name} className="w-10 h-10 object-cover rounded border" />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-[9px]">No img</div>
                    )}
                  </td>
                  <td className="p-3 font-medium text-foreground">{p.product_name}</td>
                  <td className="p-3 text-muted-foreground">{p.category || "—"}</td>
                  <td className="p-3 text-muted-foreground">{p.family || "—"}</td>
                  <td className="p-3 text-gold font-semibold">
                    {p.price != null ? `₦${Number(p.price).toLocaleString()}` : "Price on Request"}
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button onClick={() => onEdit(p)} className="text-blue-500 hover:underline">Edit</button>
                    <button onClick={() => onDelete(p.id)} className="text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
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

  // AI Product Intelligence & Google SEO State
  const [generatingAi, setGeneratingAi] = useState(false);
  const [showGoogleSeo, setShowGoogleSeo] = useState(false);
  const [showPromptManager, setShowPromptManager] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [slug, setSlug] = useState("");
  const [canonicalProductName, setCanonicalProductName] = useState("");
  const [relatedTerms, setRelatedTerms] = useState("");
  const [productSummary, setProductSummary] = useState("");
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);

  const [initialFile, setInitialFile] = useState<File | null>(null);
  const [finishedFile, setFinishedFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const initRef = useRef<HTMLInputElement>(null);
  const finRef = useRef<HTMLInputElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialFile) {
      alert("Initial product image is required.");
      return;
    }
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
          seo_title: seoTitle || null,
          meta_description: metaDescription || null,
          seo_keywords: seoKeywords ? seoKeywords.split(",").map(s => s.trim()).filter(Boolean) : null,
          slug: slug || null,
          canonical_product_name: canonicalProductName || null,
          related_terms: relatedTerms ? relatedTerms.split(",").map(s => s.trim()).filter(Boolean) : null,
          product_summary: productSummary || null,
          ai_confidence: aiConfidence || null,
        })
        .select()
        .single();
      if (error) throw error;
      setStatus("✓ Product uploaded successfully!");
      setName(""); setCategory(""); setFamily(""); setPrice(""); setCurrency("NGN"); setDescription("");
      setSearchKeywords(""); setSearchTags(""); setSeoTitle(""); setMetaDescription(""); setSeoKeywords("");
      setSlug(""); setCanonicalProductName(""); setRelatedTerms(""); setProductSummary(""); setAiConfidence(null);
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

        {/* AI Generation Action */}
        <div className="p-4 rounded-xl border border-[oklch(0.82_0.14_86/0.25)] bg-card/60 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="text-gold" size={14} /> Product Intelligence Engine
              </p>
              <p className="text-[11px] text-muted-foreground">Generate authoritative Google SEO & Showroom metadata in one click.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPromptManager(true)}
                className="px-2.5 py-1.5 rounded-md border border-border text-[11px] font-medium hover:border-gold hover:text-gold transition"
              >
                Edit AI Prompt
              </button>
              <button
                type="button"
                disabled={generatingAi || !name.trim()}
                onClick={async () => {
                  setGeneratingAi(true);
                  try {
                    let imgUrl: string | undefined = undefined;
                    if (initialFile) {
                      imgUrl = await uploadImage(initialFile);
                    }
                    const aiResult = await generateProductIntelligence({
                      productName: name,
                      category,
                      family,
                      price: price ? Number(price) : undefined,
                      currency,
                      description,
                      productImage: imgUrl,
                    });

                    setDescription(aiResult.description);
                    setSeoTitle(aiResult.seo_title);
                    setMetaDescription(aiResult.meta_description);
                    setSeoKeywords(Array.isArray(aiResult.seo_keywords) ? aiResult.seo_keywords.join(", ") : aiResult.seo_keywords || "");
                    setSlug(aiResult.slug);
                    setSearchKeywords(Array.isArray(aiResult.search_keywords) ? aiResult.search_keywords.join(", ") : aiResult.search_keywords || "");
                    setCanonicalProductName(aiResult.canonical_product_name);
                    setRelatedTerms(Array.isArray(aiResult.related_terms) ? aiResult.related_terms.join(", ") : aiResult.related_terms || "");
                    setProductSummary(aiResult.product_summary);
                    setAiConfidence(aiResult.confidence);
                  } catch (err: any) {
                    alert("AI Generation Error: " + (err.message || "Failed to generate product intelligence"));
                  } finally {
                    setGeneratingAi(false);
                  }
                }}
                className="px-3 py-1.5 rounded-md bg-gradient-gold text-[var(--cta-foreground)] font-semibold text-xs flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition shadow-gold"
              >
                <Sparkles size={13} className={generatingAi ? "animate-spin" : ""} />
                {generatingAi ? "Generating..." : "Generate Product Intelligence"}
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">Product Description</label>
          <textarea
            placeholder="Unified Product Description (Generated by AI or entered manually)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          />
        </div>

        {/* Collapsible Google & Search Intelligence Section */}
        <div className="border rounded-xl p-3 bg-muted/20">
          <button
            type="button"
            onClick={() => setShowGoogleSeo(!showGoogleSeo)}
            className="w-full flex items-center justify-between text-xs font-semibold text-foreground hover:text-gold transition"
          >
            <span className="flex items-center gap-1.5">
              <Globe size={14} className="text-gold" /> Google & Search Intelligence
            </span>
            <span className="text-[11px] text-muted-foreground">
              {showGoogleSeo ? "▲ Collapse" : "▼ Expand to Review / Edit"}
            </span>
          </button>

          {showGoogleSeo && (
            <div className="mt-3 space-y-3 pt-3 border-t border-border/60 text-xs">
              <div>
                <label className="block text-[11px] font-medium mb-1">SEO Title (Google Title)</label>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="e.g. Luxury Virony Marble Tile | DE GREAT JAPHET"
                  className="w-full border rounded px-2.5 py-1.5 text-xs bg-background"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium mb-1">Meta Description (Google Snippet)</label>
                <textarea
                  rows={2}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="e.g. Premium marble tile in Lagos, Nigeria..."
                  className="w-full border rounded px-2.5 py-1.5 text-xs bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium mb-1">Product URL Slug</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g. luxury-virony-marble-tile"
                    className="w-full border rounded px-2.5 py-1.5 text-xs bg-background"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1">Search Alias / Canonical Name</label>
                  <input
                    type="text"
                    value={canonicalProductName}
                    onChange={(e) => setCanonicalProductName(e.target.value)}
                    placeholder="e.g. Virony White Porcelain Tile"
                    className="w-full border rounded px-2.5 py-1.5 text-xs bg-background"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium mb-1">Google SEO Keywords (Comma Separated)</label>
                <input
                  type="text"
                  value={seoKeywords}
                  onChange={(e) => setSeoKeywords(e.target.value)}
                  placeholder="e.g. tiles, marble tile, virony tile"
                  className="w-full border rounded px-2.5 py-1.5 text-xs bg-background"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium mb-1">Related Search Terms (Hidden Search Intelligence)</label>
                <input
                  type="text"
                  value={relatedTerms}
                  onChange={(e) => setRelatedTerms(e.target.value)}
                  placeholder="e.g. living room tile, floor tile, 60x60 tile"
                  className="w-full border rounded px-2.5 py-1.5 text-xs bg-background"
                />
              </div>

              {aiConfidence != null && (
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1">
                  <CheckCircle size={12} className="text-emerald-500" />
                  Internal AI Confidence Score: <span className="font-semibold text-foreground">{(aiConfidence * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>
          )}
        </div>

        {showPromptManager && (
          <PromptTemplateManagerModal onClose={() => setShowPromptManager(false)} />
        )}

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
    </form>
  );
}

function CommunicationCenterTab({
  templates,
  logs,
  customers,
  onRefresh,
}: {
  templates: EmailTemplate[];
  logs: EmailLog[];
  customers: Customer[];
  onRefresh: () => void;
}) {
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [recipientEmail, setRecipientEmail] = useState<string>("");
  const [customSubject, setCustomSubject] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string>("");

  const filteredLogs = logs.filter((l) => (filterType === "all" ? true : l.status === filterType));

  const handleSendManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !selectedTemplate) {
      alert("Please choose a recipient email and a template.");
      return;
    }
    setSending(true);
    setSendResult("");
    try {
      const res = await fetch("/api/communication/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow: selectedTemplate,
          to: recipientEmail,
          subject: customSubject || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setSendResult(`✓ Email queued/sent successfully! Message ID: ${data.messageId || "OK"}`);
      setRecipientEmail("");
      setCustomSubject("");
      onRefresh();
    } catch (err: any) {
      setSendResult(`Error: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border rounded-xl p-6 bg-card space-y-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="text-gold" size={20} /> Customer Communication Operating System
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Centralized email delivery engine connected to SendGrid. Works across automated triggers and manual campaigns.
          </p>
        </div>

        <form onSubmit={handleSendManual} className="border rounded-lg p-4 bg-muted/20 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Send size={15} className="text-gold" /> Send Manual / Test Campaign
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="border rounded px-3 py-2 text-xs bg-background"
              required
            >
              <option value="">Select Workflow / Template *</option>
              <option value="welcome">Welcome Email</option>
              <option value="collection_reminder_24h">Collection Reminder (24h)</option>
              <option value="abandoned_collection_72h">Abandoned Collection (72h)</option>
              <option value="monthly_newsletter">Monthly Newsletter</option>
              <option value="holiday_campaign">Holiday Campaign</option>
              <option value="system_notification">System Notification</option>
            </select>

            <input
              type="email"
              placeholder="Recipient Email *"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="border rounded px-3 py-2 text-xs bg-background"
              required
            />

            <input
              type="text"
              placeholder="Custom Subject (Optional)"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              className="border rounded px-3 py-2 text-xs bg-background"
            />
          </div>

          <div className="flex items-center justify-between">
            {sendResult ? (
              <p className={`text-xs font-medium ${sendResult.startsWith("✓") ? "text-emerald-500" : "text-red-500"}`}>
                {sendResult}
              </p>
            ) : <span />}
            <button
              type="submit"
              disabled={sending}
              className="px-4 py-2 bg-gradient-gold text-[var(--cta-foreground)] font-semibold rounded text-xs disabled:opacity-50 shadow-gold"
            >
              {sending ? "Sending via SendGrid..." : "Send Email Now"}
            </button>
          </div>
        </form>
      </div>

      <div className="border rounded-xl p-6 bg-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <HistoryIcon size={16} className="text-gold" /> Communication Delivery Logs
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
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-muted-foreground">
                    No communication logs found for filter '{filterType}'.
                  </td>
                </tr>
              ) : (
                filteredLogs.slice(0, 30).map((l) => (
                  <tr key={l.id} className="hover:bg-muted/20">
                    <td className="p-3 text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="p-3 font-medium text-foreground">{l.campaign_id}</td>
                    <td className="p-3 text-muted-foreground">{l.email}</td>
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
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Registered Customers</h2>
      <div className="border rounded-xl overflow-hidden bg-card">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/50 border-b border-border uppercase tracking-wider text-[10px] text-muted-foreground">
            <tr>
              <th className="p-3">Full Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Provider</th>
              <th className="p-3">Joined Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-muted/20">
                <td className="p-3 font-medium text-foreground">{c.full_name || "—"}</td>
                <td className="p-3 text-muted-foreground">{c.email}</td>
                <td className="p-3 text-muted-foreground">{c.phone || "—"}</td>
                <td className="p-3 capitalize">{c.provider || "email"}</td>
                <td className="p-3 text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersTab({ roles, customers, onChanged }: { roles: UserRole[]; customers: Customer[]; onChanged: () => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">User Role Management</h2>
      <div className="border rounded-xl overflow-hidden bg-card">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/50 border-b border-border uppercase tracking-wider text-[10px] text-muted-foreground">
            <tr>
              <th className="p-3">User ID</th>
              <th className="p-3">Email</th>
              <th className="p-3">Assigned Role</th>
              <th className="p-3">Created At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {roles.map((r) => (
              <tr key={r.id} className="hover:bg-muted/20">
                <td className="p-3 text-muted-foreground font-mono text-[10px]">{r.user_id}</td>
                <td className="p-3 font-medium text-foreground">{r.email || "—"}</td>
                <td className="p-3 font-semibold text-gold uppercase">{r.role}</td>
                <td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
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
