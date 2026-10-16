import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/shell";
import { Button, Field, PageIntro, Panel, Pill, controlClass } from "@/components/ui";
import {
  PRIORITIES,
  PRIORITY_LABEL,
  STATUS_LABEL,
  TYPE_LABEL,
  VERIFY_LABEL,
  districtById,
  toneForPriority,
  toneForVerify,
  type Priority,
  type RequestStatus,
  type VerifyStatus,
} from "@/lib/model";
import { useFloodStore } from "@/lib/store";
import { ago } from "@/lib/time";

export const Route = createFileRoute("/coord/requests/$id")({ component: RequestDesk });

const STATUSES: RequestStatus[] = [
  "submitted",
  "verified",
  "assigned",
  "in_progress",
  "resolved",
  "unreachable",
  "duplicate",
];

function RequestDesk() {
  const { id } = Route.useParams();
  const req = useFloodStore((s) => s.requests.find((item) => item.id === id));
  const allEvents = useFloodStore((s) => s.events);
  const events = useMemo(() => allEvents.filter((item) => item.requestId === id), [allEvents, id]);
  const volunteers = useFloodStore((s) => s.volunteers);
  const role = useFloodStore((s) => s.role);
  const setPriority = useFloodStore((s) => s.setPriority);
  const setStatus = useFloodStore((s) => s.setStatus);
  const setRequestVerify = useFloodStore((s) => s.setRequestVerify);
  const assign = useFloodStore((s) => s.assign);
  const addNote = useFloodStore((s) => s.addNote);
  const ready = volunteers.filter((vol) => vol.approval !== "pending");
  const loaded = useFloodStore((s) => s.ready);
  const [picked, setVolunteerId] = useState("");
  const volunteerId = picked || ready[0]?.id || "";
  const [note, setNote] = useState("");

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
          <p className="text-sm text-muted">เบอร์และหมายเหตุภายในไม่แสดงต่อสาธารณะ</p>
          <Link to="/admin/login" className="mt-4 inline-flex min-h-11 items-center font-semibold text-blue">
            เข้าสู่ระบบแอดมิน
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-lg px-4 py-4">
        <PageIntro title={req.id} lede={`${TYPE_LABEL[req.type]} · ${districtById(req.districtId)?.name} · ${req.placeLabel}`} />
        <Panel>
          <div className="flex flex-wrap gap-2">
            <Pill tone={toneForPriority(req.priority)}>{PRIORITY_LABEL[req.priority]}</Pill>
            <Pill tone="info">{STATUS_LABEL[req.status]}</Pill>
            <Pill tone={toneForVerify(req.verify)}>{VERIFY_LABEL[req.verify]}</Pill>
          </div>
          <p className="mt-3 text-sm leading-relaxed">{req.detail}</p>
          <p className="mt-2 text-sm">จำนวน {req.people} คน</p>
          <a className="mt-2 inline-flex min-h-11 items-center font-semibold text-blue" href={`tel:${req.phone}`}>
            {req.phone}
          </a>
          {req.photo ? (
            <img src={req.photo} alt="รูปประกอบคำร้อง" className="mt-3 max-h-56 w-full rounded-xl object-cover" />
          ) : null}
          <p className="mt-2 text-xs text-muted">อัปเดต {ago(req.updatedAt)}</p>
        </Panel>
        <div className="mt-4 space-y-4">
          <Field label="ความเร่งด่วน">
            <div className="grid grid-cols-2 gap-2">
              {PRIORITIES.map((item) => (
                <Button
                  key={item}
                  variant={req.priority === item ? "navy" : "soft"}
                  onClick={() => setPriority(req.id, item as Priority)}
                >
                  {PRIORITY_LABEL[item]}
                </Button>
              ))}
            </div>
          </Field>
          <Field label="สถานะงาน">
            <select
              className={controlClass}
              value={req.status}
              onChange={(e) => setStatus(req.id, e.target.value as RequestStatus)}
            >
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {STATUS_LABEL[item]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="การตรวจสอบ">
            <div className="grid grid-cols-2 gap-2">
              {(["pending", "community", "verified", "outdated"] as VerifyStatus[]).map((item) => (
                <Button
                  key={item}
                  variant={req.verify === item ? "navy" : "ghost"}
                  onClick={() => setRequestVerify(req.id, item)}
                >
                  {VERIFY_LABEL[item]}
                </Button>
              ))}
            </div>
          </Field>
          <Field label="มอบทีม">
            <select className={controlClass} value={volunteerId} onChange={(e) => setVolunteerId(e.target.value)}>
              {ready.map((vol) => (
                <option key={vol.id} value={vol.id}>
                  {vol.name} · {vol.kind === "student" ? "นักศึกษา" : "อาสา"}
                </option>
              ))}
            </select>
            <Button className="mt-2" disabled={!volunteerId} onClick={() => void assign(req.id, volunteerId)}>
              มอบหมาย
            </Button>
          </Field>
          <Field label="หมายเหตุภายใน" hint="ไม่ขึ้นให้ผู้แจ้งเห็น">
            <textarea className={`${controlClass} min-h-24 py-3`} value={note} onChange={(e) => setNote(e.target.value)} />
            <Button
              className="mt-2"
              variant="soft"
              onClick={() => {
                addNote(req.id, note);
                setNote("");
              }}
            >
              บันทึกหมายเหตุ
            </Button>
          </Field>
          <ul className="space-y-3">
            {events.map((event) => (
              <li key={event.id} className="text-sm">
                <p>
                  {event.internal ? "ภายใน: " : ""}
                  {event.message}
                </p>
                <p className="text-xs text-muted">{ago(event.at)}</p>
              </li>
            ))}
          </ul>
          <Link to="/coord" className="inline-flex min-h-11 items-center text-sm font-semibold text-blue">
            กลับคิวทั้งหมด
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
