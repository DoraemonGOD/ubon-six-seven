// Layout for the intel room: its own navy sidebar, a slim top bar and a
// one-line demo notice, so the room reads as a separate, restricted workspace.
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  ClipboardList,
  FileSearch,
  History,
  LayoutDashboard,
  Lock,
  LogOut,
  Map,
  Package,
  ScrollText,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ROLE_LABEL } from "@/lib/intel/labels";
import { useFloodStore } from "@/lib/store";

const LINKS = [
  { to: "/intel", label: "ภาพรวมปฏิบัติการ", short: "ภาพรวม", icon: LayoutDashboard, exact: true },
  { to: "/intel/review", label: "ตรวจสอบเหตุการณ์", short: "ตรวจเหตุ", icon: FileSearch },
  { to: "/intel/map", label: "แผนที่สถานการณ์", short: "แผนที่", icon: Map },
  { to: "/intel/missions", label: "ภารกิจช่วยเหลือ", short: "ภารกิจ", icon: Truck },
  { to: "/intel/resources", label: "สิ่งของและศูนย์พักพิง", short: "สิ่งของ/ที่พัก", icon: Package },
  { to: "/intel/briefing", label: "สรุปสถานการณ์", short: "สรุป", icon: ScrollText },
  { to: "/intel/volunteers", label: "ทีมอาสาสมัคร", short: "อาสา", icon: Users },
] as const;

const AUDIT = { to: "/intel/audit", label: "บันทึกกิจกรรม", short: "บันทึก", icon: History } as const;

function thaiDate() {
  try {
    return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date());
  } catch {
    return "";
  }
}

export function IntelFrame({
  member,
  children,
}: {
  member: { displayName: string; role: "admin" | "verified_volunteer" };
  children: ReactNode;
}) {
  const logout = useFloodStore((s) => s.logout);
  const alertCount = useFloodStore((s) => s.alerts.length);
  const newRequests = useFloodStore((s) => s.requests.filter((r) => r.status === "submitted").length);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const links = member.role === "admin" ? [...LINKS, AUDIT] : LINKS;
  const signOut = async () => {
    await logout();
    void navigate({ to: "/" });
  };
  const badge = alertCount || newRequests;

  return (
    <div className="flex min-h-svh bg-bg lg:h-dvh">
      {/* Desktop sidebar */}
      <aside className="side-surface hidden w-64 shrink-0 flex-col gap-5 overflow-y-auto px-4 py-5 lg:flex">
        <Link to="/intel" className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-linear-to-br from-sky to-blue text-surface shadow-lg shadow-black/20">
            <ShieldCheck className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-base font-bold text-surface">UBON Flood Link</span>
            <span className="block text-[11px] font-semibold tracking-[0.2em] text-[#fbbf24]">INTELLIGENCE</span>
          </span>
        </Link>
        <nav className="space-y-1" aria-label="เมนูห้องข่าวกรอง">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: "exact" in item }}
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-mist/90 transition hover:bg-white/8 hover:text-surface"
                activeProps={{ className: "bg-white/14 font-semibold !text-surface shadow-inner" }}
              >
                <Icon className="size-[18px] shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="rounded-xl border border-side-line bg-white/5 p-3">
          <p className="flex items-center gap-2 text-xs font-bold text-[#fbbf24]">
            <Lock className="size-3.5" /> พื้นที่จำกัดสิทธิ์
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-mist/75">เฉพาะผู้ดูแลระบบและอาสาสมัครที่ผ่านการยืนยันแล้ว</p>
        </div>
        <div className="mt-auto space-y-1">
          <Link to="/" className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm text-mist/80 hover:bg-white/8 hover:text-surface">
            <ArrowLeft className="size-4" /> กลับหน้าเว็บหลัก
          </Link>
          {member.role === "admin" ? (
            <Link to="/coord" className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm text-mist/80 hover:bg-white/8 hover:text-surface">
              <ClipboardList className="size-4" /> ศูนย์ประสานคำร้อง
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-sm text-mist/80 hover:bg-white/8 hover:text-surface"
          >
            <LogOut className="size-4" /> ออกจากระบบ
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header + tabs */}
        <header className="side-surface sticky top-0 z-40 shrink-0 px-4 pt-3 lg:hidden">
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="กลับหน้าเว็บหลัก" className="grid size-9 place-items-center rounded-xl bg-white/10 text-surface">
              <ArrowLeft className="size-4" />
            </Link>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-sm font-bold text-surface">UBON Flood Link</p>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-[#fbbf24]">INTELLIGENCE</p>
            </div>
            {member.role === "admin" ? <Link to="/coord" aria-label="คำร้องใหม่" className="relative grid size-9 place-items-center rounded-xl bg-white/10 text-surface">
              <Bell className="size-4" />
              {badge ? <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-crit px-1 text-[10px] font-bold">{badge}</span> : null}
            </Link> : null}
            <button type="button" aria-label="ออกจากระบบ" onClick={() => void signOut()} className="grid size-9 place-items-center rounded-xl bg-white/10 text-surface">
              <LogOut className="size-4" />
            </button>
          </div>
          <nav className="-mx-4 mt-3 flex gap-1 overflow-x-auto px-4 pb-2" aria-label="เมนูห้องข่าวกรอง">
            {links.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: "exact" in item }}
                  className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-mist"
                  activeProps={{ className: "bg-surface font-semibold !text-navy" }}
                >
                  <Icon className="size-3.5" />
                  {item.short}
                </Link>
              );
            })}
          </nav>
        </header>

        {/* Desktop top bar */}
        <header className="hidden h-16 shrink-0 items-center gap-4 border-b border-line bg-surface px-6 lg:flex">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-soft px-3 py-1.5 text-xs font-semibold text-ok">
            <ShieldCheck className="size-3.5" /> พื้นที่แอดมินและอาสาสมัครที่ยืนยันแล้ว
          </span>
          <span className="text-sm text-muted">{thaiDate()}</span>
          <div className="ml-auto flex items-center gap-3">
            {member.role === "admin" ? <Link to="/coord" aria-label="คำร้องใหม่" className="relative grid size-10 place-items-center rounded-xl text-muted hover:bg-bg">
              <Bell className="size-5" />
              {badge ? (
                <span className="absolute top-0.5 right-0.5 grid min-w-5 place-items-center rounded-full bg-crit px-1 text-[10px] font-bold text-surface">{badge}</span>
              ) : null}
            </Link> : null}
            <div className="flex items-center gap-2.5 rounded-full border border-line py-1 pr-3 pl-1">
              <span className="grid size-8 place-items-center rounded-full bg-linear-to-br from-purple to-blue text-sm font-bold text-surface">
                {member.displayName.slice(0, 1)}
              </span>
              <span className="leading-tight">
                <span className="block max-w-40 truncate text-sm font-semibold text-navy">{member.displayName}</span>
                <span className="block text-[11px] text-muted">{ROLE_LABEL[member.role]}</span>
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 lg:min-h-0 lg:overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-5 lg:px-6">
            <p className={cn("mb-4 flex items-start gap-2 rounded-xl border border-watch/25 bg-watch-soft px-3 py-2 text-xs text-watch")}>
              <span aria-hidden>⚠️</span>
              <span>ข้อมูลตั้งต้นในห้องนี้เป็นข้อมูลจำลองเพื่อสาธิต ข้อเสนอของระบบมาจากกฎคีย์เวิร์ด ไม่ใช่ AI และไม่ใช่คำสั่งการกู้ภัย</span>
            </p>
            <div key={pathname} className="page-enter">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
