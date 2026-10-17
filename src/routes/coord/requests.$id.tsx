// One request, one obvious next step: check it, send a team, close it.
// Everything else (status by hand, notes, history) sits under "more".
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, ChevronDown, Phone, RotateCcw, ShieldCheck, Truck, UserCheck, Users } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CoordLine } from "@/components/location-field";
import { RecordPhoto } from "@/components/photo-field";
import { AppShell } from "@/components/shell";
import { PageIntro, Pill, controlClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  PRIORITIES,
  PRIORITY_LABEL,
  SKILL_LABEL,
  STATUS_LABEL,
  TYPE_LABEL,
  TYPE_SKILLS,
  VEHICLE_LABEL,
  VERIFY_LABEL,
  districtById,
  toneForPriority,
  toneForVerify,
  type HelpRequest,
  type RequestStatus,
  type Volunteer,
} from "@/lib/model";
import { useFloodStore } from "@/lib/store";
import { ago } from "@/lib/time";

export const Route = createFileRoute("/coord/requests/$id")({ component: RequestDesk });

const STATUSES: RequestStatus[] = ["submitted", "verified", "assigned", "in_progress", "resolved", "unreachable", "duplicate"];

const PRIORITY_ON: Record<string, string> = {
  critical: "bg-crit text-surface border-crit",
  high: "bg-orange text-surface border-orange",
  medium: "bg-watch text-surface border-watch",
  low: "bg-ok text-surface border-ok",
};

type Stage = "check" | "team" | "working" | "closed";

function stageOf(req: HelpRequest): Stage {
  if (req.status === "resolved" || req.status === "unreachable" || req.status === "duplicate") return "closed";
  if (req.status === "assigned" || req.status === "in_progress") return "working";
  if (req.status === "verified" || req.verify === "verified") return "team";
  return "check";
}

const STEPS: { id: Stage; label: string }[] = [
  { id: "check", label: "ตรวจข้อมูล" },
  { id: "team", label: "ส่งทีม" },
  { id: "working", label: "กำลังช่วย" },
  { id: "closed", label: "ปิดเรื่อง" },
];

function RequestDesk() {
  const { id } = Route.useParams();
  const req = useFloodStore((s) => s.requests.find((item) => item.id === id));
  const loaded = useFloodStore((s) => s.ready);
  const role = useFloodStore((s) => s.role);

  if (!req && !loaded) {
    return (
      <AppShell>
        <div className="mx-auto max-w-lg px-4 py-6 text-sm text-muted">กำลังโหลด…</div>
      </AppShell>
    );
  }
  if (!req) {
    return (
      <AppShell>
        <div className="mx-auto max-w-lg px-4 py-6">
          <p>ไม่พบคำร้องนี้</p>
          <Link to="/coord" className="mt-3 inline-flex font-semibold text-blue">
            กลับศูนย์ประสาน
          </Link>
        </div>
      </AppShell>
    );
  }
  if (role !== "coordinator") {
    return (
      <AppShell>
        <div className="mx-auto max-w-lg px-4 py-6">
          <PageIntro title="จัดการคำร้อง" lede="หน้านี้เปิดเมื่อเข้าสู่ระบบผู้ประสานแล้ว" />
          <Link to="/admin/login" className="mt-4 inline-flex min-h-11 items-center font-semibold text-blue">
            เข้าสู่ระบบแอดมิน
          </Link>
        </div>
      </AppShell>
    );
  }
  return <Desk req={req} />;
}

