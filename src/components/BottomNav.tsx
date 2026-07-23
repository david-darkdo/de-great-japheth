import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Home, Phone, ShoppingBag, User, LogIn, LogOut, History, ShieldCheck, UserCircle, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";

export function BottomNav() {
  const { location } = useRouterState();
  const rawPath = location.pathname || "/";
  const path = (rawPath === "/" || rawPath === "") ? "/" : rawPath.replace(/\/$/, "");
  
  const items = useCart();
  const count = items.reduce((s, x) => s + x.qty, 0);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkRole = async (userId: string | undefined) => {
      if (!userId) { setIsAdmin(false); return; }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      setIsAdmin(!!roles?.some((r: any) => ["super_admin", "staff"].includes(r.role)));
    };
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email ?? null);
      checkRole(data.session?.user?.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setUserEmail(sess?.user?.email ?? null);
      checkRole(sess?.user?.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Close account panel on route change
  useEffect(() => { setAccountOpen(false); }, [path]);

  const signOut = async () => { await supabase.auth.signOut(); setAccountOpen(false); };

  // Explicit, mutually exclusive active route checks
  const isHome = path === "/" || path === "/home";
  const isShowroom = path === "/showroom";
  const isContact = path === "/contact";
  const isCart = path === "/cart" || path === "/orders";
  const isAccount = accountOpen || path === "/auth" || path === "/admin";

  return (
    <>
      {/* Account flyout */}
      {accountOpen && (
        <div
          className="fixed inset-0 z-[60] md:hidden"
          onClick={() => setAccountOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-[fade-in_.2s_ease-out_both]" />
          <div
            ref={panelRef}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-3 left-3 bottom-[calc(env(safe-area-inset-bottom)+76px)] rounded-2xl glass border border-[oklch(0.82_0.14_86/0.25)] shadow-gold p-2 animate-[fade-up_.28s_ease-out_both]"
          >
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs tracking-[0.25em] uppercase text-gold">Account</span>
              <button onClick={() => setAccountOpen(false)} aria-label="Close" className="text-muted-foreground hover:text-gold">
                <X size={16} />
              </button>
            </div>
            {userEmail ? (
              <div className="flex flex-col">
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-foreground border-b border-border/60">
                  <UserCircle size={18} className="text-gold shrink-0" />
                  <span className="truncate">{userEmail}</span>
                </div>
                <PanelLink to="/orders" icon={History}>Order history</PanelLink>
                {isAdmin && (
                  <>
                    <PanelLink to="/admin" icon={ShieldCheck} gold>Command Center</PanelLink>
                  </>
                )}
                <button
                  onClick={signOut}
                  className="flex items-center gap-3 px-3 py-3 text-sm text-foreground hover:text-gold transition rounded-lg text-left"
                >
                  <LogOut size={18} /> Sign out
                </button>
              </div>
            ) : (
              <div className="flex flex-col">
                <PanelLink to="/auth" search={{ redirect: "/", mode: "signin" }} icon={LogIn}>Login</PanelLink>
                <PanelLink to="/auth" search={{ redirect: "/", mode: "signup" }} icon={UserCircle} gold>Create account</PanelLink>
              </div>
            )}
          </div>
        </div>
      )}

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-[55] pb-[env(safe-area-inset-bottom)] glass border-t border-[oklch(0.82_0.14_86/0.18)]"
        aria-label="Bottom navigation"
      >
        <div className="relative max-w-md mx-auto h-16 grid grid-cols-5 items-center px-2">
          {/* Home Tab */}
          <a
            href="/"
            className="relative flex flex-col items-center justify-center gap-0.5 h-full"
          >
            <span className={`relative transition-colors ${isHome ? "text-gold" : "text-muted-foreground"}`}>
              <Home size={22} strokeWidth={isHome ? 2.4 : 2} />
            </span>
            <span className={`text-[10px] font-medium tracking-wide ${isHome ? "text-gold" : "text-muted-foreground"}`}>
              Home
            </span>
          </a>

          {/* Contact Tab */}
          <a
            href="/contact"
            className="relative flex flex-col items-center justify-center gap-0.5 h-full"
          >
            <span className={`relative transition-colors ${isContact ? "text-gold" : "text-muted-foreground"}`}>
              <Phone size={22} strokeWidth={isContact ? 2.4 : 2} />
            </span>
            <span className={`text-[10px] font-medium tracking-wide ${isContact ? "text-gold" : "text-muted-foreground"}`}>
              Contact
            </span>
          </a>

          {/* Center Showroom Tab */}
          <div className="flex justify-center">
            <a
              href="/showroom"
              aria-label="Showroom"
              className="group relative -mt-9 flex flex-col items-center"
            >
              <span
                className={`relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-gold text-[var(--cta-foreground)] shadow-gold ring-4 ring-background transition-transform duration-300 active:scale-90 group-hover:scale-105 ${
                  isShowroom ? "animate-[glow-pulse_2.4s_ease-in-out_infinite]" : ""
                }`}
              >
                <ShoppingBag size={26} strokeWidth={2.2} />
              </span>
              <span className={`mt-1 text-[10px] font-semibold tracking-wide ${isShowroom ? "text-gold" : "text-muted-foreground"}`}>
                SHOWROOM
              </span>
            </Link>
          </div>

          {/* Cart Tab */}
          <Link
            to="/cart"
            className="relative flex flex-col items-center justify-center gap-0.5 h-full"
          >
            <span className={`relative transition-colors ${isCart ? "text-gold" : "text-muted-foreground"}`}>
              <ShoppingBag size={22} strokeWidth={isCart ? 2.4 : 2} />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-gradient-gold text-[9px] font-bold text-[var(--cta-foreground)] flex items-center justify-center">
                  {count}
                </span>
              )}
            </span>
            <span className={`text-[10px] font-medium tracking-wide ${isCart ? "text-gold" : "text-muted-foreground"}`}>
              Cart
            </span>
          </Link>

          {/* Account Button */}
          <button
            onClick={() => setAccountOpen((v) => !v)}
            aria-label="Customer account"
            className="flex flex-col items-center justify-center gap-0.5 h-full"
          >
            <span className={`transition-colors ${isAccount ? "text-gold" : "text-muted-foreground"}`}>
              <User size={22} strokeWidth={isAccount ? 2.4 : 2} />
            </span>
            <span className={`text-[10px] font-medium tracking-wide ${isAccount ? "text-gold" : "text-muted-foreground"}`}>
              Customer
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}

function PanelLink({
  to, search, icon: Icon, children, gold,
}: {
  to: string; search?: any; icon: React.ComponentType<{ size?: number }>;
  children: React.ReactNode; gold?: boolean;
}) {
  return (
    <Link
      to={to}
      search={search}
      className={`flex items-center gap-3 px-3 py-3 text-sm transition rounded-lg ${
        gold ? "text-gold hover:text-gold/80" : "text-foreground hover:text-gold"
      }`}
    >
      <Icon size={18} /> {children}
    </Link>
  );
}
