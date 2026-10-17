// Missions as a simple track: each card shows where it is and one button for
// the next step. Notes open only when someone wants to write one.
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowRight, Check, MessageSquarePlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { controlClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import { getIntelMissions, updateIntelMission } from "@/lib/intel/fns";
import { MISSION_LABEL } from "@/lib/intel/labels";

export const Route = createFileRoute("/intel/missions")({
  loader: () => getIntelMissions(),
  component: Missions,
});

const TRACK = ["assigned", "in_progress", "awaiting_verification", "completed"] as const;
const TRACK_LABEL: Record<(typeof TRACK)[number], string> = {
  assigned: "มอบแล้ว",
  in_progress: "กำลังทำ",
  awaiting_verification: "รอตรวจผล",
  completed: "จบ",
};

type Item = {
  id: string;
  incidentId: string;
  title: string;
  status: string;
  suppliesRequested: string;
  suppliesDelivered: string;
  fieldNote: string;
  updatedAt: string;
};

const GROUPS: { id: string; label: string; match: (s: string) => boolean }[] = [
  { id: "todo", label: "ต้องทำต่อ", match: (s) => s === "pending_assignment" || s === "assigned" || s === "in_progress" },
  { id: "check", label: "รอตรวจผล", match: (s) => s === "awaiting_verification" },
  { id: "done", label: "จบแล้ว", match: (s) => s === "completed" || s === "cancelled" },
];

function Missions() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [group, setGroup] = useState("todo");
  if (!data.ok) return <p className="text-sm">ไม่มีสิทธิ์</p>;
  const items = data.items as Item[];
  const shown = items.filter((m) => GROUPS.find((g) => g.id === group)?.match(m.status));
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-navy">ภารกิจช่วยเหลือ</h1>
      <p className="mt-1 text-sm text-muted">
        {data.canAssign ? "กดปุ่มสีน้ำเงินเพื่อเลื่อนงานไปขั้นถัดไป ระบบไม่ปิดงานเอง" : "งานที่มอบให้คุณ กดปุ่มเมื่อเริ่มงานและเมื่อทำเสร็จ"}
      </p>
      <div className="mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-surface p-1 ring-1 ring-line">
        {GROUPS.map((g) => {
          const n = items.filter((m) => g.match(m.status)).length;
          return (
            <button
              key={g.id}
              type="button"
              aria-pressed={group === g.id}
              onClick={() => setGroup(g.id)}
              className={cn("min-h-11 rounded-xl text-sm font-semibold transition", group === g.id ? "bg-navy text-surface" : "text-muted")}
            >
              {g.label} ({n})
            </button>
          );
        })}
      </div>
      <ul key={group} className="fade-in mt-4 space-y-3">
        {shown.map((item) => (
          <MissionCard key={item.id} item={item} canAssign={data.canAssign} onDone={() => router.invalidate()} />
        ))}
        {shown.length === 0 ? <li className="card p-6 text-center text-sm text-muted">ไม่มีภารกิจในกลุ่มนี้</li> : null}
      </ul>
    </div>
  );
}

function nextStep(status: string, canAssign: boolean): { to: string; label: string } | null {
  if (status === "assigned") return { to: "in_progress", label: "เริ่มงานแล้ว" };
  if (status === "in_progress") return { to: "awaiting_verification", label: "ทำเสร็จแล้ว ส่งให้ตรวจ" };
  if (status === "awaiting_verification" && canAssign) return { to: "completed", label: "ตรวจแล้ว ปิดงาน" };
  return null;
}

