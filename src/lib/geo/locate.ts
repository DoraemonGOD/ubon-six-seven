// Small helpers for points: which district a point falls in, how to show it,
// and a link that opens it in the phone's map app.
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from "geojson";
import basemap from "./ubon-basemap.json";
import { DISTRICTS } from "@/lib/model";

type DistrictFeature = Feature<Polygon | MultiPolygon, { id: string; name: string }>;

function inRing(lng: number, lat: number, ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inPolygon(lng: number, lat: number, rings: number[][][]) {
  if (!rings.length || !inRing(lng, lat, rings[0])) return false;
  return !rings.slice(1).some((hole) => inRing(lng, lat, hole));
}

/** District id for a point: the polygon it sits in, else the nearest district centre within ~25 km. */
export function districtAt(lng: number, lat: number): string | null {
  const features = (basemap.districts as FeatureCollection).features as DistrictFeature[];
  for (const f of features) {
    const g = f.geometry;
    const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    if (polys.some((rings) => inPolygon(lng, lat, rings as number[][][]))) return f.properties.id;
  }
  let best: { id: string; d: number } | null = null;
  for (const d of DISTRICTS) {
    const dist = Math.hypot(d.lng - lng, d.lat - lat);
    if (!best || dist < best.d) best = { id: d.id, d: dist };
  }
  return best && best.d < 0.25 ? best.id : null;
}

export function formatCoord(lat: number, lng: number) {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/** Opens Google Maps (app on phones, website elsewhere) at the point. */
export function mapsLink(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

/** Reads "15.24, 104.85" or "15.24 104.85" (lat first, as Google Maps copies it). */
export function parseCoord(text: string): { lat: number; lng: number } | null {
  const m = text.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  let lat = Number(m[1]);
  let lng = Number(m[2]);
  if (lat > 90 && lng < 90) [lat, lng] = [lng, lat];
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export function inUbon(lat: number, lng: number) {
  return lng > 103.5 && lng < 106.6 && lat > 13.7 && lat < 16.9;
}
