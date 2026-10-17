// Where it is: one tap on "use my location" (GPS), a tap on the map, or typed
// numbers copied from Google Maps. Shows the coordinates so people can check them.
import { Crosshair, ExternalLink, Keyboard, Loader2, MapPin, X } from "lucide-react";
import { useState } from "react";
import { FloodMap, type LayerKey } from "@/components/flood-map";
import { cn } from "@/lib/cn";
import { districtAt, formatCoord, inUbon, mapsLink, parseCoord } from "@/lib/geo/locate";
import type { GeoVia } from "@/lib/model";
import { controlClass } from "@/components/ui";

export type GeoValue = { lng: number; lat: number; accuracy?: number; via: GeoVia };

const OFF: Record<LayerKey, boolean> = {
  situation: true,
  requests: false,
  reports: false,
  shelters: false,
  relief: false,
  volunteers: false,
  roads: false,
};

const VIA_LABEL: Record<GeoVia, string> = { gps: "จาก GPS", map: "ปักบนแผนที่", typed: "พิมพ์เอง" };

export function LocationField({
  value,
  onChange,
  onDistrict,
  focus,
}: {
  value: GeoValue | null;
  onChange: (next: GeoValue | null) => void;
  /** Called with the district the point falls in, so the form can fill it in. */
  onDistrict?: (districtId: string) => void;
  focus?: { lng: number; lat: number; key: number } | null;
}) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const [mapFocus, setMapFocus] = useState<{ lng: number; lat: number; key: number } | null>(null);

  function accept(next: GeoValue) {
    if (!inUbon(next.lat, next.lng)) {
      setProblem("จุดนี้อยู่นอกจังหวัดอุบลราชธานี ลองแตะแผนที่แทน");
      return;
    }
    setProblem("");
    onChange(next);
    setMapFocus({ lng: next.lng, lat: next.lat, key: Date.now() });
    const district = districtAt(next.lng, next.lat);
    if (district) onDistrict?.(district);
  }

  function useGps() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setProblem("เครื่องนี้ใช้ GPS ผ่านเว็บไม่ได้ แตะแผนที่หรือพิมพ์พิกัดแทน");
      return;
    }
    setBusy(true);
    setProblem("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        accept({ lng: pos.coords.longitude, lat: pos.coords.latitude, accuracy: Math.round(pos.coords.accuracy), via: "gps" });
      },
      (err) => {
        setBusy(false);
        setProblem(
          err.code === err.PERMISSION_DENIED
            ? "ยังไม่ได้อนุญาตให้ใช้ตำแหน่ง กดอนุญาตในเบราว์เซอร์ หรือแตะแผนที่แทน"
            : err.code === err.TIMEOUT
              ? "หาตำแหน่งนานเกินไป ลองอีกครั้งในที่โล่ง หรือแตะแผนที่แทน"
              : "หาตำแหน่งไม่ได้ ลองเปิด GPS ในเครื่อง หรือแตะแผนที่แทน",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }

  function applyTyped() {
    const point = parseCoord(typed);
    if (!point) {
      setProblem("รูปแบบไม่ถูก ใส่ ละติจูด, ลองจิจูด เช่น 15.2286, 104.8564");
      return;
    }
    accept({ ...point, via: "typed" });
    setTyping(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={useGps}
          disabled={busy}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-blue px-4 text-sm font-semibold text-surface shadow-sm transition active:scale-[0.98] disabled:opacity-70"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Crosshair className="size-4" />}
          {busy ? "กำลังหาตำแหน่ง…" : "ใช้ตำแหน่งปัจจุบัน (GPS)"}
        </button>
        <button
          type="button"
          onClick={() => setTyping((v) => !v)}
          className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink"
          aria-expanded={typing}
        >
          <Keyboard className="size-4" /> พิมพ์พิกัด
        </button>
      </div>

      {typing ? (
        <div className="flex gap-2">
          <input
            className={controlClass}
            inputMode="decimal"
            placeholder="เช่น 15.2286, 104.8564"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyTyped();
            }}
          />
          <button type="button" onClick={applyTyped} className="min-h-11 shrink-0 rounded-xl bg-navy px-4 text-sm font-semibold text-surface">
            ใช้
          </button>
        </div>
      ) : null}

      {problem ? <p className="rounded-xl bg-watch-soft px-3 py-2 text-xs text-watch">{problem}</p> : null}

      {value ? (
        <div className="fade-in flex items-start gap-3 rounded-xl border border-ok/30 bg-ok-soft px-3 py-2.5">
          <MapPin className="mt-0.5 size-4 shrink-0 text-ok" />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-sm font-semibold text-navy">{formatCoord(value.lat, value.lng)}</p>
            <p className="text-xs text-muted">
              {VIA_LABEL[value.via]}
              {value.accuracy != null ? ` · แม่นยำประมาณ ±${value.accuracy} ม.` : ""}
            </p>
            <a
              href={mapsLink(value.lat, value.lng)}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue"
            >
              ตรวจใน Google Maps <ExternalLink className="size-3" />
            </a>
          </div>
          <button type="button" onClick={() => onChange(null)} aria-label="ล้างพิกัด" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface">
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      <div className={cn("relative h-56 overflow-hidden rounded-xl border border-line")}>
        <FloodMap
          layers={OFF}
          onPick={(lng, lat) => accept({ lng, lat, via: "map" })}
          pick={value ? { lng: value.lng, lat: value.lat } : null}
          focus={mapFocus ?? focus ?? undefined}
          chrome={false}
        />
      </div>
      <p className="text-xs text-muted">{value ? "แตะแผนที่เพื่อย้ายหมุดได้" : "หรือแตะแผนที่เพื่อปักหมุดเอง ถ้าไม่ใส่ ระบบใช้จุดกลางอำเภอ"}</p>
    </div>
  );
}

/** A point shown back: coordinates, how sure, and a button that opens navigation. */
export function CoordLine({
  lat,
  lng,
  accuracy,
  via,
  approx,
}: {
  lat: number;
  lng: number;
  accuracy?: number;
  via?: GeoVia;
  /** True when no point was given and this is only the district centre. */
  approx?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-bg px-3 py-2 text-xs">
      <span className="inline-flex items-center gap-1.5 text-ink">
        <MapPin className={cn("size-3.5", approx ? "text-muted" : "text-ok")} />
        <span className="font-mono font-semibold">{formatCoord(lat, lng)}</span>
      </span>
      <span className="text-muted">
        {approx ? "จุดคร่าว ๆ กลางอำเภอ" : via ? VIA_LABEL[via] : "พิกัดที่ผู้แจ้งให้"}
        {accuracy != null && !approx ? ` · ±${accuracy} ม.` : ""}
      </span>
      <a
        href={mapsLink(lat, lng)}
        target="_blank"
        rel="noreferrer"
        className="ml-auto inline-flex items-center gap-1 rounded-lg bg-blue px-2.5 py-1.5 font-semibold text-surface"
      >
        นำทาง <ExternalLink className="size-3" />
      </a>
    </div>
  );
}