function Desk({ req }: { req: HelpRequest }) {
  const setPriority = useFloodStore((s) => s.setPriority);
  const stage = stageOf(req);
  const district = districtById(req.districtId);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-4">
        <Link to="/coord" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-blue">
          <ArrowLeft className="size-4" /> คิวคำร้องทั้งหมด
        </Link>

        {/* Progress across the four steps */}
        <ol className="grid grid-cols-4 gap-1.5" aria-label="ขั้นตอน">
          {STEPS.map((step, i) => {
            const at = STEPS.findIndex((s) => s.id === stage);
            const state = i < at ? "done" : i === at ? "now" : "next";
            return (
              <li key={step.id} className="text-center">
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-colors",
                    state === "done" ? "bg-ok" : state === "now" ? "bg-blue" : "bg-line",
                  )}
                />
                <span className={cn("mt-1 block text-[11px]", state === "now" ? "font-semibold text-blue" : "text-muted")}>{step.label}</span>
              </li>
            );
          })}
        </ol>

        {/* What happened */}
        <section className="card space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={toneForPriority(req.priority)}>{PRIORITY_LABEL[req.priority]}</Pill>
            <Pill tone={toneForVerify(req.verify)}>{VERIFY_LABEL[req.verify]}</Pill>
            <span className="text-xs text-muted">
              {req.id} · {ago(req.createdAt)}
            </span>
          </div>
          <h1 className="text-xl font-semibold text-navy">
            {TYPE_LABEL[req.type]} · {req.people} คน
          </h1>
          <p className="text-sm text-muted">
            อ.{district?.name} · {req.placeLabel}
          </p>
          <p className="rounded-xl bg-bg px-3 py-2.5 text-sm leading-relaxed">{req.detail}</p>
          {req.exact ? (
            <CoordLine lat={req.exact.lat} lng={req.exact.lng} accuracy={req.exact.accuracy} via={req.exact.via} />
          ) : (
            <CoordLine lat={req.lat} lng={req.lng} approx />
          )}
          {req.hasPhoto ? <RecordPhoto kind="request" id={req.id} alt="รูปที่ผู้แจ้งแนบ" /> : null}
          <a
            href={`tel:${req.phone}`}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ok text-sm font-semibold text-surface shadow-sm transition active:scale-[0.98]"
          >
            <Phone className="size-4" /> โทรหาผู้แจ้ง {req.phone}
          </a>
        </section>

        {/* Priority: one tap */}
        <section className="card p-4">
          <p className="text-sm font-semibold text-navy">ความเร่งด่วน</p>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={req.priority === p}
                onClick={() => void setPriority(req.id, p)}
                className={cn(
                  "min-h-10 rounded-xl border text-sm font-semibold transition active:scale-95",
                  req.priority === p ? PRIORITY_ON[p] : "border-line bg-surface text-muted",
                )}
              >
                {PRIORITY_LABEL[p]}
              </button>
            ))}
          </div>
        </section>

        {/* The one next step */}
        <NextStep req={req} stage={stage} />

        <More req={req} />
      </div>
    </AppShell>
  );
}

function StepCard({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="fade-in rounded-2xl border-2 border-blue/40 bg-blue-soft/50 p-4">
      <p className="text-xs font-semibold tracking-wide text-blue">ขั้นต่อไป</p>
      <h2 className="mt-0.5 text-lg font-semibold text-navy">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function BigButton({
  children,
  onClick,
  tone = "blue",
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: "blue" | "green" | "plain";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition active:scale-[0.98]",
        tone === "blue" && "bg-blue text-surface shadow-sm",
        tone === "green" && "bg-ok text-surface shadow-sm",
        tone === "plain" && "border border-line bg-surface text-ink",
      )}
    >
      {children}
    </button>
  );
}

