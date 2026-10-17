import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FloodMap, type LayerKey } from "@/components/flood-map";
import { AppShell } from "@/components/shell";
import { AlertTriangle, CheckCircle2, Clock, Flame } from "lucide-react";
import { PageIntro, Pill, Button, StatCard, controlClass } from "@/components/ui";
import {
  DISTRICTS,
  PRIORITIES,
  PRIORITY_LABEL,
  PRIORITY_RANK,
  STATUS_LABEL,
  TYPE_LABEL,
  VEHICLE_LABEL,
  districtById,
  isOpenStatus,
  toneForPriority,
  type HelpType,
  type MapSelection,
  type RequestStatus,
} from "@/lib/model";
import { useFloodStore } from "@/lib/store";
import { ago } from "@/lib/time";
import { cn } from "@/lib/cn";
import { toast } from "sonner";

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

function CoordHome() {
  const navigate = useNavigate();
  const requests = useFloodStore((s) => s.requests);
  const volunteers = useFloodStore((s) => s.volunteers);
  const assignments = useFloodStore((s) => s.assignments);
  const approveVolunteer = useFloodStore((s) => s.approveVolunteer);
  const role = useFloodStore((s) => s.role);
  const [district, setDistrict] = useState("all");
  const [priority, setPriority] = useState("all");
  const [status, setStatus] = useState("open");
  const [kind, setKind] = useState("all");
  const [view, setView] = useState<"list" | "map">("list");

  const open = requests.filter((req) => isOpenStatus(req.status));
  const counts = {
    critical: open.filter((req) => req.priority === "critical").length,
    high: open.filter((req) => req.priority === "high").length,
    medium: open.filter((req) => req.priority === "medium").length,
    low: open.filter((req) => req.priority === "low").length,
  };

  const rows = useMemo(() => {
    return requests
      .filter((req) => (district === "all" ? true : req.districtId === district))
      .filter((req) => (priority === "all" ? true : req.priority === priority))
      .filter((req) => (kind === "all" ? true : req.type === kind))
      .filter((req) => (status === "all" ? true : status === "open" ? isOpenStatus(req.status) : req.status === status))
      .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [requests, district, priority, kind, status]);

  function onMap(sel: MapSelection | null) {
    if (sel?.kind === "request") {
      void navigate({ to: "/coord/requests/$id", params: { id: sel.id } });
    }
  }

  if (role !== "coordinator") {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-lg px-4 py-4">
          <PageIntro
            title="ศูนย์ประสาน"
            lede="คิวคำร้อง เบอร์ผู้แจ้ง และปุ่มมอบทีมเปิดให้ผู้ประสานเท่านั้น"
          />
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-sm leading-relaxed">
              ยังไม่ได้เข้าสู่ระบบแอดมิน ต้นแบบนี้ยังไม่เชื่อมหน่วยงานจริง
            </p>
            <Link
              to="/admin/login"
              className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-blue px-4 text-sm font-semibold text-surface"
            >
              เข้าสู่ระบบแอดมิน
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl px-4 py-4">
        <PageIntro
          title="ศูนย์ประสาน"
          lede="ตรวจคำร้อง จัดลำดับ และมอบทีม ทุกเครื่องเห็นข้อมูลชุดเดียวกัน ยังไม่ส่งต่อหน่วยงานจริง"
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={AlertTriangle} tone="red" label="วิกฤตที่ยังเปิด" value={counts.critical} />
          <StatCard icon={Flame} tone="orange" label="ความเร่งด่วนสูง" value={counts.high} />
          <StatCard icon={Clock} tone="amber" label="ปานกลาง" value={counts.medium} />
          <StatCard icon={CheckCircle2} tone="green" label="ต่ำ" value={counts.low} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-4">
          <select className={controlClass} value={district} onChange={(e) => setDistrict(e.target.value)}>
            <option value="all">ทุกอำเภอ</option>
            {DISTRICTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select className={controlClass} value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="all">ทุกระดับ</option>
            {PRIORITIES.map((item) => (
              <option key={item} value={item}>
                {PRIORITY_LABEL[item]}
              </option>
            ))}
          </select>
          <select className={controlClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="open">ยังไม่จบ</option>
            <option value="all">ทุกสถานะ</option>
            {(Object.keys(STATUS_LABEL) as RequestStatus[]).map((item) => (
              <option key={item} value={item}>
                {STATUS_LABEL[item]}
              </option>
            ))}
          </select>
          <select className={controlClass} value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="all">ทุกประเภท</option>
            {(["trapped", "evacuation", "food", "medicine", "vulnerable", "transport", "other"] as HelpType[]).map((item) => (
              <option key={item} value={item}>
                {TYPE_LABEL[item]}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex gap-2">
          {(["list", "map"] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={view === item}
              onClick={() => setView(item)}
              className={cn("min-h-11 rounded-full px-4 text-sm font-semibold", view === item ? "bg-navy text-surface" : "bg-surface text-ink")}
            >
              {item === "list" ? "รายการ" : "แผนที่"}
            </button>
          ))}
          <p className="self-center text-xs text-muted">{rows.length} เรื่องตามตัวกรอง</p>
        </div>
        {view === "map" ? (
          <div className="relative mt-3 h-[70vh] overflow-hidden rounded-2xl border border-line">
            <FloodMap layers={LAYERS} onSelect={onMap} />
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {rows.map((req) => (
              <li key={req.id}>
                <Link
                  to="/coord/requests/$id"
                  params={{ id: req.id }}
                  className="block rounded-2xl border border-line bg-surface p-3"
                >
                  <div className="flex flex-wrap gap-2">
                    <Pill tone={toneForPriority(req.priority)}>{PRIORITY_LABEL[req.priority]}</Pill>
                    <Pill tone="info">{STATUS_LABEL[req.status]}</Pill>
                    <Pill tone="muted">{req.id}</Pill>
                  </div>
                  <p className="mt-2 font-semibold">
                    {TYPE_LABEL[req.type]} · {districtById(req.districtId)?.name}
                  </p>
                  <p className="text-sm text-muted">
                    {req.placeLabel} · {req.people} คน · {ago(req.updatedAt)}
                  </p>
                </Link>
              </li>
            ))}
            {rows.length === 0 ? <li className="text-sm text-muted">ไม่มีคำร้องตามตัวกรอง</li> : null}
          </ul>
        )}
        <h2 id="volunteers" className="mt-6 scroll-mt-24 text-base font-semibold">อาสารอแอดมินยืนยัน ({volunteers.filter((vol) => vol.approval === "pending").length})</h2>
        <ul className="mt-2 space-y-2">
          {volunteers.filter((vol) => vol.approval === "pending").map((vol) => (
            <li key={vol.id} className="rounded-2xl border border-line bg-surface p-3 text-sm">
              <p className="font-semibold">
                {vol.name} · {vol.kind === "student" ? "นักศึกษา" : "อาสา"}
              </p>
              <p className="text-muted">
                {vol.phone} · {VEHICLE_LABEL[vol.vehicle]} · {vol.window}
              </p>
              <Button
                className="mt-3"
                onClick={() => {
                  void approveVolunteer(vol.id).then((ok) =>
                    toast(ok ? `ยืนยัน ${vol.name} แล้ว` : "ยืนยันไม่ได้"),
                  );
                }}
              >
                ยืนยัน
              </Button>
            </li>
          ))}
          {volunteers.every((vol) => vol.approval !== "pending") ? (
            <li className="text-sm text-muted">ไม่มีใบสมัครที่รออยู่</li>
          ) : null}
        </ul>
        <h2 className="mt-6 text-base font-semibold">อาสาที่ยืนยันแล้ว</h2>
        <ul className="mt-2 space-y-2">
          {volunteers
            .filter((vol) => vol.approval !== "pending")
            .map((vol) => {
            const load = assignments.filter(
              (item) => item.volunteerId === vol.id && (item.status === "assigned" || item.status === "in_progress"),
            ).length;
            return (
              <li key={vol.id} className="rounded-2xl border border-line bg-surface p-3 text-sm">
                <p className="font-semibold">
                  {vol.name} · {vol.kind === "student" ? "นักศึกษา" : "อาสา"}
                </p>
                <p className="text-muted">
                  {VEHICLE_LABEL[vol.vehicle]} · งานค้าง {load} · {role === "coordinator" ? vol.phone : "เบอร์ล็อกไว้"}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </AppShell>
  );
}

