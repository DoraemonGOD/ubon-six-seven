import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileSearch,
  HeartHandshake,
  House,
  Loader,
  Map,
  MapPin,
  Megaphone,
  Package,
  Siren,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import { FloodMap, type LayerKey } from "@/components/flood-map";
import { AppShell } from "@/components/shell";
import { IconBadge, Pill, StatCard, TONES, type Tone } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  DISTRICTS,
  PRIORITY_LABEL,
  PRIORITY_RANK,
  SHELTERS,
  TYPE_LABEL,
  districtById,
  isOpenStatus,
  toneForPriority,
} from "@/lib/model";
import { useFloodStore } from "@/lib/store";
import { ago } from "@/lib/time";

export const Route = createFileRoute("/")({
  component: Home,
});

const HOME_LAYERS: Record<LayerKey, boolean> = {
  situation: true,
  requests: true,
  reports: false,
  shelters: true,
  relief: false,
  volunteers: false,
  roads: false,
};

const SHORTCUTS: { to: "/map" | "/help/new" | "/report/new" | "/volunteer" | "/supplies" | "/shelters"; label: string; icon: LucideIcon; tone: Tone }[] = [
  { to: "/map", label: "แผนที่", icon: Map, tone: "sky" },
  { to: "/help/new", label: "ขอความช่วยเหลือ", icon: Siren, tone: "red" },
  { to: "/report/new", label: "แจ้งสถานการณ์", icon: Megaphone, tone: "blue" },
  { to: "/volunteer", label: "สมัครอาสา", icon: HeartHandshake, tone: "purple" },
  { to: "/supplies", label: "สิ่งของ", icon: Package, tone: "orange" },
  { to: "/shelters", label: "ศูนย์พักพิง", icon: House, tone: "teal" },
];

