import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/empresa/$slug")({
  component: () => <Outlet />,
});
