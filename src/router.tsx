import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  // New page starts at the top; back/forward returns to where you were.
  // Links start loading the next page as soon as a finger or pointer lands on
  // them, so the page is usually ready by the time the tap finishes.
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 40,
  });
}
