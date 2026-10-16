import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ClipboardCheck, Clock, FileQuestion, History, Lightbulb, PackageX, Truck, UserPlus } from "lucide-react";
import { StatCard, type Tone } from "@/components/ui";
import { getIntelOverview } from "@/lib/intel/fns";

const LOOKS: { icon: typeof Clock; tone: Tone }[] = [
  { icon: ClipboardCheck, tone: "green" },
  { icon: AlertTriangle, tone: "red" },
  { icon: UserPlus, tone: "purple" },
  { icon: Truck, tone: "blue" },
  { icon: Clock, tone: "amber" },
  { icon: PackageX, tone: "orange" },
  { icon: FileQuestion, tone: "sky" },
  { icon: History, tone: "indigo" },
  { icon: Lightbulb, tone: "teal" },
];

export const Route = createFileRoute("/intel/")({
  loader: () => getIntelOverview(),
  component: Overview,
});

function Overview() {
  const data = Route.useLoaderData();
  if (!data.ok) return <p className="text-sm">ไม่มีสิทธิ์ดูตัวเลขนี้</p>;
  const cards = [
    ["เหตุที่ยืนยันแล้ว", data.counts.verifiedActive],
    ["รอตรวจ", data.counts.awaitingReview],
    ["รอมอบงาน", data.counts.awaitingAssignment],
    ["ภารกิจที่กำลังทำ", data.counts.activeMissions],
    ["รอตรวจผล", data.counts.awaitingOutcome],
    ["ของขาด", data.counts.shortages],
    ["ขอข้อมูลเพิ่ม", data.counts.needsInfo],
    ["ข้อมูลเก่า", data.counts.outdated],
    ["ข้อเสนอรอคนตรวจ", data.counts.suggestionsPending],
  ] as const;
  return (
    <div>
      <h1 className="text-xl font-semibold text-navy">ภาพรวมปฏิบัติการ</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">{data.demoNote}</p>
      <p className="mt-1 text-xs text-muted">ตัวจัดหมวด: {data.modelLabel} · ไม่มีบริการ AI ภายนอก</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map(([label, value], index) => {
          const look = LOOKS[index % LOOKS.length];
          return <StatCard key={label} icon={look.icon} tone={look.tone} label={label} value={value} />;
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link to="/intel/review" className="font-medium text-blue">
          ไปตรวจรายงาน
        </Link>
        <Link to="/intel/map" className="font-medium text-blue">
          เปิดแผนที่
        </Link>
      </div>
    </div>
  );
}
