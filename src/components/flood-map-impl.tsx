import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import basemap from "@/lib/geo/ubon-basemap.json";
import {
  DISTRICTS,
  LEVEL_LABEL,
  ROADS,
  SHELTERS,
  SUPPLIES,
  supplyState,
  type MapKind,
  type MapSelection,
} from "@/lib/model";
import { useFloodStore } from "@/lib/store";

export type LayerKey =
  | "situation"
  | "requests"
  | "reports"
  | "shelters"
  | "relief"
  | "volunteers"
  | "roads";

const TONE: Record<string, string> = {
  normal: "#0f7a3d",
  watch: "#9a6700",
  affected: "#c2410c",
  critical: "#b42318",
  high: "#c2410c",
  medium: "#9a6700",
  low: "#0f7a3d",
  report: "#1f4f8a",
  shelter: "#1f4f8a",
  volunteer: "#0f7a3d",
  open: "#0f7a3d",
  caution: "#9a6700",
  closed: "#b42318",
  needed: "#b42318",
  partial: "#c2410c",
  fulfilled: "#0f7a3d",
};

const LAYER_ORDER: LayerKey[] = [
  "situation",
  "roads",
  "relief",
  "shelters",
  "volunteers",
  "reports",
  "requests",
];

type Dot = {
  id: string;
  kind: MapKind;
  layer: LayerKey;
  lng: number;
  lat: number;
  tone: string;
  r: number;
  label?: string;
};

