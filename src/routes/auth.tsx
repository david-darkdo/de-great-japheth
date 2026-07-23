import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : "/cart",
    mode: s.mode === "signup" ? "signup" : "signin",
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect, mode: initialMode } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode as any);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: redirect as any });
    });
  }, [navigate, redirect]);

  const continueAfterAuth = () => navigate({ to: redirect as any });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      if (mode === "signup") {
        if (!fullName.trim() || !phone.trim()) {
          setMsg("Full name and phone are required.");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}${redirect}`,
            data: { full_name: fullName, phone },
          },
        });
        if (error) { setMsg(error.message); return; }
        // Try immediate sign in (works if auto-confirm enabled on Supabase)
        const si = await supabase.auth.signInWithPassword({ email, password });
        if (si.error) {
          setMsg("Account created! Please check your email to confirm, or sign in.");
          setMode("signin");
          return;
        }
        continueAfterAuth();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setMsg(error.message); return; }
        continueAfterAuth();
      }
    } finally { setBusy(false); }
  };

  const google = async () => {
    setBusy(true); setMsg("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${redirect}`,
        },
      });
      if (error) {
        setMsg(error.message || "Google sign-in failed");
        setBusy(false);
      }
    } catch (e: any) {
      setMsg(e?.message || "Google sign-in failed");
      setBusy(false);
    }
  };

  return (
    <SiteLayout>
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md glass rounded-2xl p-6 md:p-8 animate-[fade-up_.5s_ease-out_both]">
          <p className="text-[10px] tracking-[0.4em] text-gold uppercase">Continue To Submit Request</p>
          <h1 className="font-display text-2xl md:text-3xl font-bold mt-2 text-shimmer">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Login or create account to continue sending your selected products to our management team.
          </p>

          <button
            type="button" onClick={google} disabled={busy}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[oklch(0.82_0.14_86/0.3)] bg-background/40 px-4 py-2.5 text-sm font-medium hover:bg-background/60 hover:border-gold transition disabled:opacity-50"
          >
            <GoogleIcon /> Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <>
                <Field label="Full Name" value={fullName} onChange={setFullName} placeholder="Jane Doe" required />
                <Field label="Phone Number" value={phone} onChange={setPhone} placeholder="0801 234 5678" required type="tel" />
              </>
            )}
            <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" required type="email" />
            <Field label="Password" value={password} onChange={setPassword} placeholder="••••••••" required type="password" />

            <button
              type="submit" disabled={busy}
              className="btn-gold w-full mt-2 disabled:opacity-50"
            >
              {busy ? "Please wait…" : mode === "signin" ? "Login" : "Create Account"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {mode === "signin" ? (
              <>New to us? <button onClick={() => setMode("signup")} className="text-gold hover:underline">Create account</button></>
            ) : (
              <>Already have an account? <button onClick={() => setMode("signin")} className="text-gold hover:underline">Login</button></>
            )}
          </p>

          {msg && <p className="mt-3 text-center text-xs text-destructive">{msg}</p>}

          <p className="mt-6 text-center text-[11px] text-muted-foreground">
            <Link to="/cart" className="hover:text-gold transition">Back to cart</Link>
          </p>
        </div>
      </div>
    </SiteLayout>
  );
}

function Field({ label, value, onChange, type = "text", required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        type={type} value={value} required={required} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm focus:border-gold focus:outline-none transition"
      />
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.6 12 2.6 6.8 2.6 2.6 6.8 2.6 12s4.2 9.4 9.4 9.4c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z"/>
    </svg>
  );
}