function NextStep({ req, stage }: { req: HelpRequest; stage: Stage }) {
  const setStatus = useFloodStore((s) => s.setStatus);
  const setRequestVerify = useFloodStore((s) => s.setRequestVerify);
  const progress = useFloodStore((s) => s.progress);
  const volunteers = useFloodStore((s) => s.volunteers);
  const [changing, setChanging] = useState(false);
  const assignee = volunteers.find((v) => v.id === req.assigneeId);

  if (stage === "check") {
    return (
      <StepCard title="ตรวจว่าเรื่องนี้จริงและยังต้องการความช่วยเหลือ" hint="โทรหาผู้แจ้งสั้น ๆ แล้วเลือกผล">
        <div className="space-y-2">
          <BigButton
            tone="green"
            onClick={async () => {
              await setRequestVerify(req.id, "verified");
              await setStatus(req.id, "verified");
              toast("ตรวจแล้ว ไปเลือกทีมต่อได้เลย");
            }}
          >
            <ShieldCheck className="size-4" /> ข้อมูลถูกต้อง ไปเลือกทีม
          </BigButton>
          <div className="grid grid-cols-2 gap-2">
            <BigButton tone="plain" onClick={() => void setStatus(req.id, "unreachable").then(() => toast("บันทึกว่าติดต่อไม่ได้"))}>
              ติดต่อไม่ได้
            </BigButton>
            <BigButton tone="plain" onClick={() => void setStatus(req.id, "duplicate").then(() => toast("บันทึกว่าเป็นเรื่องซ้ำ"))}>
              เรื่องซ้ำ
            </BigButton>
          </div>
        </div>
      </StepCard>
    );
  }

  if (stage === "team" || changing) {
    return (
      <StepCard title="เลือกทีมที่จะไป" hint="เรียงจากคนที่อยู่ในพื้นที่และมีทักษะตรงก่อน กดปุ่มเดียวก็มอบงานได้">
        <TeamPicker req={req} onDone={() => setChanging(false)} />
        {changing ? (
          <button type="button" onClick={() => setChanging(false)} className="mt-2 text-sm font-semibold text-muted">
            ยกเลิกการเปลี่ยนทีม
          </button>
        ) : null}
      </StepCard>
    );
  }

  if (stage === "working") {
    return (
      <StepCard title={req.status === "assigned" ? "ทีมรับงานแล้ว รอออกเดินทาง" : "ทีมกำลังช่วยอยู่"}>
        {assignee ? (
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-surface p-3">
            <span className="grid size-10 place-items-center rounded-full bg-purple-soft text-purple">
              <UserCheck className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-navy">{assignee.name}</p>
              <p className="text-xs text-muted">{VEHICLE_LABEL[assignee.vehicle]}</p>
            </div>
            {assignee.phone ? (
              <a href={`tel:${assignee.phone}`} className="grid size-10 place-items-center rounded-xl bg-ok text-surface" aria-label={`โทรหา ${assignee.name}`}>
                <Phone className="size-4" />
              </a>
            ) : null}
          </div>
        ) : null}
        <div className="space-y-2">
          {req.status === "assigned" ? (
            <BigButton onClick={() => void progress(req.id, "in_progress").then(() => toast("บันทึกว่าทีมกำลังช่วย"))}>
              <Truck className="size-4" /> ทีมถึงที่แล้ว กำลังช่วย
            </BigButton>
          ) : null}
          <BigButton tone="green" onClick={() => void progress(req.id, "done").then(() => toast("ปิดเรื่องแล้ว ขอบคุณทีม"))}>
            <Check className="size-4" /> ช่วยเสร็จแล้ว ปิดเรื่อง
          </BigButton>
          <BigButton tone="plain" onClick={() => setChanging(true)}>
            <Users className="size-4" /> เปลี่ยนทีม
          </BigButton>
        </div>
      </StepCard>
    );
  }

  return (
    <section className="fade-in rounded-2xl border border-ok/30 bg-ok-soft p-4">
      <p className="font-semibold text-ok">เรื่องนี้ปิดแล้ว · {STATUS_LABEL[req.status]}</p>
      <button
        type="button"
        onClick={() => void setStatus(req.id, "submitted").then(() => toast("เปิดเรื่องใหม่แล้ว"))}
        className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-blue"
      >
        <RotateCcw className="size-4" /> เปิดเรื่องนี้ใหม่
      </button>
    </section>
  );
}

function TeamPicker({ req, onDone }: { req: HelpRequest; onDone: () => void }) {
  const volunteers = useFloodStore((s) => s.volunteers);
  const assignments = useFloodStore((s) => s.assignments);
  const assign = useFloodStore((s) => s.assign);
  const [all, setAll] = useState(false);
  const [busy, setBusy] = useState("");

  const ranked = useMemo(() => {
    const want = TYPE_SKILLS[req.type] ?? [];
    return volunteers
      .filter((v) => v.approval !== "pending" && v.id !== req.assigneeId)
      .map((v) => {
        const near = v.districtIds.includes(req.districtId);
        const skills = v.skills.filter((s) => want.includes(s));
        const load = assignments.filter((a) => a.volunteerId === v.id && (a.status === "assigned" || a.status === "in_progress")).length;
        const score = (near ? 10 : 0) + skills.length * 3 - load * 2 + (v.vehicle === "boat" && req.type === "trapped" ? 4 : 0);
        return { v, near, skills, load, score };
      })
      .sort((a, b) => b.score - a.score);
  }, [volunteers, assignments, req]);

  if (ranked.length === 0) {
    return <p className="text-sm text-muted">ยังไม่มีอาสาที่ยืนยันแล้ว ไปยืนยันอาสาในหน้าศูนย์ประสานก่อน</p>;
  }
  const shown = all ? ranked : ranked.slice(0, 4);

  return (
    <div className="space-y-2">
      {shown.map(({ v, near, skills, load }, i) => (
        <TeamRow
          key={v.id}
          v={v}
          best={i === 0}
          near={near}
          skills={skills.map((s) => SKILL_LABEL[s])}
          load={load}
          busy={busy === v.id}
          onPick={async () => {
            setBusy(v.id);
            await assign(req.id, v.id);
            setBusy("");
            toast(`มอบงานให้ ${v.name} แล้ว`);
            onDone();
          }}
        />
      ))}
      {ranked.length > 4 ? (
        <button type="button" onClick={() => setAll((x) => !x)} className="inline-flex items-center gap-1 text-sm font-semibold text-blue">
          {all ? "ย่อรายชื่อ" : `ดูอาสาทั้งหมด (${ranked.length})`} <ChevronDown className={cn("size-4 transition", all && "rotate-180")} />
        </button>
      ) : null}
    </div>
  );
}

