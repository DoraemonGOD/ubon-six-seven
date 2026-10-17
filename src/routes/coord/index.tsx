// The coordinator's desk: three tabs (requests, volunteers waiting, the team).
// Each request card says what to do next; volunteers are approved in one tap.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Check, ChevronRight, ClipboardCheck, List, Map as MapIcon, Phone, Truck, UserPlus, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FloodMap, type LayerKey } from "@/components/flood-map";
import { AppShell } from "@/components/shell";
import { PageIntro, Pill, StatCard, controlClass, type Tone } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  DISTRICTS,
  PRIORITY_LABEL,
  PRIORITY_RANK,
  SKILL_LABEL,
  TYPE_LABEL,
  VEHICLE_LABEL,
  districtById,
  isOpenStatus,
  toneForPriority,
  type HelpRequest,
  type MapSelection,
  type Volunteer,
} from "@/lib/model";
import { useFloodStore } from "@/lib/store";
import { ago } from "@/lib/time";

export const Route = createFileRoute("/coord/")({ component: CoordHome });

const LAYERS: Record<LayerKey, boolean> = {
  situation: true,
  requests: true,
  reports: false,
  shelters: false,
  relief: false,
  volunteers: false,
  roads: false,
};

type Stage = "check" | "team" | "working" | "closed";

function stageOf(req: HelpRequest): Stage {
  if (!isOpenStatus(req.status)) return "closed";
  if (req.status === "assigned" || req.status === "in_progress") return "working";
  if (req.status === "verified" || req.verify === "verified") return "team";
  return "check";
}

const STAGE_INFO: Record<Stage, { label: string; next: string; tone: Tone }> = {
  check: { label: "ต้องตรวจ", next: "ขั้นต่อไป: โทรตรวจข้อมูล", tone: "red" },
  team: { label: "รอส่งทีม", next: "ขั้นต่อไป: เลือกทีม", tone: "purple" },
  working: { label: "กำลังช่วย", next: "ทีมกำลังดำเนินการ", tone: "blue" },
  closed: { label: "ปิดแล้ว", next: "ปิดเรื่องแล้ว", tone: "green" },
};

const BAR: Record<string, string> = { critical: "bg-crit", high: "bg-orange", medium: "bg-watch", low: "bg-ok" };

type Tab = "requests" | "pending" | "team";

function CoordHome() {
  const role = useFloodStore((s) => s.role);
  const volunteers = useFloodStore((s) => s.volunteers);
  const requests = useFloodStore((s) => s.requests);
  const [tab, setTab] = useState<Tab>("requests");

  useEffect(() => {
    if (window.location.hash === "#volunteers") setTab("pending");
  }, []);

  if (role !== "coordinator") {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-lg px-4 py-4">
          <PageIntro title="ศูนย์ประสาน" lede="คิวคำร้อง เบอร์ผู้แจ้ง และปุ่มมอบทีมเปิดให้ผู้ประสานเท่านั้น" />
          <div className="card p-4">
            <p className="text-sm leading-relaxed">ยังไม่ได้เข้าสู่ระบบแอดมิน</p>
            <Link to="/admin/login" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-blue px-4 text-sm font-semibold text-surface">
              เข้าสู่ระบบแอดมิน
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const pending = volunteers.filter((v) => v.approval === "pending");
  const team = volunteers.filter((v) => v.approval !== "pending");
  const open = requests.filter((r) => isOpenStatus(r.status));

  const tabs: { id: Tab; label: string; count: number; icon: typeof List; alert?: boolean }[] = [
    { id: "requests", label: "คำร้อง", count: open.length, icon: ClipboardCheck },
    { id: "pending", label: "อาสารอยืนยัน", count: pending.length, icon: UserPlus, alert: pending.length > 0 },
    { id: "team", label: "ทีมอาสา", count: team.length, icon: Users },
  ];

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl px-4 py-4">
        <PageIntro title="ศูนย์ประสาน" lede="ตรวจคำร้อง ส่งทีม และยืนยันอาสา ทุกเครื่องเห็นข้อมูลชุดเดียวกัน" />
        <div className="sticky top-[93px] z-30 -mx-4 mb-4 bg-bg/95 px-4 py-2 backdrop-blur lg:top-0">
          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-surface p-1 shadow-sm ring-1 ring-line">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "relative flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-semibold transition sm:text-sm",
                    tab === t.id ? "bg-navy text-surface shadow" : "text-muted hover:bg-bg",
                  )}
                >
                  <Icon className="hidden size-4 sm:block" />
                  {t.label}
                  <span
                    className={cn(
                      "grid min-w-5 place-items-center rounded-full px-1 text-[11px]",
                      t.alert ? "bg-crit text-surface" : tab === t.id ? "bg-white/20" : "bg-bg",
                    )}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div key={tab} className="fade-in">
          {tab === "requests" ? <RequestsTab /> : tab === "pending" ? <PendingTab list={pending} /> : <TeamTab list={team} />}
        </div>
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------- requests */

