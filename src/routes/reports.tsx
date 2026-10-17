import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, MapPin, Megaphone } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CoordLine } from "@/components/location-field";
import { RecordPhoto } from "@/components/photo-field";
import { AppShell } from "@/components/shell";
import { PageIntro, Pill, controlClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import { DISTRICTS, SOURCE_LABEL, VERIFY_LABEL, districtById, toneForVerify, type FieldReport } from "@/lib/model";
import { useFloodStore } from "@/lib/store";
import { ago } from "@/lib/time";

export const Route = createFileRoute("/reports")({ component: Reports });

const FILTERS = [
  { id: "all", label: "ทั้งหมด" },
  { id: "pending", label: "รอตรวจ" },
  { id: "verified", label: "ยืนยันแล้ว" },
  { id: "photo", label: "มีรูป" },
  { id: "gps", label: "มีพิกัดจริง" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

function Reports() {
  const reports = useFloodStore((s) => s.reports);
  const role = useFloodStore((s) => s.role);
  const ready = useFloodStore((s) => s.ready);
  const [filter, setFilter] = useState<FilterId>("all");
  const [district, setDistrict] = useState("all");

  const rows = useMemo(
    () =>
      [...reports]
        .filter((r) => (district === "all" ? true : r.districtId === district))
        .filter((r) =>
          filter === "all"
            ? true
            : filter === "photo"
              ? r.hasPhoto
              : filter === "gps"
                ? Boolean(r.via)
                : filter === "pending"
                  ? r.verify === "pending"
                  : r.verify === "verified",
        )
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [reports, filter, district],
  );

  const count = (id: FilterId) =>
    reports.filter((r) =>
      id === "all" ? true : id === "photo" ? r.hasPhoto : id === "gps" ? Boolean(r.via) : id === "pending" ? r.verify === "pending" : r.verify === "verified",
    ).length;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-4">
        <PageIntro title="รายงานสถานการณ์" lede="สิ่งที่คนในพื้นที่เห็น พร้อมพิกัดและรูป ยังไม่ใช่ข้อมูลหน่วยงานจนกว่าจะตรวจยืนยัน" />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition",
                filter === f.id ? "bg-navy text-surface" : "border border-line bg-surface text-ink",
              )}
            >
              {f.label}
              <span className="ml-1.5 opacity-70">{count(f.id)}</span>
            </button>
          ))}
        </div>
        <select className={cn(controlClass, "mt-2")} value={district} onChange={(e) => setDistrict(e.target.value)} aria-label="อำเภอ">
          <option value="all">ทุกอำเภอ</option>
          {DISTRICTS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <ul className="mt-4 space-y-3">
          {rows.map((r) => (
            <ReportCard key={r.id} report={r} canVerify={role === "coordinator"} />
          ))}
          {ready && rows.length === 0 ? (
            <li className="card p-6 text-center text-sm text-muted">ยังไม่มีรายงานตามตัวกรองนี้</li>
          ) : null}
        </ul>

        <Link
          to="/report/new"
          className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue text-sm font-semibold text-surface shadow-sm"
        >
          <Megaphone className="size-4" /> แจ้งสถานการณ์ใหม่
        </Link>
      </div>
    </AppShell>
  );
}

function ReportCard({ report: r, canVerify }: { report: FieldReport; canVerify: boolean }) {
  const setReportVerify = useFloodStore((s) => s.setReportVerify);
  return (
    <li className="card overflow-hidden">
      {r.hasPhoto ? <RecordPhoto kind="report" id={r.id} alt={`รูปจาก ${r.placeLabel}`} className="max-h-72 w-full object-cover" /> : null}
      <div className="space-y-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={toneForVerify(r.verify)}>{VERIFY_LABEL[r.verify]}</Pill>
          <span className="text-xs text-muted">
            {SOURCE_LABEL[r.source]} · {ago(r.createdAt)}
          </span>
        </div>
        <p className="font-semibold leading-snug text-navy">{r.summary}</p>
        <p className="flex items-center gap-1 text-sm text-muted">
          <MapPin className="size-3.5" /> อ.{districtById(r.districtId)?.name} · {r.placeLabel}
        </p>
        <CoordLine lat={r.lat} lng={r.lng} accuracy={r.accuracy} via={r.via} approx={!r.via} />
        {canVerify && r.verify !== "verified" ? (
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => void setReportVerify(r.id, "verified").then(() => toast("ยืนยันรายงานแล้ว"))}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-ok text-sm font-semibold text-surface"
            >
              <CheckCircle2 className="size-4" /> ยืนยันว่าจริง
            </button>
            <button
              type="button"
              onClick={() => void setReportVerify(r.id, "outdated").then(() => toast("ทำเครื่องหมายว่าข้อมูลเก่าแล้ว"))}
              className="min-h-10 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-muted"
            >
              ข้อมูลเก่า
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}
