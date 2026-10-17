import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/shell";
import { useFloodStore } from "@/lib/store";

export const Route = createFileRoute("/intel-denied")({
  validateSearch: (search: Record<string, unknown>) => ({
    reason: search.reason === "pending" ? "pending" : "unauthenticated",
  }),
  component: Denied,
});

function Denied() {
  const { reason } = Route.useSearch();
  const demoAdminCode = useFloodStore((s) => s.demoAdminCode);
  return (
    <AppShell>
      <div className="mx-auto max-w-lg px-4 py-8">
        <p className="text-xs text-muted">UBON Flood Link Intelligence</p>
        <h1 className="mt-2 text-2xl font-medium text-navy">เข้าห้องนี้ไม่ได้</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {reason === "pending"
            ? "บัญชีอาสายังเป็นสถานะรอการยืนยัน ผู้ดูแลต้องอนุมัติก่อน จึงจะเห็นข้อมูลปฏิบัติการ"
            : "ส่วนนี้เปิดเฉพาะผู้ดูแลและอาสาที่ได้รับการยืนยันแล้ว ประชาชนทั่วไปขอความช่วยเหลือได้จากหน้าแรกโดยไม่ต้องเข้าห้องนี้"}
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link to="/admin/login" className="font-medium text-blue">
            เข้าผู้ดูแล
          </Link>
          <Link to="/volunteer" className="font-medium text-blue">
            เข้าอาสา
          </Link>
          <Link to="/" className="font-medium text-navy">
            กลับหน้าแรก
          </Link>
        </div>
        <div className="mt-6 border border-line bg-surface p-3 text-xs leading-relaxed text-muted">
          <p>บัญชีสาธิตสำหรับทดสอบสิทธิ์</p>
          {demoAdminCode ? <p className="mt-1">ผู้ดูแล: รหัส {demoAdminCode}</p> : null}
          <p>อาสาที่ยืนยันแล้ว: 0810000000 / demo1234 เห็นเฉพาะเมืองอุบลและวาริน</p>
          <p>อาสารอตรวจ: 0820000000 / demo1234 เข้าห้องนี้ไม่ได้</p>
        </div>
      </div>
    </AppShell>
  );
}