function RequestsTab() {
  const navigate = useNavigate();
  const requests = useFloodStore((s) => s.requests);
  const [stage, setStage] = useState<Stage | "open" | "all">("open");
  const [district, setDistrict] = useState("all");
  const [view, setView] = useState<"list" | "map">("list");

  const counts = useMemo(() => {
    const c = { check: 0, team: 0, working: 0, closed: 0, critical: 0 };
    for (const r of requests) {
      c[stageOf(r)] += 1;
      if (r.priority === "critical" && isOpenStatus(r.status)) c.critical += 1;
    }
    return c;
  }, [requests]);

  const rows = useMemo(
    () =>
      requests
        .filter((r) => (district === "all" ? true : r.districtId === district))
        .filter((r) => (stage === "all" ? true : stage === "open" ? isOpenStatus(r.status) : stageOf(r) === stage))
        .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [requests, stage, district],
  );

  const chips: { id: Stage | "open" | "all"; label: string }[] = [
    { id: "open", label: "ยังไม่จบ" },
    { id: "check", label: `ต้องตรวจ ${counts.check}` },
    { id: "team", label: `รอส่งทีม ${counts.team}` },
    { id: "working", label: `กำลังช่วย ${counts.working}` },
    { id: "closed", label: "ปิดแล้ว" },
    { id: "all", label: "ทั้งหมด" },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <button type="button" className="text-left" onClick={() => setStage("check")}>
          <StatCard icon={AlertTriangle} tone="red" label="ต้องตรวจ" value={counts.check} note="แตะเพื่อดู" />
        </button>
        <button type="button" className="text-left" onClick={() => setStage("team")}>
          <StatCard icon={UserPlus} tone="purple" label="รอส่งทีม" value={counts.team} note="แตะเพื่อดู" />
        </button>
        <button type="button" className="text-left" onClick={() => setStage("working")}>
          <StatCard icon={Truck} tone="blue" label="กำลังช่วย" value={counts.working} note="แตะเพื่อดู" />
        </button>
        <StatCard icon={AlertTriangle} tone="orange" label="วิกฤตที่ยังเปิด" value={counts.critical} note="ยังไม่ปิดเรื่อง" />
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={stage === c.id}
            onClick={() => setStage(c.id)}
            className={cn(
              "min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition",
              stage === c.id ? "bg-navy text-surface" : "border border-line bg-surface text-ink",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <select className={controlClass} value={district} onChange={(e) => setDistrict(e.target.value)} aria-label="อำเภอ">
          <option value="all">ทุกอำเภอ</option>
          {DISTRICTS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <div className="flex shrink-0 rounded-xl border border-line bg-surface p-1">
          {(["list", "map"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-label={v === "list" ? "รายการ" : "แผนที่"}
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={cn("grid size-9 place-items-center rounded-lg", view === v ? "bg-navy text-surface" : "text-muted")}
            >
              {v === "list" ? <List className="size-4" /> : <MapIcon className="size-4" />}
            </button>
          ))}
        </div>
      </div>

      {view === "map" ? (
        <div className="relative mt-3 h-[65vh] overflow-hidden rounded-2xl border border-line">
          <FloodMap
            layers={LAYERS}
            onSelect={(sel: MapSelection | null) => {
              if (sel?.kind === "request") void navigate({ to: "/coord/requests/$id", params: { id: sel.id } });
            }}
          />
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((req) => {
            const st = STAGE_INFO[stageOf(req)];
            return (
              <li key={req.id}>
                <Link
                  to="/coord/requests/$id"
                  params={{ id: req.id }}
                  className="card flex items-stretch overflow-hidden transition active:scale-[0.99]"
                >
                  <span className={cn("w-1.5 shrink-0", BAR[req.priority])} aria-hidden />
                  <span className="min-w-0 flex-1 p-3">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Pill tone={toneForPriority(req.priority)}>{PRIORITY_LABEL[req.priority]}</Pill>
                      <span className="text-xs text-muted">
                        {req.id} · {ago(req.updatedAt)}
                      </span>
                    </span>
                    <span className="mt-1.5 block font-semibold text-navy">
                      {TYPE_LABEL[req.type]} · อ.{districtById(req.districtId)?.name}
                    </span>
                    <span className="block truncate text-sm text-muted">
                      {req.placeLabel} · {req.people} คน{req.hasPhoto ? " · มีรูป" : ""}
                      {req.exact ? " · มีพิกัด" : ""}
                    </span>
                    <span className={cn("mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold", stageChip(st.tone))}>
                      {st.next}
                    </span>
                  </span>
                  <span className="grid place-items-center pr-3 text-muted">
                    <ChevronRight className="size-5" />
                  </span>
                </Link>
              </li>
            );
          })}
          {rows.length === 0 ? <li className="card p-6 text-center text-sm text-muted">ไม่มีคำร้องในกลุ่มนี้</li> : null}
        </ul>
      )}
    </div>
  );
}

function stageChip(tone: Tone) {
  return {
    red: "bg-crit-soft text-crit",
    purple: "bg-purple-soft text-purple",
    blue: "bg-blue-soft text-blue",
    green: "bg-ok-soft text-ok",
  }[tone as "red" | "purple" | "blue" | "green"];
}

/* ------------------------------------------------------- pending people */

function PendingTab({ list }: { list: Volunteer[] }) {
  if (list.length === 0) {
    return (
      <div className="card p-8 text-center">
        <Check className="mx-auto size-8 text-ok" />
        <p className="mt-2 font-semibold text-navy">ไม่มีใบสมัครค้าง</p>
        <p className="text-sm text-muted">มีคนสมัครใหม่ ระบบจะเด้งแจ้งเตือน</p>
      </div>
    );
  }
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {list.map((v) => (
        <PendingCard key={v.id} v={v} />
      ))}
    </ul>
  );
}

function PendingCard({ v }: { v: Volunteer }) {
  const approve = useFloodStore((s) => s.approveVolunteer);
  const reject = useFloodStore((s) => s.rejectVolunteer);
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <li className="card space-y-3 p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-purple-soft text-lg font-semibold text-purple">
          {v.name.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-navy">{v.name}</p>
          <p className="text-xs text-muted">
            {v.kind === "student" ? "นักศึกษา" : "อาสาสมัคร"} · {VEHICLE_LABEL[v.vehicle]}
          </p>
        </div>
        <a href={`tel:${v.phone}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line px-3 text-sm font-semibold text-ink">
          <Phone className="size-4" /> โทร
        </a>
      </div>
      <dl className="space-y-1.5 text-sm">
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-muted">ทักษะ</dt>
          <dd className="flex flex-wrap gap-1">
            {v.skills.map((s) => (
              <span key={s} className="rounded-full bg-purple-soft px-2 py-0.5 text-xs text-purple">
                {SKILL_LABEL[s]}
              </span>
            ))}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-muted">พื้นที่</dt>
          <dd>{v.districtIds.map((id) => districtById(id)?.name).filter(Boolean).join(", ")}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-muted">เวลาว่าง</dt>
          <dd className="text-ink">{v.window}</dd>
        </div>
      </dl>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const ok = await approve(v.id);
            setBusy(false);
            toast(ok ? `ยืนยัน ${v.name} แล้ว รับงานได้ทันที` : "ยืนยันไม่ได้");
          }}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ok text-sm font-semibold text-surface shadow-sm transition active:scale-[0.98] disabled:opacity-60"
        >
          <Check className="size-4" /> ยืนยันอาสา
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (!sure) {
              setSure(true);
              window.setTimeout(() => setSure(false), 4000);
              return;
            }
            setBusy(true);
            const ok = await reject(v.id);
            setBusy(false);
            toast(ok ? `ไม่รับใบสมัครของ ${v.name}` : "ทำไม่ได้");
          }}
          className={cn(
            "inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition",
            sure ? "bg-crit text-surface" : "border border-line bg-surface text-muted",
          )}
        >
          <X className="size-4" /> {sure ? "กดอีกครั้งเพื่อยืนยัน" : "ไม่รับ"}
        </button>
      </div>
    </li>
  );
}

/* ----------------------------------------------------------------- team */

function TeamTab({ list }: { list: Volunteer[] }) {
  const assignments = useFloodStore((s) => s.assignments);
  if (list.length === 0) return <div className="card p-6 text-center text-sm text-muted">ยังไม่มีอาสาที่ยืนยันแล้ว</div>;
  return (
    <ul className="grid gap-2 lg:grid-cols-2">
      {list.map((v) => {
        const load = assignments.filter((a) => a.volunteerId === v.id && (a.status === "assigned" || a.status === "in_progress")).length;
        return (
          <li key={v.id} className="card flex items-center gap-3 p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-soft font-semibold text-blue">{v.name.slice(0, 1)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-navy">{v.name}</p>
              <p className="truncate text-xs text-muted">
                {v.districtIds.map((id) => districtById(id)?.name).filter(Boolean).slice(0, 3).join(", ")} · {VEHICLE_LABEL[v.vehicle]}
              </p>
            </div>
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", load ? "bg-watch-soft text-watch" : "bg-ok-soft text-ok")}>
              {load ? `งานค้าง ${load}` : "ว่าง"}
            </span>
            {v.phone ? (
              <a href={`tel:${v.phone}`} className="grid size-10 place-items-center rounded-xl bg-ok text-surface" aria-label={`โทรหา ${v.name}`}>
                <Phone className="size-4" />
              </a>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

