import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { CommunicationEngine } from "@/lib/communicationEngine";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : "/cart",
    mode: s.mode === "signup" ? "signup" : "signin",
  }),
  component: AuthPage,
});

async function syncUserToCustomerTable(user: any) {
  if (!user || !user.email) return;
  const fullName = user.user_metadata?.full_name || user.email.split("@")[0];
  const phone = user.user_metadata?.phone || null;
  const provider = user.app_metadata?.provider || "email";

  try {
    await supabase.from("customers").upsert({
      user_id: user.id,
      email: user.email,
      full_name: fullName,
      phone: phone,
      provider: provider,
      updated_at: new Date().toISOString(),
    }, { onConflict: "email" });

    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    if (!roleData) {
      await supabase.from("user_roles").insert({
        user_id: user.id,
        email: user.email,
        role: "customer",
      });
    }
  } catch (err) {
    console.warn("[Auth Sync] Exception syncing user:", err);
  }
}

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
      if (data.session?.user) {
        syncUserToCustomerTable(data.session.user);
        navigate({ to: redirect as any });
      }
    });
  }, [navigate, redirect]);

  const continueAfterAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await syncUserToCustomerTable(session.user);
    }
    navigate({ to: redirect as any });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      if (mode === "signup") {
        if (!fullName.trim() || !phone.trim()) {
          setMsg("Full name and phone are required.");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}${redirect}`,
            data: { full_name: fullName, phone },
          },
        });
        if (error) { setMsg(error.message); return; }

        if (data.user) {
          await syncUserToCustomerTable(data.user);
        }

        // Trigger automatic Welcome Email via Communication Engine immediately
        CommunicationEngine.triggerWelcome(email, data.user?.id, fullName);

        // Try immediate sign in
        const si = await supabase.auth.signInWithPassword({ email, password });
        if (si.error) {
          setMsg("Account created! Welcome email sent. Please check your inbox or sign in.");
          setMode("signin");
          return;
        }
        await continueAfterAuth();
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setMsg(error.message); return; }
        if (data.user) {
          await syncUserToCustomerTable(data.user);
        }
        await continueAfterAuth();
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

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Chief Japhet Adewale"
                    className="w-full px-4 py-3 text-sm rounded-xl border border-border/80 bg-background/60 focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 08012345678"
                    className="w-full px-4 py-3 text-sm rounded-xl border border-border/80 bg-background/60 focus:outline-none focus:border-gold"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-4 py-3 text-sm rounded-xl border border-border/80 bg-background/60 focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 text-sm rounded-xl border border-border/80 bg-background/60 focus:outline-none focus:border-gold"
              />
            </div>

            {msg && (
              <p className={`text-xs text-center font-medium ${msg.includes("created") || msg.includes("Welcome") ? "text-emerald-400" : "text-red-400"}`}>
                {msg}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-gold text-[var(--cta-foreground)] font-semibold text-sm shadow-gold hover:opacity-95 transition disabled:opacity-50"
            >
              {busy ? "Processing..." : mode === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="relative my-6 text-center text-xs text-muted-foreground">
            <span className="bg-card px-2 relative z-10">or continue with</span>
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
          </div>

          <button
            onClick={google}
            disabled={busy}
            type="button"
            className="w-full py-3 px-4 rounded-xl border border-border/80 bg-card/40 hover:bg-card text-xs font-medium flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Google Sign-In
          </button>

          <div className="mt-6 text-center text-xs">
            {mode === "signin" ? (
              <p className="text-muted-foreground">
                Don't have an account?{" "}
                <button onClick={() => setMode("signup")} className="text-gold hover:underline font-semibold">
                  Sign up
                </button>
              </p>
            ) : (
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <button onClick={() => setMode("signin")} className="text-gold hover:underline font-semibold">
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
