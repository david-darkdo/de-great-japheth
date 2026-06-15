import { createFileRoute } from "@tanstack/react-router";
import { ShowroomPage } from "@/routes/showroom";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Showroom — DE GREAT JAPHET" },
      { name: "description", content: "Browse DE GREAT JAPHET products by category and add selections to your cart." },
    ],
  }),
  component: ShowroomPage,
});
