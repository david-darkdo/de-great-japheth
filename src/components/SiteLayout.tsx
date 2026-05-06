import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, MapPin, Phone, Mail } from "lucide-react";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/showroom", label: "Showroom" },
  { to: "/start-project", label: "Start Projects" },
  { to: "/contact", label: "Contact Us" },
] as const;

export function SiteLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { location } = useRouterState();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    setOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display text-lg md:text-xl font-bold tracking-tight text-primary">
              DE GREAT JAPHETH
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                activeProps={{ className: "text-primary" }}
                activeOptions={{ exact: n.to === "/" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <button
            className="md:hidden p-2 -mr-2 text-primary"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {open && (
          <div className="md:hidden border-t border-border bg-background">
            <nav className="flex flex-col px-4 py-3">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className="py-3 text-base text-foreground border-b border-border last:border-0"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-primary text-primary-foreground mt-16">
        <div className="max-w-7xl mx-auto px-4 py-12 grid gap-10 md:grid-cols-3">
          <div>
            <h3 className="font-display text-xl mb-3">DE GREAT JAPHETH</h3>
            <p className="text-sm text-primary-foreground/70 leading-relaxed">
              We supply and install premium building materials for modern interiors and construction finishing.
            </p>
          </div>
          <div className="space-y-3 text-sm">
            <h4 className="font-display text-base mb-2 text-[var(--gold)]">Contact</h4>
            <a href="tel:07066786626" className="flex items-center gap-2 hover:text-[var(--gold)]">
              <Phone size={14} /> 0706 678 6626
            </a>
            <a href="tel:08066713790" className="flex items-center gap-2 hover:text-[var(--gold)]">
              <Phone size={14} /> 0806 671 3790
            </a>
            <a href="mailto:japhetanele661@gmail.com" className="flex items-center gap-2 hover:text-[var(--gold)] break-all">
              <Mail size={14} /> japhetanele661@gmail.com
            </a>
          </div>
          <div className="space-y-3 text-sm">
            <h4 className="font-display text-base mb-2 text-[var(--gold)]">Address</h4>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Dei+Dei+Building+Materials+Market+Abuja"
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-2 hover:text-[var(--gold)]"
            >
              <MapPin size={14} className="mt-0.5 shrink-0" />
              <span>Dei Dei Building Materials Market,<br />Front Shop No. 14</span>
            </a>
          </div>
        </div>
        <div className="border-t border-primary-foreground/10">
          <div className="max-w-7xl mx-auto px-4 py-4 text-xs text-primary-foreground/60 text-center">
            © {new Date().getFullYear()} De Great Japheth. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
