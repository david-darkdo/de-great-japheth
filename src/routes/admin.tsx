import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMsg, setAuthMsg] = useState("");

  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthMsg(error.message);
  };

  const handleSignUp = async () => {
    setAuthMsg("");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    });
    if (error) setAuthMsg(error.message);
    else setAuthMsg("Account created. Check email if confirmation required.");
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    console.log("File selected:", f);
    setFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setStatus("Please select an image file.");
      return;
    }
    if (!productName.trim()) {
      setStatus("Product name required.");
      return;
    }
    setBusy(true);
    setStatus("Uploading image...");

    try {
      const fd = new FormData();
      fd.append("file", file);
      console.log("Upload request → /api/upload-image", file.name, file.size);
      const res = await fetch("/api/upload-image", { method: "POST", body: fd });
      const json = await res.json();
      console.log("Cloudinary response:", json);
      if (!res.ok || !json.url) throw new Error(json.error || "Upload failed");

      setStatus("Saving product...");
      const { data, error } = await supabase
        .from("products")
        .insert({
          product_name: productName,
          category: category || null,
          price: price ? Number(price) : null,
          product_image: json.url,
        })
        .select()
        .single();

      if (error) throw error;
      console.log("Final saved product:", data);

      setStatus("✓ Product uploaded successfully.");
      setProductName("");
      setCategory("");
      setPrice("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: any) {
      console.error(err);
      setStatus("Error: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <form onSubmit={handleSignIn} className="w-full max-w-sm space-y-4 border rounded-lg p-6">
          <h1 className="text-2xl font-semibold">Admin Sign In</h1>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-primary text-primary-foreground rounded py-2">
              Sign in
            </button>
            <button type="button" onClick={handleSignUp} className="flex-1 border rounded py-2">
              Sign up
            </button>
          </div>
          {authMsg && <p className="text-sm text-muted-foreground">{authMsg}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin · Upload Product</h1>
          <div className="flex gap-3 text-sm">
            <Link to="/" className="underline">Showroom</Link>
            <button onClick={() => supabase.auth.signOut()} className="underline">Sign out</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-6">
          <input
            type="text"
            placeholder="Product Name"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
          <input
            type="text"
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />

          <div>
            <label
              htmlFor="product-file"
              className="block w-full text-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-muted"
            >
              {file ? `Selected: ${file.name}` : "Tap to Upload Image"}
            </label>
            <input
              id="product-file"
              ref={fileRef}
              type="file"
              onChange={onFileChange}
              className="hidden"
            />
          </div>

          {previewUrl && (
            <div className="border rounded-lg p-2">
              <img src={previewUrl} alt="preview" className="w-full max-h-64 object-contain" />
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-primary text-primary-foreground rounded py-2 disabled:opacity-50"
          >
            {busy ? "Uploading..." : "Save Product"}
          </button>

          {status && <p className="text-sm">{status}</p>}
        </form>
      </div>
    </div>
  );
}
