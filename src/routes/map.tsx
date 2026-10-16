import { createFileRoute, Link } from "@tanstack/react-router";
import { Layers, Siren } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FeatureDetail } from "@/components/feature-detail";
import { FloodMap, type LayerKey } from "@/components/flood-map";
import { AppShell } from "@/components/shell";
import { Pill } from "@/components/ui";
import {
  DISTRICTS,
  GAUGE,
  PRIORITY_LABEL,
  PRIORITY_RANK,
  TYPE_LABEL,
  districtById,
  isOpenStatus,
  toneForPriority,
  type MapSelection,
} from "@/lib/model";
import { useFloodStore } from "@/lib/store";
import { ago } from "@/lib/time";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/map")({
  validateSearch: (search: Record<string, unknown>): { d?: string } => {
    if (typeof search.d === "string" && search.d) return { d: search.d };
    return {};
  },
  component: MapPage,
});

const LAYER_LABEL: Record<LayerKey, string> = {
  situation: "สถานะพื้นที่",
  requests: "คำร้องขอความช่วยเหลือ",
  reports: "รายงานสถานการณ์",
  shelters: "ศูนย์พักพิง",
  relief: "สิ่งของที่ยังขาด",
  volunteers: "พื้นที่ที่มีทีม",
  roads: "สภาพเส้นทาง",
};