function Home() {
  const requests = useFloodStore((s) => s.requests);
  const reports = useFloodStore((s) => s.reports);
  const volunteers = useFloodStore((s) => s.volunteers);
  const open = useMemo(() => requests.filter((req) => isOpenStatus(req.status)), [requests]);
  const working = requests.filter((req) => req.status === "assigned" || req.status === "in_progress").length;
  const resolved = requests.filter((req) => req.status === "resolved").length;
  const affected = DISTRICTS.filter((d) => d.level === "critical" || d.level === "affected").length;
  const critical = DISTRICTS.filter((d) => d.level === "critical").length;
  const shelterRoom = SHELTERS.reduce((n, s) => n + Math.max(0, s.capacity - s.current), 0);
  const verifiedVolunteers = volunteers.filter((v) => v.approval === "verified").length;

  const urgent = useMemo(
    () =>
      [...open]
        .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || +new Date(b.updatedAt) - +new Date(a.updatedAt))
        .slice(0, 4),
    [open],
  );
  const latest = useMemo(() => [...reports].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 4), [reports]);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-4 lg:space-y-5 lg:px-6 lg:py-6">
        {/* Hero */}
        <section className="hero-surface relative overflow-hidden rounded-3xl p-5 text-surface shadow-xl shadow-navy/15 lg:p-7">
          <RiverArt />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm text-sky-100">
                <MapPin className="size-4" /> อุบลราชธานี · ข้อมูลสาธิต
              </p>
              <h1 className="mt-1.5 text-2xl leading-tight font-bold tracking-tight text-balance lg:text-3xl">
                สถานการณ์น้ำท่วม จังหวัดอุบลราชธานี
              </h1>
              <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-black/25 py-1.5 pr-4 pl-1.5 text-xs font-medium backdrop-blur lg:text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-orange text-surface">
                  <AlertTriangle className="size-3.5" />
                </span>
                <span className="truncate">
                  ได้รับผลกระทบ {affected} อำเภอ · วิกฤต {critical} อำเภอ
                </span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 lg:w-[26rem]">
              <Link
                to="/help/new"
                className="flex flex-col items-start gap-2 rounded-2xl bg-crit px-3.5 py-3 shadow-lg sm:flex-row sm:items-center sm:gap-3 shadow-black/20 transition hover:brightness-110"
              >
                <span className="emergency-mark !size-10 !text-xl" aria-hidden>
                  <span>🚨</span>
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">ขอความช่วยเหลือ</span>
                  <span className="block truncate text-[11px] text-white/80">ไม่ต้องสมัคร</span>
                </span>
              </Link>
              <Link
                to="/report/new"
                className="flex flex-col items-start gap-2 rounded-2xl bg-blue px-3.5 py-3 shadow-lg sm:flex-row sm:items-center sm:gap-3 shadow-black/20 ring-1 ring-white/15 transition hover:brightness-110"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15">
                  <Megaphone className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">แจ้งสถานการณ์</span>
                  <span className="block truncate text-[11px] text-white/80">น้ำ ถนน จุดเสี่ยง</span>
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* Numbers */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="ตัวเลขสรุป">
          <StatCard icon={ClipboardList} tone="red" label="คำร้องทั้งหมด" value={requests.length} note={`เปิดอยู่ ${open.length}`} />
          <StatCard icon={Loader} tone="orange" label="กำลังดำเนินการ" value={working} note="มอบทีมแล้ว" />
          <StatCard icon={CheckCircle2} tone="green" label="ช่วยเหลือแล้ว" value={resolved} note="ปิดงานแล้ว" />
          <StatCard icon={House} tone="sky" label="ศูนย์พักพิง" value={SHELTERS.length} note={`รับเพิ่มได้ ${shelterRoom.toLocaleString("th-TH")} คน`} />
          <div className="col-span-2 lg:col-span-1">
            <StatCard icon={Users} tone="purple" label="อาสาสมัคร" value={verifiedVolunteers} note="ยืนยันแล้ว" />
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr] lg:gap-5">
          {/* Map */}
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
              <h2 className="flex items-center gap-2 font-semibold text-navy">
                <IconBadge icon={Map} tone="sky" size="sm" /> แผนที่สถานการณ์
              </h2>
              <Link to="/map" className="inline-flex items-center gap-1 text-sm font-semibold text-blue">
                เปิดเต็มจอ <ChevronRight className="size-4" />
              </Link>
            </div>
            <div className="relative h-72 lg:h-[26rem]">
              <FloodMap layers={HOME_LAYERS} chrome />
            </div>
          </section>

          {/* Urgent requests */}
          <section className="card flex flex-col p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-semibold text-navy">
                <IconBadge icon={Siren} tone="red" size="sm" /> คำร้องเร่งด่วน
              </h2>
              <Link to="/situation" className="inline-flex items-center gap-1 text-sm font-semibold text-blue">
                ทุกอำเภอ <ChevronRight className="size-4" />
              </Link>
            </div>
            <ul className="mt-3 divide-y divide-line/70">
              {urgent.map((req) => (
                <li key={req.id}>
                  <Link to="/map" search={{ d: req.districtId }} className="flex items-center gap-3 py-3 transition hover:bg-bg/60">
                    <IconBadge icon={req.priority === "critical" ? AlertTriangle : ClipboardList} tone={req.priority === "critical" ? "red" : "orange"} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold text-muted tabular-nums">{req.id}</span>
                        <Pill tone={toneForPriority(req.priority)}>{PRIORITY_LABEL[req.priority]}</Pill>
                      </span>
                      <span className="mt-0.5 block truncate text-sm font-semibold text-navy">
                        {TYPE_LABEL[req.type]} · {req.placeLabel}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        อ.{districtById(req.districtId)?.name} · {ago(req.updatedAt)}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
              {urgent.length === 0 ? <li className="py-6 text-center text-sm text-muted">ยังไม่มีคำร้องที่เปิดอยู่</li> : null}
            </ul>
            <Link
              to="/help/track"
              className="mt-auto flex items-center gap-3 rounded-xl bg-sky-soft px-3 py-2.5 text-sm font-semibold text-sky"
            >
              <FileSearch className="size-4" /> ติดตามคำร้องด้วยเลข UBN <ArrowRight className="ml-auto size-4" />
            </Link>
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr] lg:gap-5">
          {/* Shortcuts */}
          <section className="card p-4">
            <h2 className="font-semibold text-navy">ทางลัดสำหรับคุณ</h2>
            <ul className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
              {SHORTCUTS.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={cn(
                      "flex h-full flex-col items-center gap-2 rounded-2xl px-2 py-3 text-center text-xs font-semibold text-navy transition hover:-translate-y-0.5",
                      TONES[item.tone].soft,
                    )}
                  >
                    <span className={cn("grid size-10 place-items-center rounded-xl bg-surface shadow-sm", TONES[item.tone].text)}>
                      <item.icon className="size-5" strokeWidth={2.2} />
                    </span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Join */}
          <section className="hero-surface relative overflow-hidden rounded-2xl p-5 text-surface shadow-lg shadow-navy/15">
            <RiverArt faint />
            <div className="relative">
              <span className="grid size-11 place-items-center rounded-2xl bg-white/15">
                <HeartHandshake className="size-6" />
              </span>
              <h2 className="mt-3 text-lg font-bold">ร่วมเป็นส่วนหนึ่งในการช่วยเหลือ</h2>
              <p className="mt-1 text-sm text-sky-100">นักศึกษา อาสาสมัคร และทุกภาคส่วน คือพลังสำคัญในการฟื้นฟูอุบลราชธานี</p>
              <Link
                to="/volunteer"
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-surface px-4 text-sm font-bold text-navy"
              >
                สมัครเป็นอาสาสมัคร <ArrowRight className="size-4" />
              </Link>
            </div>
          </section>
        </div>

        {/* Latest reports */}
        {latest.length ? (
          <section className="card p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-semibold text-navy">
                <IconBadge icon={Megaphone} tone="blue" size="sm" /> รายงานสถานการณ์ล่าสุด
              </h2>
              <Link to="/reports" className="inline-flex items-center gap-1 text-sm font-semibold text-blue">
                ดูทั้งหมด <ChevronRight className="size-4" />
              </Link>
            </div>
            <ul className="mt-3 grid gap-2.5 lg:grid-cols-2">
              {latest.map((r) => (
                <li key={r.id} className="flex items-start gap-3 rounded-xl bg-bg/70 p-3">
                  <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-blue" aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-navy">{r.summary}</span>
                    <span className="block text-xs text-muted">
                      อ.{districtById(r.districtId)?.name} · {r.placeLabel} · {ago(r.createdAt)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

/** Soft river lines across the hero, drawn once in SVG. */
function RiverArt({ faint = false }: { faint?: boolean }) {
  return (
    <svg
      className={cn("pointer-events-none absolute inset-0 h-full w-full", faint ? "opacity-30" : "opacity-60")}
      viewBox="0 0 800 260"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <path d="M-20 200 C 120 150, 220 230, 360 180 S 600 120, 820 160" fill="none" stroke="#7dd3fc" strokeWidth="10" strokeLinecap="round" opacity="0.35" />
      <path d="M-20 220 C 140 180, 260 250, 400 205 S 640 150, 820 190" fill="none" stroke="#bae6fd" strokeWidth="2" opacity="0.6" />
      <path d="M-20 170 C 100 130, 240 200, 380 150 S 620 90, 820 120" fill="none" stroke="#e0f2fe" strokeWidth="1.2" opacity="0.5" />
      <path d="M520 0 C 540 60, 500 110, 560 150" fill="none" stroke="#bae6fd" strokeWidth="1.5" opacity="0.4" />
      <path d="M680 0 C 660 50, 700 90, 650 140" fill="none" stroke="#bae6fd" strokeWidth="1.2" opacity="0.35" />
    </svg>
  );
}
