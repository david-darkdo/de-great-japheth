import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ShoppingBag, ListChecks, MessageCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { HOME_CATEGORIES, categorySlug } from "@/lib/categories";
import heroImg from "@/assets/hero-interior.jpg";
import catSecurityDoors from "@/assets/cat-security-doors.png";
import catElectrical from "@/assets/cat-electrical.png";
import catPlumbing from "@/assets/cat-plumbing.png";
import catCeiling from "@/assets/cat-ceiling.png";

// Static homepage category covers — never auto-replaced by uploads.
const CATEGORY_COVER_IMAGES: Record<string, string> = {
  "Security Doors": catSecurityDoors,
  "Electrical": catElectrical,
  "Plumbing": catPlumbing,
  "Ceiling Materials": catCeiling,
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DE GREAT JAPHET — Living Greatfull | Premium Building Materials" },
      { name: "description", content: "We supply and install high-quality building materials for modern interiors and construction finishing." },
    ],
  }),
  component: HomePage,
});

export function HomePage() {
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <img
          src={heroImg}
          alt="Premium luxury sitting room interior finishing"
          className="absolute inset-0 w-full h-full object-cover opacity-25"
          width={1600}
          height={1024}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.10_0.02_260/0.6)] via-[oklch(0.10_0.02_260/0.7)] to-[oklch(0.07_0.02_260/0.95)]" />
        <div className="absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-[oklch(0.55_0.18_258/0.25)] blur-3xl animate-[float_9s_ease-in-out_infinite]" />
        <div className="absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-[oklch(0.82_0.14_86/0.18)] blur-3xl animate-[float_11s_ease-in-out_infinite]" />
        <div className="relative max-w-7xl mx-auto px-4 py-24 md:py-36">
          <p className="text-xs md:text-sm tracking-[0.4em] text-gold uppercase mb-4 animate-[fade-in_.8s_ease-out_both]">
            DE GREAT JAPHET
          </p>
          <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] max-w-3xl text-shimmer animate-[fade-up_.8s_ease-out_both]">
            Living Greatfull
          </h1>
          <p className="mt-6 text-base md:text-lg text-foreground/80 max-w-2xl leading-relaxed animate-[fade-up_.9s_ease-out_.1s_both]">
            Premium building materials and finishing for modern interiors. Curate your selection — we deliver and install.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 animate-[fade-up_1s_ease-out_.2s_both]">
            <Link to="/showroom" className="btn-gold">
              Explore Showroom <ArrowRight size={16} />
            </Link>
            <Link to="/start-project" className="btn-outline-gold">
              Start Project
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-16 md:py-24">
        <div className="flex items-end justify-between mb-10">
          <div className="animate-[fade-up_.6s_ease-out_both]">
            <p className="text-xs tracking-[0.3em] text-gold uppercase mb-2">Categories</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">Core Collections</h2>
          </div>
          <Link to="/showroom" className="hidden md:inline-flex items-center gap-1 text-sm text-gold hover:underline">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {HOME_CATEGORIES.map((cat, i) => (
            <Link
              key={cat}
              to="/category/$slug"
              params={{ slug: categorySlug(cat) }}
              className="group block animate-[fade-up_.5s_ease-out_both]"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="relative aspect-square overflow-hidden rounded-xl bg-muted border border-border hover-lift">
                {(() => {
                  const src = CATEGORY_COVER_IMAGES[cat];
                  return src ? (
                    <img
                      src={src}
                      alt={cat}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      {cat}
                    </div>
                  );
                })()}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="font-display text-base md:text-lg font-semibold text-white drop-shadow group-hover:text-gold transition">{cat}</h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Showroom CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-blue" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(0.82_0.14_86/0.15),transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-4 py-14 md:py-20 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-shimmer">Explore Showroom</h2>
            <p className="mt-3 text-foreground/80 text-sm md:text-base max-w-xl">
              Browse the full catalogue. Add what you love. Send it all on WhatsApp in one go.
            </p>
          </div>
          <Link to="/showroom" className="btn-gold">
            Open Showroom <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 py-16 md:py-24">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground text-center mb-14">How It Works</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: ShoppingBag, label: "Select Products" },
            { icon: ListChecks, label: "Review Selection" },
            { icon: MessageCircle, label: "Send on WhatsApp" },
            { icon: CheckCircle2, label: "Confirm Order" },
          ].map((s, i) => (
            <div
              key={s.label}
              className="text-center glass rounded-xl p-6 hover-lift animate-[fade-up_.5s_ease-out_both]"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-gradient-gold flex items-center justify-center text-[var(--cta-foreground)] shadow-gold">
                <s.icon size={22} />
              </div>
              <p className="text-[10px] tracking-[0.25em] text-gold uppercase mb-1">Step {i + 1}</p>
              <p className="font-medium text-foreground text-sm md:text-base">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Project request */}
      <section id="start" className="relative">
        <div className="absolute inset-0 bg-gradient-blue opacity-50" />
        <div className="relative max-w-3xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-10 animate-[fade-up_.6s_ease-out_both]">
            <p className="text-xs tracking-[0.3em] text-gold uppercase mb-2">Get Started</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-shimmer">Start Your Project With Us</h2>
            <p className="mt-3 text-muted-foreground">
              Complete building finishing solutions for homes and commercial spaces.
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
      <div className="glass rounded-xl p-8 text-center animate-[scale-in_.4s_ease-out_both]">
        <CheckCircle2 className="mx-auto text-gold mb-3" size={36} />
        <h3 className="font-display text-xl text-foreground">Request received</h3>
        <p className="mt-2 text-muted-foreground text-sm">
          We'll get back to you shortly via your preferred contact method.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="glass rounded-xl p-6 md:p-8 space-y-4 animate-[fade-up_.6s_ease-out_both]">
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Full Name" name="full_name" required />
        <Field label="Phone Number" name="phone" type="tel" required />
        <Field label="Email" name="email" type="email" />
        <Field label="State" name="state" />
        <Field label="Project Type" name="project_type" placeholder="e.g. Doors, Tiles, Full finishing" />
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Preferred Contact</label>
          <select name="preferred_contact" className="w-full rounded-md border border-border bg-background/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-gold transition">
            <option value="WhatsApp">WhatsApp</option>
            <option value="Phone">Phone</option>
            <option value="Email">Email</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
        <textarea
          name="description"
          rows={4}
          placeholder="Tell us about your project..."
          className="w-full rounded-md border border-border bg-background/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-gold transition"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-gold w-full disabled:opacity-60">
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
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}{required && " *"}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-background/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold transition"
      />
    </div>
  );
}
