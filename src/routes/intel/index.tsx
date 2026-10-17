import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  Clock,
  Copy,
  FileQuestion,
  Lightbulb,
  PackageX,
  Truck,
  UserPlus,
} from "lucide-react";
import { useEffect } from "react";
import { StatCard, TONES, type Tone } from "@/components/ui";
import { cn } from "@/lib/cn";
import { getIntelOverview } from "@/lib/intel/fns";
import { CATEGORY_LABEL, URGENCY_LABEL, VERIFY_LABEL } from "@/lib/intel/labels";

export const Route = createFileRoute("/intel/")({
  loader: () => getIntelOverview(),
  component: Overview,
});

const VERIFY_TONE: Record<string, Tone> = {
  unverified: "amber",
  needs_more_information: "sky",
  verified: "green",
  rejected: "red",
};

const URGENCY_TONE: Record<string, Tone> = { critical: "red", high: "orange", medium: "amber", low: "green", unknown: "indigo" };

function when(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "เมื่อสักครู่";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} ชม.ที่แล้ว`;
  return `${Math.round(hrs / 24)} วันที่แล้ว`;
}

function Overview() {
  const data = Route.useLoaderData();
  const router = useRouter();

  // Keep the numbers fresh while the room is open.
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") void router.invalidate();
    }, 15000);
    return () => window.clearInterval(t);
  }, [router]);

  if (!data.ok) return <p className="text-sm">ไม่มีสิทธิ์ดูตัวเลขนี้</p>;
  const c = data.counts;
  const cards = [
    { label: "เหตุที่ยืนยันแล้ว", value: c.verifiedActive, icon: ClipboardCheck, tone: "green" },
    { label: "รอตรวจ", value: c.awaitingReview, icon: AlertTriangle, tone: "red" },
    { label: "รอมอบหมาย", value: c.awaitingAssignment, icon: UserPlus, tone: "purple" },
    { label: "ภารกิจที่กำลังทำ", value: c.activeMissions, icon: Truck, tone: "blue" },
    { label: "รอตรวจผล", value: c.awaitingOutcome, icon: Clock, tone: "amber" },
    { label: "ของขาด", value: c.shortages, icon: PackageX, tone: "orange" },
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-navy">ภาพรวมปฏิบัติการ</h1>
        <p className="mt-1 text-sm text-muted">ดูว่าตอนนี้มีอะไรรอตรวจ รอส่งทีม และอะไรกำลังเกิดขึ้น</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6">
        {cards.map((card) => (
          <StatCard key={card.label} icon={card.icon} tone={card.tone} label={card.label} value={card.value} />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Review queue */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="font-semibold text-navy">รายการที่ต้องตรวจสอบ</h2>
            <Link to="/intel/review" className="inline-flex items-center gap-1 text-sm font-medium text-blue">
              ดูทั้งหมด <ArrowRight className="size-4" />
            </Link>
          </div>
          {data.queue.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">ไม่มีเรื่องค้างตรวจ</p>
          ) : (
            <>
              <table className="hidden w-full text-sm md:table">
                <thead className="bg-bg text-left text-xs text-muted">
                  <tr>
                    <th className="px-4 py-2 font-medium">รหัสเหตุการณ์</th>
                    <th className="px-2 py-2 font-medium">ประเภท</th>
                    <th className="px-2 py-2 font-medium">พื้นที่</th>
                    <th className="px-2 py-2 font-medium">สถานะ</th>
                    <th className="px-4 py-2 text-right font-medium">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.queue.map((row) => (
                    <tr key={row.id} className="border-t border-line">
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-navy">{row.id}</td>
                      <td className="px-2 py-3">
                        <span className="font-medium text-navy">{CATEGORY_LABEL[row.category] ?? row.category}</span>
                        <span className={cn("ml-2 rounded-full px-2 py-0.5 text-[11px]", TONES[URGENCY_TONE[row.urgency] ?? "indigo"].soft, TONES[URGENCY_TONE[row.urgency] ?? "indigo"].text)}>
                          {URGENCY_LABEL[row.urgency] ?? row.urgency}
                        </span>
                      </td>
                      <td className="max-w-48 truncate px-2 py-3 text-muted">
                        {row.districtName} · {row.placeLabel}
                      </td>
                      <td className="px-2 py-3">
                        <StatusPill row={row} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to="/intel/review/$id"
                          params={{ id: row.id }}
                          className={cn(
                            "inline-flex rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-surface",
                            row.next === "assign" ? "bg-purple" : "bg-blue",
                          )}
                        >
                          {row.next === "assign" ? "มอบหมาย" : "ตรวจสอบ"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="md:hidden">
                {data.queue.map((row) => (
                  <li key={row.id} className="border-t border-line first:border-t-0">
                    <Link to="/intel/review/$id" params={{ id: row.id }} className="flex items-center gap-3 px-4 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-navy">
                          {CATEGORY_LABEL[row.category] ?? row.category} · {URGENCY_LABEL[row.urgency] ?? row.urgency}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {row.districtName} · {row.placeLabel}
                        </span>
                      </span>
                      <StatusPill row={row} />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <div className="space-y-5">
          {/* Rule-based hints */}
          <section className="card p-4">
            <h2 className="flex items-center gap-2 font-semibold text-navy">
              <Lightbulb className="size-4 text-teal" /> ระบบแนะนำให้ตรวจสอบ
            </h2>
            <p className="mt-0.5 text-xs text-muted">จากกฎคีย์เวิร์ด ไม่ใช่ AI · ต้องมีคนตรวจก่อนเสมอ</p>
            {data.hints.length === 0 ? (
              <p className="mt-3 text-sm text-muted">ยังไม่มีข้อสังเกต</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.hints.map((hint) => (
                  <li key={hint.id} className={cn("rounded-xl p-3", hint.kind === "duplicate" ? "bg-orange-soft" : "bg-sky-soft")}>
                    <p className={cn("flex items-center gap-1.5 text-sm font-semibold", hint.kind === "duplicate" ? "text-orange" : "text-sky")}>
                      {hint.kind === "duplicate" ? <Copy className="size-4" /> : <FileQuestion className="size-4" />}
                      {hint.kind === "duplicate" ? "อาจเป็นเหตุซ้ำ" : "ข้อมูลไม่ครบ"}
                    </p>
                    <p className="mt-1 text-xs text-ink">{hint.text}</p>
                    {hint.where ? <p className="text-xs text-muted">{hint.where}</p> : null}
                    <Link
                      to="/intel/review/$id"
                      params={{ id: hint.incidentId }}
                      className="mt-2 inline-flex rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-navy shadow-sm"
                    >
                      ตรวจสอบ
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recent activity */}
          {data.recent.length ? (
            <section className="card p-4">
              <h2 className="font-semibold text-navy">ความเคลื่อนไหวล่าสุด</h2>
              <ol className="mt-3 space-y-3 border-l-2 border-line pl-4">
                {data.recent.map((item) => (
                  <li key={item.id} className="relative">
                    <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-blue ring-4 ring-surface" />
                    <p className="text-sm text-ink">{item.detail}</p>
                    <p className="text-[11px] text-muted">
                      {item.target} · {when(item.at)}
                    </p>
                  </li>
                ))}
              </ol>
              <Link to="/intel/audit" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue">
                ดูบันทึกทั้งหมด <ArrowRight className="size-4" />
              </Link>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ row }: { row: { verification: string; next: "assign" | "review" } }) {
  const tone = row.next === "assign" ? "purple" : (VERIFY_TONE[row.verification] ?? "amber");
  const label = row.next === "assign" ? "รอมอบหมาย" : (VERIFY_LABEL[row.verification] ?? row.verification);
  return <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap", TONES[tone].soft, TONES[tone].text)}>{label}</span>;
}
