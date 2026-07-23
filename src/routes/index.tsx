import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "./home";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DE GREAT JAPHET — Living Greatfull | Premium Building Materials" },
      { name: "description", content: "We supply and install high-quality building materials for modern interiors and construction finishing." },
    ],
  }),
  component: HomePage,
});
