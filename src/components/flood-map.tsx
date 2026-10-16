// Leaflet touches `window` as soon as it is imported, which breaks server
// rendering. Load the real map only in the browser, after the first paint.
import { Suspense, lazy, useEffect, useState, type ComponentProps } from "react";
import type { FloodMap as FloodMapImpl } from "./flood-map-impl";

export type { LayerKey } from "./flood-map-impl";

const Impl = lazy(() => import("./flood-map-impl").then((m) => ({ default: m.FloodMap })));

function Placeholder() {
  return <div className="absolute inset-0 bg-mist" aria-label="กำลังโหลดแผนที่" />;
}

export function FloodMap(props: ComponentProps<typeof FloodMapImpl>) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <Placeholder />;
  return (
    <Suspense fallback={<Placeholder />}>
      <Impl {...props} />
    </Suspense>
  );
}
