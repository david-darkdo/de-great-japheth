import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/start-project")({
  head: () => ({
    meta: [
      { title: "Start Project — DE GREAT JAPHET" },
      { name: "description", content: "Send your building finishing request to DE GREAT JAPHET." },
    ],
  }),
  component: StartProjectPage,
});

function StartProjectPage() {
  return (
    <SiteLayout>
      <section className="relative border-b border-[oklch(0.82_0.14_86/0.15)]">
        <div className="absolute inset-0 bg-gradient-blue opacity-50" />
        <div className="relative max-w-3xl mx-auto px-4 py-12 md:py-16">
          <p className="text-xs tracking-[0.3em] text-gold uppercase mb-2">Get Started</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-shimmer">Start Your Project With Us</h1>
          <p className="mt-3 text-muted-foreground">
            Complete building finishing solutions for homes and commercial spaces.
          </p>
        </div>
      </section>
      <section className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        <ProjectRequestForm />
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
