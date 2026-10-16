import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { intelLogout } from "@/lib/intel/fns";
import { ROLE_LABEL } from "@/lib/intel/labels";
import { useFloodStore } from "@/lib/store";

const LINKS = [
  { to: "/intel", label: "ภาพรวม", exact: true },
  { to: "/intel/map", label: "แผนที่" },
  { to: "/intel/review", label: "ตรวจรายงาน" },
  { to: "/intel/missions", label: "ภารกิจ" },
  { to: "/intel/resources", label: "ของ" },
  { to: "/intel/briefing", label: "สรุปสถานการณ์" },
  { to: "/intel/volunteers", label: "อาสา" },
] as const;

export function IntelFrame({
  member,
  children,
}: {
  member: { displayName: string; role: "admin" | "verified_volunteer" };
  children: ReactNode;
}) {
  const logout = useFloodStore((s) => s.logout);
  return (
    <div className="min-h-full bg-bg">
      <div className="border-b border-line bg-navy px-4 py-3 text-surface">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <p className="text-xs tracking-wide text-mist">UBON Six Seven Intelligence</p>
            <p className="text-sm font-medium">ห้องปฏิบัติการข่าวกรองน้ำท่วม</p>
          </div>
          <p className="text-xs text-mist">
            {member.displayName} · {ROLE_LABEL[member.role]}
          </p>
          <button
            type="button"
            className="ml-auto text-xs text-mist"
            onClick={() => {
              void intelLogout();
              logout();
            }}
          >
            ออกจากระบบ
          </button>
        </div>
        <nav className="mt-3 flex gap-1 overflow-x-auto text-sm">
          {LINKS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: "exact" in item }}
              className="shrink-0 px-2 py-1 text-mist"
              activeProps={{ className: "bg-surface text-navy" }}
            >
              {item.label}
            </Link>
          ))}
          {member.role === "admin" ? (
            <Link to="/intel/audit" className="shrink-0 px-2 py-1 text-mist" activeProps={{ className: "bg-surface text-navy" }}>
              บันทึก
            </Link>
          ) : null}
        </nav>
      </div>
      <p className="border-b border-line bg-watch-soft px-4 py-2 text-xs text-watch">
        ชุดตั้งต้นเป็นข้อมูลสาธิตในฐานข้อมูล ไม่ใช่สถานการณ์จริง ข้อเสนออัตโนมัติมาจากกฎคีย์เวิร์ดในเครื่อง ไม่ได้เชื่อมโมเดลภายนอก และไม่มีอำนาจสั่งการกู้ภัย
      </p>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}
