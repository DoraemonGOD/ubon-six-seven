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
      <h1 className="text-xl font-medium text-navy">บันทึกการทำงาน</h1>
      <ul className="mt-4 border-t border-line text-sm">
        {data.items.map((item) => (
          <li key={item.id} className="border-b border-line py-2">
            <span className="text-xs text-muted">{item.at}</span>
            <span className="mt-0.5 block">
              {item.action} · {item.target} · {item.detail}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
