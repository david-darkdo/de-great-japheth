import { createFileRoute } from "@tanstack/react-router";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — DE GREAT JAFFET" },
      { name: "description", content: "Get in touch with De Great Jaffet for premium building materials and finishing." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <SiteLayout>
      <section className="border-b border-border bg-accent/40">
        <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
          <p className="text-xs tracking-[0.3em] text-secondary uppercase mb-2">Get in touch</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-primary">Contact Us</h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Visit us at the showroom or reach us through any of the channels below.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-12 grid md:grid-cols-2 gap-8">
        <div className="space-y-5">
          <Item icon={Phone} title="Phone" lines={[
            { text: "0706 678 6626", href: "tel:07066786626" },
            { text: "0806 671 3790", href: "tel:08066713790" },
          ]} />
          <Item icon={MessageCircle} title="WhatsApp" lines={[
            { text: "Chat with us", href: "https://wa.me/2347066786626" },
          ]} />
          <Item icon={Mail} title="Email" lines={[
            { text: "japhetanele661@gmail.com", href: "mailto:japhetanele661@gmail.com" },
          ]} />
          <Item icon={MapPin} title="Address" lines={[
            {
              text: "Dei Dei Building Materials Market, Front Shop No. 14",
              href: "https://www.google.com/maps/search/?api=1&query=Dei+Dei+Building+Materials+Market+Abuja",
            },
          ]} />
        </div>
        <div className="rounded-lg overflow-hidden border border-border min-h-[300px]">
          <iframe
            title="Showroom location"
            src="https://www.google.com/maps?q=Dei+Dei+Building+Materials+Market+Abuja&output=embed"
            className="w-full h-full min-h-[300px]"
            loading="lazy"
          />
        </div>
      </section>
    </SiteLayout>
  );
}

function Item({ icon: Icon, title, lines }: {
  icon: React.ComponentType<{ size?: number }>; title: string;
  lines: { text: string; href: string }[];
}) {
  return (
    <div className="flex gap-4">
      <div className="w-11 h-11 shrink-0 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
        <Icon size={18} />
      </div>
      <div>
        <h3 className="font-display text-lg text-primary">{title}</h3>
        {lines.map((l) => (
          <a key={l.href} href={l.href} target={l.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
             className="block text-sm text-muted-foreground hover:text-secondary">
            {l.text}
          </a>
        ))}
      </div>
    </div>
  );
}
