import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/showroom" });
  },
  head: () => ({
    meta: [
      { title: "Showroom — DE GREAT JAPHET" },
      { name: "description", content: "Browse DE GREAT JAPHET products by category and add selections to your cart." },
    ],
  }),
});
