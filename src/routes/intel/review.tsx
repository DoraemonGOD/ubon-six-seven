import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/intel/review")({
  component: () => <Outlet />,
});
