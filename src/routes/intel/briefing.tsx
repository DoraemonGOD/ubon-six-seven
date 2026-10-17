// Situation summary in plain terms: four numbers, what to do now, what is
// running short, and which shelters are filling up. Long lists are folded.
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Clock, House, Package, RefreshCw } from "lucide-react";
import { useState, type ReactNode } from "react";
import { getIntelBriefing } from "@/lib/intel/fns";
import { CATEGORY_LABEL, URGENCY_LABEL, VERIFY_LABEL } from "@/lib/intel/labels";
import { cn } from "@/lib/cn";
import { DISTRICTS, districtById } from "@/lib/model";
import { useFloodStore } from "@/lib/store";

export const Route = createFileRoute("/intel/briefing")({
  loader: () => getIntelBriefing({ data: {} }),
  component: Briefing,
});

type Data = Extract<Awaited<ReturnType<typeof getIntelBriefing>>, { ok: true }>;
type Row = Data["urgent"][number];

function Briefing() {
  const initial = Route.useLoaderData();
  const [data, setData] = useState(initial);
  const [districtId, setDistrictId] = useState("");
  const [busy, setBusy] = useState(false);
  const shelters = useFloodStore((s) => s.shelters);
  if (!data.ok) return <p className="text-sm">ไม่มีสิทธิ์</p>;

  async function load(id: string) {
    setBusy(true);
    setDistrictId(id);
    setData(await getIntelBriefing({ data: { districtId: id } }));
    setBusy(false);
  }

  const place = districtId ? `อ.${districtById(districtId)?.name}` : "ทั้งจังหวัด";
  const filling = shelters
    .filter((s) => !districtId || s.districtId === districtId)
    .map((s) => ({ ...s, pct: s.capacity ? Math.round((s.current / s.capacity) * 100) : 100 }))
    .sort((a, b) => b.pct - a.pct);
  const nearFull = filling.filter((s) => s.pct > 80);
  const time = new Date(data.generatedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-navy">สรุปสถานการณ์</h1>
        <p className="mt-1 text-sm text-muted">
          {place} · อัปเดต {time} น.
        </p>
      </header>

      <div className="flex gap-2">
        <select
          className="min-h-11 min-w-0 flex-1 rounded-xl border-2 border-line bg-surface px-3 text-base"
          value={districtId}
          onChange={(e) => void load(e.target.value)}
          aria-label="เลือกพื้นที่"
        >
          <option value="">ทั้งจังหวัด</option>
          {DISTRICTS.map((d) => (
            <option key={d.id} value={d.id}>
              อ.{d.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void load(districtId)}
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border-2 border-line bg-surface px-3 text-sm font-semibold text-ink"
        >
          <RefreshCw className={cn("size-4", busy && "animate-spin")} /> อัปเดต
        </button>
      </div>

      {/* 1. Four numbers */}
      <section className={cn("grid grid-cols-2 gap-3 transition-opacity sm:grid-cols-4", busy && "opacity-50")}>
        <Big icon={<AlertTriangle className="size-5" />} n={data.urgent.length} label="เรื่องเร่งด่วน" tone="crit" />
        <Big icon={<Clock className="size-5" />} n={data.unverified.length} label="รอตรวจสอบ" tone="orange" />
        <Big icon={<CheckCircle2 className="size-5" />} n={data.verified.length} label="ยืนยันแล้ว" tone="ok" />
        <Big icon={<Package className="size-5" />} n={data.shortages.length} label="ของที่ยังขาด" tone="blue" />
      </section>

      {/* 2. What to do now */}
      <Section title="ต้องจัดการก่อน" hint="เรื่องวิกฤตและเร่งด่วนที่ยังไม่จบ แตะเพื่อเปิดดู">
        {data.urgent.length === 0 ? (
          <Empty>ไม่มีเรื่องเร่งด่วนค้าง</Empty>
        ) : (
          <ul className="space-y-2">
            {data.urgent.slice(0, 5).map((row) => (
              <IncidentCard key={row.id} row={row} />
            ))}
          </ul>
        )}
        {data.urgent.length > 5 ? <More rows={data.urgent.slice(5)} label={`ดูอีก ${data.urgent.length - 5} เรื่อง`} /> : null}
      </Section>

      {/* 3. Short supplies */}
      <Section title="ของที่ยังขาด" hint="แก้ยอดได้ที่หน้าสิ่งของและศูนย์พักพิง" link={{ to: "/intel/resources", label: "จัดการ" }}>
        {data.shortages.length === 0 ? (
          <Empty>ไม่มีของขาด</Empty>
        ) : (
          <ul className="card divide-y divide-line px-4">
            {data.shortages.map((item) => {
              const pct = item.needed ? Math.min(100, Math.round((item.have / item.needed) * 100)) : 100;
              return (
                <li key={item.id} className="py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold text-ink">
                      {item.name} <span className="text-sm font-normal text-muted">· อ.{item.district}</span>
                    </p>
                    <p className="shrink-0 text-sm font-semibold text-crit">ขาด {(item.needed - item.have).toLocaleString("th-TH")}</p>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-bg">
                    <div className={cn("h-full", pct < 50 ? "bg-crit" : "bg-orange")} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    มี {item.have.toLocaleString("th-TH")} จาก {item.needed.toLocaleString("th-TH")}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* 4. Shelters */}
      <Section title="ศูนย์พักพิง" hint={nearFull.length ? `ใกล้เต็ม ${nearFull.length} แห่ง` : "ทุกแห่งยังรับได้"} link={{ to: "/intel/resources", label: "จัดการ", hash: "shelters" }}>
        {filling.length === 0 ? (
          <Empty>ไม่มีศูนย์พักพิงในพื้นที่นี้</Empty>
        ) : (
          <ul className="card divide-y divide-line px-4">
            {filling.slice(0, 5).map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-3">
                <House className={cn("size-5 shrink-0", s.pct > 80 ? "text-crit" : "text-blue")} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{s.name}</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg">
                    <div className={cn("h-full", s.pct > 80 ? "bg-crit" : "bg-blue")} style={{ width: `${Math.min(100, s.pct)}%` }} />
                  </div>
                </div>
                <p className={cn("shrink-0 text-right text-sm font-semibold", s.pct > 80 ? "text-crit" : "text-ink")}>
                  {s.current}/{s.capacity}
                  <span className="block text-xs font-normal text-muted">ว่าง {Math.max(0, s.capacity - s.current)}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* 5. Everything else, folded */}
      <section className="space-y-2">
        <Fold title={`รอตรวจสอบ (${data.unverified.length})`} rows={data.unverified} />
        <Fold title={`ยืนยันแล้ว (${data.verified.length})`} rows={data.verified} />
      </section>

      <p className="rounded-xl bg-watch-soft px-4 py-3 text-sm text-watch">
        พื้นที่ที่ไม่มีรายงานไม่ได้แปลว่าปลอดภัย แค่ยังไม่มีข้อมูลยืนยัน
        {data.uncovered.length > 0 ? ` · ยังไม่มีรายงาน ${data.uncovered.length} อำเภอ` : ""}
      </p>
      <p className="text-center text-xs text-muted">สรุปด้วยกฎในระบบ ไม่ได้ใช้ AI</p>
    </div>
  );
}

const TONE = {
  crit: "bg-crit-soft text-crit",
  orange: "bg-orange-soft text-orange",
  ok: "bg-ok-soft text-ok",
  blue: "bg-blue-soft text-blue",
} as const;

function Big({ icon, n, label, tone }: { icon: ReactNode; n: number; label: string; tone: keyof typeof TONE }) {
  return (
    <div className="card p-4">
      <span className={cn("grid size-9 place-items-center rounded-xl", TONE[tone])}>{icon}</span>
      <p className="mt-2 text-3xl font-bold text-navy">{n}</p>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

function Section({ title, hint, link, children }: { title: string; hint?: string; link?: { to: "/intel/resources"; label: string; hash?: string }; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-navy">{title}</h2>
          {hint ? <p className="text-xs text-muted">{hint}</p> : null}
        </div>
        {link ? (
          <Link to={link.to} hash={link.hash} className="inline-flex shrink-0 items-center text-sm font-semibold text-blue">
            {link.label} <ChevronRight className="size-4" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="card p-4 text-center text-sm text-muted">{children}</p>;
}

function IncidentCard({ row }: { row: Row }) {
  const critical = row.urgency === "critical";
  return (
    <li>
      <Link
        to="/intel/review/$id"
        params={{ id: row.id }}
        className={cn("card flex items-center gap-3 border-l-4 p-3", critical ? "border-l-crit" : "border-l-orange")}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className={cn("rounded-full px-2 py-0.5 font-semibold", critical ? "bg-crit-soft text-crit" : "bg-orange-soft text-orange")}>
              {URGENCY_LABEL[row.urgency] ?? row.urgency}
            </span>
            <span className="text-muted">
              อ.{row.district} · {CATEGORY_LABEL[row.category] ?? row.category}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm font-medium text-ink">{row.summary}</p>
          <p className="mt-0.5 text-xs text-muted">{VERIFY_LABEL[row.verification] ?? row.verification}</p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted" />
      </Link>
    </li>
  );
}

function More({ rows, label }: { rows: Row[]; label: string }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 w-full rounded-xl border-2 border-line bg-surface py-2.5 text-sm font-semibold text-blue">
        {label}
      </button>
    );
  }
  return (
    <ul className="mt-2 space-y-2">
      {rows.map((row) => (
        <IncidentCard key={row.id} row={row} />
      ))}
    </ul>
  );
}

function Fold({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <details className="card group overflow-hidden">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-semibold text-navy">
        {title}
        <ChevronDown className="size-5 text-muted transition group-open:rotate-180" />
      </summary>
      <ul className="divide-y divide-line border-t border-line">
        {rows.length === 0 ? <li className="px-4 py-3 text-sm text-muted">ไม่มี</li> : null}
        {rows.map((row) => (
          <li key={row.id}>
            <Link to="/intel/review/$id" params={{ id: row.id }} className="flex items-center gap-2 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink">{row.summary}</span>
                <span className="text-xs text-muted">
                  อ.{row.district}
                  {row.outdated ? " · ข้อมูลเก่า" : ""}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
