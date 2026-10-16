import { createFileRoute, Link } from "@tanstack/react-router";
import { getIntelIncidents } from "@/lib/intel/fns";
import { CATEGORY_LABEL, URGENCY_LABEL, VERIFY_LABEL } from "@/lib/intel/labels";

export const Route = createFileRoute("/intel/review/")({
  loader: () => getIntelIncidents(),
  component: ReviewList,
});

function ReviewList() {
  const data = Route.useLoaderData();
  if (!data.ok) return <p className="text-sm">ไม่มีสิทธิ์</p>;
  return (
    <div>
      <h1 className="text-xl font-medium text-navy">ศูนย์ตรวจรายงาน</h1>
      <p className="mt-1 text-sm text-muted">ต้นฉบับยังอยู่แม้จะรวมซ้ำ ข้อเสนอคือของอัตโนมัติ ไม่ใช่ข้อเท็จจริง</p>
      <ul className="mt-4 border-t border-line">
        {data.items.map((item) => (
          <li key={item.id} className="border-b border-line">
            <Link to="/intel/review/$id" params={{ id: item.id }} className="flex min-h-16 items-center gap-3 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-navy">
                  {VERIFY_LABEL[item.verification] ?? item.verification} · {CATEGORY_LABEL[item.category] ?? item.category}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted">
                  {item.districtName} · {item.placeLabel} · {URGENCY_LABEL[item.urgency] ?? item.urgency}
                  {item.isDemo ? " · สาธิต" : " · รายงานที่ส่งเข้ามา"}
                  {item.outdated ? " · ข้อมูลเก่า" : ""}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