export function FloodMap({
  layers,
  selectedId,
  onSelect,
  focus,
  pick,
  onPick,
  chrome = true,
  markers = [],
  storeData = true,
}: {
  layers: Record<LayerKey, boolean>;
  selectedId?: string;
  onSelect?: (selection: MapSelection | null) => void;
  focus?: { lng: number; lat: number; key: number } | null;
  pick?: { lng: number; lat: number } | null;
  onPick?: (lng: number, lat: number) => void;
  chrome?: boolean;
  markers?: { id: string; lng: number; lat: number; tone: string; label: string }[];
  storeData?: boolean;
}) {
  const requests = useFloodStore((s) => s.requests);
  const reports = useFloodStore((s) => s.reports);
  const volunteers = useFloodStore((s) => s.volunteers);
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const groups = useRef<Partial<Record<LayerKey, L.LayerGroup>>>({});
  const pickMarker = useRef<L.CircleMarker | null>(null);
  const onSelectRef = useRef(onSelect);
  const onPickRef = useRef(onPick);
  const [ready, setReady] = useState(false);
  const [tilesOk, setTilesOk] = useState(false);
  const zonesRef = useRef<L.GeoJSON | null>(null);
  onSelectRef.current = onSelect;
  onPickRef.current = onPick;

  const dots = useMemo(() => {
    const list: Dot[] = [];
    if (storeData && layers.roads) {
      for (const road of ROADS) {
        list.push({
          id: road.id,
          kind: "road",
          layer: "roads",
          lng: road.lng,
          lat: road.lat,
          tone: TONE[road.state] ?? TONE.open,
          r: 7,
          label: road.name,
        });
      }
    }
    if (storeData && layers.relief) {
      for (const item of SUPPLIES) {
        if (supplyState(item) === "fulfilled") continue;
        const district = DISTRICTS.find((d) => d.id === item.districtId);
        if (!district) continue;
        list.push({
          id: item.id,
          kind: "relief",
          layer: "relief",
          lng: district.lng + 0.04,
          lat: district.lat - 0.03,
          tone: TONE[supplyState(item)] ?? TONE.partial,
          r: 7,
          label: item.item,
        });
      }
    }
    if (storeData && layers.shelters) {
      for (const shelter of SHELTERS) {
        list.push({
          id: shelter.id,
          kind: "shelter",
          layer: "shelters",
          lng: shelter.lng,
          lat: shelter.lat,
          tone: TONE.shelter,
          r: 8,
          label: shelter.name,
        });
      }
    }
    if (storeData && layers.volunteers) {
      for (const district of DISTRICTS) {
        const count = volunteers.filter((vol) => vol.districtIds.includes(district.id)).length;
        if (!count) continue;
        list.push({
          id: district.id,
          kind: "volunteerArea",
          layer: "volunteers",
          lng: district.lng - 0.045,
          lat: district.lat + 0.03,
          tone: TONE.volunteer,
          r: 7,
          label: `ทีมใน${district.name}`,
        });
      }
    }
    if (storeData && layers.reports) {
      for (const report of reports) {
        list.push({
          id: report.id,
          kind: "report",
          layer: "reports",
          lng: report.lng,
          lat: report.lat,
          tone: TONE.report,
          r: 7,
          label: report.placeLabel,
        });
      }
    }
    if (storeData && layers.requests) {
      for (const req of requests) {
        if (req.status === "resolved" || req.status === "duplicate" || req.status === "unreachable") continue;
        list.push({
          id: req.id,
          kind: "request",
          layer: "requests",
          lng: req.lng,
          lat: req.lat,
          tone: TONE[req.priority] ?? TONE.report,
          r: 8,
          label: req.placeLabel,
        });
      }
    }
    for (const marker of markers) {
      list.push({
        id: marker.id,
        kind: "request",
        layer: "requests",
        lng: marker.lng,
        lat: marker.lat,
        tone: marker.tone,
        r: 8,
        label: marker.label,
      });
    }
    return list;
  }, [layers, reports, requests, volunteers, markers, storeData]);

  useEffect(() => {
    const el = holder.current;
    if (!el || mapRef.current) return;
    const map = L.map(el, {
      center: [15.24, 105.02],
      zoom: 9,
      minZoom: 8,
      maxZoom: 18,
      maxBounds: L.latLngBounds([13.9, 103.7], [16.7, 106.4]),
      maxBoundsViscosity: 0.7,
      zoomControl: false,
      zoomSnap: 0.5,
      attributionControl: true,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    // Panes, bottom to top: our own drawn map, web tiles (Leaflet's tilePane,
    // z 200), district colors, rivers, place labels, then the markers.
    map.createPane("base").style.zIndex = "150";
    map.createPane("zones").style.zIndex = "350";
    map.createPane("rivers").style.zIndex = "380";
    map.createPane("places").style.zIndex = "390";
    map.getPane("rivers")!.style.pointerEvents = "none";
    map.getPane("places")!.style.pointerEvents = "none";

    // A map of Ubon drawn from bundled data. It is always there, so the page
    // still shows the province when map tiles cannot load (offline, blocked).
    L.geoJSON(basemap.neighbors as FeatureCollection, {
      pane: "base",
      interactive: false,
      style: { color: "#c3cfdd", weight: 1, fillColor: "#e9eef4", fillOpacity: 1 },
    }).addTo(map);
    L.geoJSON(basemap.province as Feature, {
      pane: "base",
      interactive: false,
      style: { color: "#7d95b3", weight: 2, fillColor: "#f8fafc", fillOpacity: 1 },
    }).addTo(map);
    L.geoJSON(basemap.rivers as FeatureCollection, {
      pane: "rivers",
      interactive: false,
      style: { color: "#3b8fd9", weight: 2.4, opacity: 0.85 },
      onEachFeature: (feature, layer) => {
        layer.bindTooltip(String(feature.properties?.name ?? ""), { sticky: true, className: "map-river-tip" });
      },
    }).addTo(map);
    for (const place of [
      { name: "สปป.ลาว", lat: 15.75, lng: 105.85 },
      { name: "กัมพูชา", lat: 14.08, lng: 105.2 },
    ]) {
      L.marker([place.lat, place.lng], {
        pane: "places",
        interactive: false,
        icon: L.divIcon({ className: "map-place", html: place.name, iconSize: [80, 20], iconAnchor: [40, 10] }),
      }).addTo(map);
    }

    // Web map tiles: OpenStreetMap first, CARTO if OSM keeps failing. OSM's
    // tile policy asks for a Referer, so send the page origin.
    const tileOptions: L.TileLayerOptions = {
      maxZoom: 19,
      referrerPolicy: "strict-origin-when-cross-origin",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    };
    let tiles: L.TileLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", tileOptions);
    let failed = 0;
    let usingCarto = false;
    const watchTiles = (layer: L.TileLayer) => {
      layer.on("tileload", () => setTilesOk(true));
      layer.on("tileerror", () => {
        failed += 1;
        if (failed < 6) return;
        failed = 0;
        layer.remove();
        if (usingCarto) {
          setTilesOk(false);
          return;
        }
        usingCarto = true;
        tiles = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          ...tileOptions,
          subdomains: "abcd",
          maxZoom: 20,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO',
        });
        watchTiles(tiles);
        tiles.addTo(map);
      });
    };
    watchTiles(tiles);
    tiles.addTo(map);
    const zoomClass = () => {
      el.classList.toggle("map-zoomed", map.getZoom() >= 10);
    };
    map.on("zoomend", zoomClass);
    zoomClass();
    for (const key of LAYER_ORDER) {
      groups.current[key] = L.layerGroup().addTo(map);
    }
    map.on("click", (event) => {
      onPickRef.current?.(event.latlng.lng, event.latlng.lat);
    });
    mapRef.current = map;
    setReady(true);
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(el);
    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      groups.current = {};
      pickMarker.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    for (const key of LAYER_ORDER) groups.current[key]?.clearLayers();
    for (const dot of dots) {
      const group = groups.current[dot.layer];
      if (!group) continue;
      const active = selectedId === dot.id;
      const marker = L.circleMarker([dot.lat, dot.lng], {
        radius: dot.r,
        color: active ? "#122033" : "#ffffff",
        weight: active ? 3 : 1.5,
        fillColor: dot.tone,
        fillOpacity: dot.kind === "district" ? 0.72 : 0.95,
      });
      if (dot.label) marker.bindTooltip(dot.label, { direction: "top", opacity: 0.95 });
      marker.on("click", (event) => {
        L.DomEvent.stopPropagation(event);
        if (onPickRef.current) {
          onPickRef.current(event.latlng.lng, event.latlng.lat);
          return;
        }
        onSelectRef.current?.({ kind: dot.kind, id: dot.id });
      });
      marker.addTo(group);
    }
  }, [dots, ready, selectedId]);

  // District colors by flood level, drawn from the bundled boundaries.
  const showZones = storeData && layers.situation;
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    zonesRef.current?.remove();
    zonesRef.current = null;
    if (!showZones) return;
    const level = new Map(DISTRICTS.map((d) => [d.id, d]));
    const fill = tilesOk ? 0.32 : 0.5;
    const zones = L.geoJSON(basemap.districts as FeatureCollection<Geometry, { id: string; name: string }>, {
      pane: "zones",
      style: (feature) => {
        const d = level.get(feature?.properties.id ?? "");
        const active = selectedId === feature?.properties.id;
        return {
          color: active ? "#122033" : "#ffffff",
          weight: active ? 3 : 1.2,
          fillColor: TONE[d?.level ?? "normal"] ?? TONE.normal,
          fillOpacity: active ? fill + 0.15 : fill,
        };
      },
      onEachFeature: (feature, layer) => {
        const d = level.get(feature.properties.id);
        layer.bindTooltip(feature.properties.name, {
          permanent: true,
          direction: "center",
          className: "map-district-label",
        });
        layer.bindPopup(
          `<strong>อ.${feature.properties.name}</strong><br/>${d ? LEVEL_LABEL[d.level] : ""}`,
          { closeButton: false, autoPan: false },
        );
        layer.on("mouseover", () => (layer as L.Path).setStyle({ weight: 2.5, color: "#122033" }));
        layer.on("mouseout", () => zones.resetStyle(layer));
        layer.on("click", (event: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(event);
          if (onPickRef.current) {
            onPickRef.current(event.latlng.lng, event.latlng.lat);
            return;
          }
          if (onSelectRef.current) {
            layer.closePopup();
            onSelectRef.current({ kind: "district", id: feature.properties.id });
          }
        });
      },
    });
    zones.addTo(map);
    zonesRef.current = zones;
  }, [ready, showZones, selectedId, tilesOk]);

  useEffect(() => {
    if (!ready || !focus || !mapRef.current) return;
    mapRef.current.flyTo([focus.lat, focus.lng], 14, { duration: 0.55 });
  }, [focus, ready]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    pickMarker.current?.remove();
    pickMarker.current = null;
    if (!pick) return;
    pickMarker.current = L.circleMarker([pick.lat, pick.lng], {
      radius: 8,
      color: "#ffffff",
      weight: 2,
      fillColor: "#b42318",
      fillOpacity: 1,
    }).addTo(mapRef.current);
  }, [pick, ready]);

  return (
    <div className="absolute inset-0 z-0 isolate overflow-hidden bg-mist" data-map="ubon">
      <div ref={holder} className="h-full w-full" />
      {chrome ? (
        <>
          <div className="pointer-events-none absolute top-3 left-3 z-10 max-w-56 rounded-xl bg-surface/95 px-3 py-2 text-xs text-ink shadow-sm">
            <p className="font-semibold">แผนที่อุบลราชธานี</p>
            <p className="text-muted">สีอำเภอคือระดับสถานการณ์ตัวอย่าง</p>
          </div>
          <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-wrap gap-2 rounded-xl bg-surface/95 px-3 py-2 text-xs shadow-sm">
            <Legend color="#b42318" label="วิกฤต" />
            <Legend color="#c2410c" label="ได้รับผล" />
            <Legend color="#9a6700" label="เฝ้าระวัง" />
            <Legend color="#0f7a3d" label="ปกติ" />
          </div>
        </>
      ) : null}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-ink">
      <span className="inline-block size-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
