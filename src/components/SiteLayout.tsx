import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, MapPin, Phone, Mail, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/showroom", label: "Showroom" },
  { to: "/start-project", label: "Start Project" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { location } = useRouterState();
  const items = useCart();
  const count = items.reduce((s, x) => s + x.qty, 0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    setOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col text-foreground">
      <header className="sticky top-0 z-50 glass border-b border-[oklch(0.82_0.14_86/0.18)]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-display text-lg md:text-xl font-bold tracking-tight text-shimmer">
              DE GREAT JAPHETH
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="relative text-sm font-medium text-muted-foreground hover:text-gold transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full after:scale-x-0 after:origin-left after:bg-[var(--gold)] after:transition-transform hover:after:scale-x-100"
                activeProps={{ className: "text-gold after:scale-x-100" }}
                activeOptions={{ exact: n.to === "/" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/cart"
              className="relative p-2 rounded-md text-foreground hover:text-gold transition-colors"
              aria-label="Cart"
            >
              <ShoppingBag size={20} />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-gold text-[10px] font-bold text-[var(--cta-foreground)] flex items-center justify-center animate-[scale-in_.25s_ease-out_both]">
                  {count}
                </span>
              )}
            </Link>
            <button
              className="md:hidden p-2 -mr-2 text-foreground"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {open && (
          <div className="md:hidden border-t border-[oklch(0.82_0.14_86/0.15)] bg-background/95 backdrop-blur animate-[fade-in_.25s_ease-out_both]">
            <nav className="flex flex-col px-4 py-3">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className="py-3 text-base text-foreground border-b border-border last:border-0 hover:text-gold transition"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t border-[oklch(0.82_0.14_86/0.15)] bg-[oklch(0.10_0.02_260/0.8)] backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-12 grid gap-10 md:grid-cols-3">
          <div>
            <h3 className="font-display text-xl mb-3 text-shimmer inline-block">DE GREAT JAPHETH</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Premium building materials and finishing for modern interiors. Living Greatfull.
            </p>
          </div>
          <div className="space-y-3 text-sm">
            <h4 className="font-display text-base mb-2 text-gold">Contact</h4>
            <a href="tel:07066786626" className="flex items-center gap-2 text-muted-foreground hover:text-gold transition">
              <Phone size={14} /> 0706 678 6626
            </a>
            <a href="tel:08066713790" className="flex items-center gap-2 text-muted-foreground hover:text-gold transition">
              <Phone size={14} /> 0806 671 3790
            </a>
            <a href="mailto:japhetanele661@gmail.com" className="flex items-center gap-2 text-muted-foreground hover:text-gold transition break-all">
              <Mail size={14} /> japhetanele661@gmail.com
            </a>
          </div>
          <div className="space-y-3 text-sm">
            <h4 className="font-display text-base mb-2 text-gold">Address</h4>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Dei+Dei+Building+Materials+Market+Abuja"
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-2 text-muted-foreground hover:text-gold transition"
            >
              <MapPin size={14} className="mt-0.5 shrink-0" />
              <span>Dei Dei Building Materials Market,<br />Front Shop No. 14, Abuja</span>
            </a>
          </div>
        </div>
        <div className="border-t border-[oklch(0.82_0.14_86/0.10)]">
          <div className="max-w-7xl mx-auto px-4 py-4 text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} De Great Japheth. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
