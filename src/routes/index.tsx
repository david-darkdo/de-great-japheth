import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, ShoppingBag, ListChecks, MessageCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { HOME_CATEGORIES, categorySlug } from "@/lib/categories";
import heroImg from "@/assets/hero-interior.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DE GREAT JAPHETH — Living Greatfull" },
      { name: "description", content: "We supply and install high-quality building materials for modern interiors and construction finishing." },
    ],
  }),
  component: HomePage,
});

type Product = {
  id: string;
  product_name: string;
  category: string | null;
  product_image: string | null;
};

function HomePage() {
  const [catImages, setCatImages] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase
      .from("products")
      .select("id, product_name, category, product_image")
      .in("category", HOME_CATEGORIES as unknown as string[])
      .then(({ data }) => {
        const map: Record<string, string> = {};
        ((data as Product[]) || []).forEach((p) => {
          if (p.category && p.product_image && !map[p.category]) {
            map[p.category] = p.product_image;
          }
        });
        setCatImages(map);
      });
  }, []);

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <img
          src={heroImg}
          alt="Premium luxury sitting room interior finishing"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          width={1600}
          height={1024}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/60 to-primary/90" />
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-32">
          <p className="text-xs md:text-sm tracking-[0.3em] text-[var(--gold)] uppercase mb-4">
            DE GREAT JAPHETH
          </p>
          <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight max-w-3xl">
            Living Greatfull
          </h1>
          <p className="mt-6 text-base md:text-lg text-primary-foreground/80 max-w-2xl leading-relaxed">
            We supply and install high-quality building materials for modern interiors and construction finishing — transform your space with us today.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              to="/showroom"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--cta)] text-[var(--cta-foreground)] px-6 py-3 text-sm font-semibold hover:opacity-90 transition"
            >
              Explore Showroom <ArrowRight size={16} />
            </Link>
            <Link
              to="/start-project"
              className="inline-flex items-center justify-center rounded-md border border-primary-foreground/30 px-6 py-3 text-sm font-semibold hover:bg-primary-foreground/10 transition"
            >
              Start Project Request
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-16 md:py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs tracking-[0.25em] text-secondary uppercase mb-2">Categories</p>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-primary">Core Collections</h2>
          </div>
          <Link to="/showroom" className="hidden md:inline-flex items-center gap-1 text-sm text-secondary hover:underline">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {HOME_CATEGORIES.map((cat) => (
            <Link
              key={cat}
              to="/category/$slug"
              params={{ slug: categorySlug(cat) }}
              className="group block"
            >
              <div className="aspect-square overflow-hidden rounded-lg bg-muted border border-border">
                {catImages[cat] ? (
                  <img
                    src={catImages[cat]}
                    alt={cat}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                    {cat}
                  </div>
                )}
              </div>
              <h3 className="mt-3 font-display text-base md:text-lg font-semibold text-primary">{cat}</h3>
            </Link>
          ))}
        </div>
      </section>

      {/* Showroom CTA */}
      <section className="bg-secondary text-secondary-foreground">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold">Explore Showroom</h2>
            <p className="mt-2 text-secondary-foreground/80 text-sm md:text-base max-w-xl">
              Browse our complete catalogue of doors, tiles, electrical, plumbing and more.
            </p>
          </div>
          <Link
            to="/showroom"
            className="inline-flex items-center gap-2 rounded-md bg-[var(--cta)] text-[var(--cta-foreground)] px-6 py-3 text-sm font-semibold hover:opacity-90"
          >
            Open Showroom <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 py-16 md:py-20">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-primary text-center mb-12">How It Works</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: ShoppingBag, label: "Select Products" },
            { icon: ListChecks, label: "Review Selection" },
            { icon: MessageCircle, label: "Send to WhatsApp" },
            { icon: CheckCircle2, label: "Confirm Order" },
          ].map((s, i) => (
            <div key={s.label} className="text-center">
              <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-accent flex items-center justify-center text-secondary">
                <s.icon size={22} />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Step {i + 1}</p>
              <p className="font-medium text-primary text-sm md:text-base">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Project request */}
      <section id="start" className="bg-accent">
        <div className="max-w-3xl mx-auto px-4 py-16 md:py-20">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-primary">Start Your Project With Us</h2>
            <p className="mt-3 text-muted-foreground">
              We supply and install complete building finishing solutions for homes and commercial spaces.
            </p>
          </div>
          <ProjectRequestForm />
        </div>
      </section>
    </SiteLayout>
  );
}

function ProjectRequestForm() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      full_name: String(fd.get("full_name") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      email: String(fd.get("email") || "").trim() || null,
      state: String(fd.get("state") || "").trim() || null,
      project_type: String(fd.get("project_type") || "").trim() || null,
      preferred_contact: String(fd.get("preferred_contact") || "").trim() || null,
      description: String(fd.get("description") || "").trim() || null,
    };
    if (!payload.full_name || !payload.phone) {
      setError("Name and phone are required.");
      setSubmitting(false);
      return;
    }
    const { error } = await supabase.from("project_requests").insert(payload);
    setSubmitting(false);
    if (error) setError(error.message);
    else {
      setDone(true);
      (e.target as HTMLFormElement).reset();
    }
  }

  if (done) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <CheckCircle2 className="mx-auto text-secondary mb-3" size={32} />
        <h3 className="font-display text-xl text-primary">Request received</h3>
        <p className="mt-2 text-muted-foreground text-sm">
          We'll get back to you shortly via your preferred contact method.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="bg-card border border-border rounded-lg p-6 md:p-8 space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Full Name" name="full_name" required />
        <Field label="Phone Number" name="phone" type="tel" required />
        <Field label="Email" name="email" type="email" />
        <Field label="State" name="state" />
        <Field label="Project Type" name="project_type" placeholder="e.g. Doors, Tiles, Full finishing" />
        <div>
          <label className="block text-sm font-medium text-primary mb-1.5">Preferred Contact</label>
          <select name="preferred_contact" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="WhatsApp">WhatsApp</option>
            <option value="Phone">Phone</option>
            <option value="Email">Email</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-primary mb-1.5">Description</label>
        <textarea
          name="description"
          rows={4}
          placeholder="Tell us about your project..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-[var(--cta)] text-[var(--cta-foreground)] py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? "Sending..." : "Send Project Request"}
      </button>
    </form>
  );
}

function Field({ label, name, type = "text", required, placeholder }: {
  label: string; name: string; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-primary mb-1.5">{label}{required && " *"}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}