function MapPage() {
  const { d = "" } = Route.useSearch();
  const requests = useFloodStore((s) => s.requests);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    situation: true,
    requests: true,
    reports: true,
    shelters: false,
    relief: false,
    volunteers: false,
    roads: false,
  });
  const [layersOpen, setLayersOpen] = useState(false);
  const [sel, setSel] = useState<MapSelection | null>(null);
  const [focus, setFocus] = useState<{ lng: number; lat: number; key: number } | null>(null);

  useEffect(() => {
    if (!d) return;
    const district = districtById(d);
    if (!district) return;
    setSel({ kind: "district", id: d });
    setFocus({ lng: district.lng, lat: district.lat, key: Date.now() });
  }, [d]);

  const open = useMemo(() => requests.filter((req) => isOpenStatus(req.status)), [requests]);
  const urgent = [...open].sort(
    (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || +new Date(b.updatedAt) - +new Date(a.updatedAt),
  );
  const criticalDistricts = DISTRICTS.filter((item) => item.level === "critical").length;
  const critical = open.filter((req) => req.priority === "critical").length;
  const latest = requests[0]?.updatedAt;

  const summary = (
    <div className="flex h-full flex-col">
      <div className="border-b border-line p-4">
        <p className="text-xs font-semibold text-muted">สถานการณ์ตัวอย่าง</p>
        <h1 className="mt-1 text-lg font-semibold text-navy">แผนที่อุบลราชธานี</h1>
        <p className="mt-1 text-xs text-muted">
          {GAUGE.name} · {GAUGE.note}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="วิกฤต" value={critical} />
          <Stat label="คำร้องเปิด" value={open.length} />
          <Stat label="อำเภอวิกฤต" value={criticalDistricts} />
        </div>
        {latest ? <p className="mt-2 text-xs text-muted">อัปเดตคำร้องล่าสุด {ago(latest)}</p> : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <p className="px-1 pb-2 text-xs font-semibold text-muted">ต้องดูก่อน</p>
        <ul className="space-y-2">
          {urgent.slice(0, 6).map((req) => (
            <li key={req.id}>
              <button
                type="button"
                className="w-full rounded-xl border border-line p-3 text-left"
                onClick={() => {
                  setSel({ kind: "request", id: req.id });
                  setFocus({ lng: req.lng, lat: req.lat, key: Date.now() });
                }}
              >
                <div className="flex flex-wrap gap-1">
                  <Pill tone={toneForPriority(req.priority)}>{PRIORITY_LABEL[req.priority]}</Pill>
                  <Pill tone="muted">{TYPE_LABEL[req.type]}</Pill>
                </div>
                <p className="mt-2 text-sm font-semibold">
                  {districtById(req.districtId)?.name} · {req.placeLabel}
                </p>
                <p className="text-xs text-muted">{ago(req.updatedAt)}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="grid grid-cols-1 gap-2 border-t border-line p-3">
        <Link to="/help/new" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-crit px-3 text-sm font-semibold text-surface">
          <Siren className="size-4" />
          ขอความช่วยเหลือ
        </Link>
        <Link to="/report/new" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue px-3 text-sm font-semibold text-surface">
          แจ้งสถานการณ์
        </Link>
      </div>
    </div>
  );

  return (
    <AppShell bleed>
      <div className="relative h-full min-h-[480px]">
        <FloodMap layers={layers} selectedId={sel?.id} onSelect={setSel} focus={focus} chrome={false} />
        <aside className="absolute top-3 bottom-3 left-3 z-10 hidden w-80 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm lg:flex">
          {sel ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <FeatureDetail sel={sel} onClose={() => setSel(null)} />
            </div>
          ) : (
            summary
          )}
        </aside>
        <div className="pointer-events-none absolute top-3 right-3 left-3 z-10 flex items-start gap-2 lg:left-auto lg:max-w-md">
          <div className="pointer-events-auto flex min-w-0 flex-1 gap-2 overflow-x-auto lg:hidden">
            <Chip>วิกฤต {critical}</Chip>
            <Chip>เปิด {open.length}</Chip>
            <Chip>อำเภอวิกฤต {criticalDistricts}</Chip>
          </div>
        </div>
        <div className="absolute top-16 right-3 z-10 lg:top-3">
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-semibold shadow-sm"
            aria-expanded={layersOpen}
            onClick={() => setLayersOpen((v) => !v)}
          >
            <Layers className="size-4" />
            ชั้นข้อมูล
          </button>
          {layersOpen ? (
            <div className="mt-2 w-64 rounded-2xl border border-line bg-surface p-3 shadow-sm">
              {(Object.keys(LAYER_LABEL) as LayerKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={layers[key]}
                  className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm"
                  onClick={() => setLayers((prev) => ({ ...prev, [key]: !prev[key] }))}
                >
                  <span>{LAYER_LABEL[key]}</span>
                  <span className={cn("rounded-full px-2 py-1 text-xs font-semibold", layers[key] ? "bg-blue text-surface" : "bg-bg text-muted")}>
                    {layers[key] ? "เปิด" : "ปิด"}
                  </span>
                </button>
              ))}
              <p className="mt-2 text-xs leading-relaxed text-muted">ภาพพื้นหลังจาก OpenStreetMap จุดสีเป็นข้อมูลสาธิต</p>
            </div>
          ) : null}
        </div>
        {sel ? (
          <div className="absolute inset-x-0 bottom-0 z-20 max-h-[68%] overflow-y-auto rounded-t-2xl border border-line bg-surface p-4 shadow-sm lg:hidden">
            <FeatureDetail sel={sel} onClose={() => setSel(null)} />
          </div>
        ) : (
          <div className="absolute bottom-4 left-3 z-10 flex flex-col gap-2 lg:hidden">
            <Link to="/help/new" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-crit px-4 text-sm font-semibold text-surface shadow-sm">
              ขอความช่วยเหลือ
            </Link>
            <Link to="/report/new" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue px-4 text-sm font-semibold text-surface shadow-sm">
              แจ้งสถานการณ์
            </Link>
          </div>
        )}
        <div className="pointer-events-none absolute bottom-8 left-96 z-10 hidden items-center gap-3 rounded-xl bg-surface px-3 py-2 text-xs shadow-sm lg:flex">
          <LegendDot color="bg-crit" label="วิกฤต" />
          <LegendDot color="bg-hit" label="ได้รับผล" />
          <LegendDot color="bg-watch" label="เฝ้าระวัง" />
          <LegendDot color="bg-ok" label="ปกติ" />
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-bg px-2 py-2">
      <p className="text-lg font-semibold text-navy">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-line bg-surface px-3 text-sm font-semibold">
      {children}
    </span>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-ink">
      <span className={cn("inline-block size-2.5 rounded-full", color)} />
      {label}
    </span>
  );
}
