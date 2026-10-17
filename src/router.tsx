import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  // New page starts at the top; back/forward returns to where you were.
  return createRouter({ routeTree, defaultErrorComponent: AppErrorComponent, scrollRestoration: true });
}