function MissionCard({ item, canAssign, onDone }: { item: Item; canAssign: boolean; onDone: () => Promise<void> }) {
  const [writing, setWriting] = useState(false);
  const [note, setNote] = useState(item.fieldNote);
  const [delivered, setDelivered] = useState(item.suppliesDelivered);
  const [busy, setBusy] = useState(false);
  const step = nextStep(item.status, canAssign);
  const at = TRACK.indexOf(item.status as (typeof TRACK)[number]);

  async function save(status?: string, withNote = false) {
    setBusy(true);
    const result = await updateIntelMission({
      data: {
        id: item.id,
        status,
        note: withNote ? note : undefined,
        delivered: withNote && canAssign ? delivered : undefined,
      },
    });
    setBusy(false);
    if (!result.ok) {
      toast("บันทึกไม่ได้");
      return;
    }
    toast(status ? `เลื่อนเป็น “${MISSION_LABEL[status] ?? status}” แล้ว` : "บันทึกหมายเหตุแล้ว");
    setWriting(false);
    await onDone();
  }

  return (
    <li className="card space-y-3 p-4">
      <div>
        <p className="font-semibold text-navy">{item.title}</p>
        <p className="text-xs text-muted">
          {MISSION_LABEL[item.status] ?? item.status} · อัปเดต {new Date(item.updatedAt).toLocaleString("th-TH")}
        </p>
      </div>

      {item.status !== "pending_assignment" && item.status !== "cancelled" ? (
        <ol className="grid grid-cols-4 gap-1">
          {TRACK.map((s, i) => (
            <li key={s} className="text-center">
              <span className={cn("block h-1.5 rounded-full", i < at ? "bg-ok" : i === at ? "bg-blue" : "bg-line")} />
              <span className={cn("mt-1 block text-[11px]", i === at ? "font-semibold text-blue" : "text-muted")}>{TRACK_LABEL[s]}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {item.suppliesRequested ? <p className="text-sm">ของที่ขอ: {item.suppliesRequested}</p> : null}
      {item.fieldNote && !writing ? <p className="rounded-xl bg-bg px-3 py-2 text-sm">หมายเหตุ: {item.fieldNote}</p> : null}

      {item.status === "pending_assignment" && canAssign ? (
        <Link
          to="/intel/review/$id"
          params={{ id: item.incidentId }}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue text-sm font-semibold text-surface"
        >
          เลือกทีมให้ภารกิจนี้ <ArrowRight className="size-4" />
        </Link>
      ) : step ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void save(step.to)}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue text-sm font-semibold text-surface shadow-sm transition active:scale-[0.98] disabled:opacity-60"
        >
          <Check className="size-4" /> {step.label}
        </button>
      ) : item.status === "completed" ? (
        <p className="rounded-xl bg-ok-soft px-3 py-2 text-sm font-semibold text-ok">ภารกิจนี้จบแล้ว</p>
      ) : item.status === "awaiting_verification" ? (
        <p className="rounded-xl bg-watch-soft px-3 py-2 text-sm text-watch">ส่งแล้ว รอผู้ดูแลตรวจผล</p>
      ) : null}

      {writing ? (
        <div className="fade-in space-y-2">
          <textarea className={cn(controlClass, "min-h-20 py-2")} value={note} placeholder="เกิดอะไรขึ้นในพื้นที่" onChange={(e) => setNote(e.target.value)} />
          {canAssign ? (
            <input className={controlClass} value={delivered} placeholder="ของที่ส่งแล้ว (ถ้ามี)" onChange={(e) => setDelivered(e.target.value)} />
          ) : null}
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => void save(undefined, true)} className="min-h-10 rounded-xl bg-navy px-4 text-sm font-semibold text-surface">
              บันทึก
            </button>
            <button type="button" onClick={() => setWriting(false)} className="min-h-10 px-3 text-sm font-semibold text-muted">
              ยกเลิก
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setWriting(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue">
            <MessageSquarePlus className="size-4" /> เพิ่มหมายเหตุ
          </button>
          <Link to="/intel/review/$id" params={{ id: item.incidentId }} className="text-sm text-muted underline-offset-2 hover:underline">
            ดูรายงานต้นทาง
          </Link>
        </div>
      )}
    </li>
  );
}
