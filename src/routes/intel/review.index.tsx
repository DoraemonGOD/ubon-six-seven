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
      <h1 className="text-2xl font-semibold text-navy">ตรวจสอบเหตุการณ์</h1>
      <p className="mt-1 text-sm text-muted">ต้นฉบับยังอยู่แม้จะรวมซ้ำ ข้อเสนอคือของอัตโนมัติ ไม่ใช่ข้อเท็จจริง</p>
      <ul className="card mt-4 overflow-hidden">
        {data.items.map((item) => (
          <li key={item.id} className="border-t border-line first:border-t-0">
            <Link to="/intel/review/$id" params={{ id: item.id }} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-bg">
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
