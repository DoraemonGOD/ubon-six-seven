import { createFileRoute, redirect } from "@tanstack/react-router";
import { getIntelAudit } from "@/lib/intel/fns";

export const Route = createFileRoute("/intel/audit")({
  beforeLoad: ({ context }) => {
    const member = (context as { member?: { role?: string } }).member;
    if (member?.role !== "admin") throw redirect({ to: "/intel" });
  },
  loader: () => getIntelAudit(),
  component: Audit,
});

function Audit() {
  const data = Route.useLoaderData();
  if (!data.ok) return <p className="text-sm">บันทึกนี้เปิดเฉพาะผู้ดูแล</p>;
  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy">บันทึกกิจกรรม</h1>
      <ul className="card mt-4 overflow-hidden text-sm">
        {data.items.map((item) => (
          <li key={item.id} className="border-t border-line px-4 py-2.5 first:border-t-0">
            <span className="text-xs text-muted">{new Date(item.at).toLocaleString("th-TH")}</span>
            <span className="mt-0.5 block">
              {item.action} · {item.target} · {item.detail}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
