import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/start-project")({
  component: () => <Navigate to="/" hash="start" />,
});
