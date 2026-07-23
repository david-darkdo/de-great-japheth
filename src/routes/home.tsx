import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "./index";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "DE GREAT JAPHET — Living Greatfull" },
      { name: "description", content: "We supply and install high-quality building materials for modern interiors and construction finishing." },
    ],
  }),
  component: HomePage,
});