function TeamRow({
  v,
  best,
  near,
  skills,
  load,
  busy,
  onPick,
}: {
  v: Volunteer;
  best: boolean;
  near: boolean;
  skills: string[];
  load: number;
  busy: boolean;
  onPick: () => void;
}) {
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border bg-surface p-3", best ? "border-blue" : "border-line")}>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-navy">
          {v.name}
          {best ? <span className="ml-2 rounded-full bg-blue px-2 py-0.5 text-[11px] text-surface">แนะนำ</span> : null}
        </p>
        <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
          <span className={cn("rounded-full px-2 py-0.5", near ? "bg-ok-soft text-ok" : "bg-bg text-muted")}>{near ? "อยู่ในพื้นที่" : "นอกพื้นที่"}</span>
          {skills.map((s) => (
            <span key={s} className="rounded-full bg-purple-soft px-2 py-0.5 text-purple">
              {s}
            </span>
          ))}
          <span className="rounded-full bg-bg px-2 py-0.5 text-muted">พาหนะ: {VEHICLE_LABEL[v.vehicle]}</span>
          <span className={cn("rounded-full px-2 py-0.5", load ? "bg-watch-soft text-watch" : "bg-bg text-muted")}>งานค้าง {load}</span>
        </div>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={onPick}
        className="min-h-11 shrink-0 rounded-xl bg-blue px-4 text-sm font-semibold text-surface transition active:scale-95 disabled:opacity-60"
      >
        {busy ? "กำลังมอบ…" : "มอบงาน"}
      </button>
    </div>
  );
}

function More({ req }: { req: HelpRequest }) {
  const allEvents = useFloodStore((s) => s.events);
  const events = useMemo(() => allEvents.filter((e) => e.requestId === req.id), [allEvents, req.id]);
  const setStatus = useFloodStore((s) => s.setStatus);
  const addNote = useFloodStore((s) => s.addNote);
  const [note, setNote] = useState("");
  return (
    <details className="card group p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-navy">
        หมายเหตุ ประวัติ และตัวเลือกเพิ่มเติม
        <ChevronDown className="size-4 transition group-open:rotate-180" />
      </summary>
      <div className="mt-3 space-y-4">
        <div className="flex gap-2">
          <input className={controlClass} value={note} placeholder="หมายเหตุภายใน ผู้แจ้งไม่เห็น" onChange={(e) => setNote(e.target.value)} />
          <button
            type="button"
            disabled={!note.trim()}
            onClick={() => {
              void addNote(req.id, note);
              setNote("");
              toast("บันทึกหมายเหตุแล้ว");
            }}
            className="min-h-11 shrink-0 rounded-xl bg-navy px-4 text-sm font-semibold text-surface disabled:opacity-50"
          >
            บันทึก
          </button>
        </div>
        <label className="block text-xs text-muted">
          ตั้งสถานะเอง
          <select className={cn(controlClass, "mt-1")} value={req.status} onChange={(e) => void setStatus(req.id, e.target.value as RequestStatus)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <ol className="space-y-2 border-l-2 border-line pl-4">
          {events.map((e) => (
            <li key={e.id} className="relative text-sm">
              <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-blue ring-4 ring-surface" />
              {e.internal ? <span className="mr-1 rounded bg-watch-soft px-1 text-[11px] text-watch">ภายใน</span> : null}
              {e.message}
              <span className="block text-xs text-muted">{ago(e.at)}</span>
            </li>
          ))}
        </ol>
      </div>
    </details>
  );
}
