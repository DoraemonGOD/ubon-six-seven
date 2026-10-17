import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Camera,
  Droplets,
  FileSearch,
  Home,
  House,
  Info,
  LayoutDashboard,
  Lock,
  LogIn,
  LogOut,
  Map,
  Megaphone,
  Menu,
  Package,
  Phone,
  Siren,
  Users,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { IntelLink } from "@/components/intel-link";
import { cn } from "@/lib/cn";
import { ROLE_LABEL } from "@/lib/model";
import { useFloodStore } from "@/lib/store";

const NAV = [
  { to: "/", label: "ภาพรวม", hint: "สถานการณ์วันนี้", icon: Home, exact: true },
  { to: "/map", label: "แผนที่สถานการณ์", hint: "ดูจุดบนแผนที่", icon: Map },
  { to: "/help/new", label: "ขอความช่วยเหลือ", hint: "ส่งคำร้อง ไม่ต้องสมัคร", icon: Siren },
  { to: "/report/new", label: "แจ้งสถานการณ์", hint: "รายงานน้ำและถนน", icon: Megaphone },
  { to: "/reports", label: "รายงานล่าสุด", hint: "พิกัดและรูปจากพื้นที่", icon: Camera },
  { to: "/help/track", label: "ติดตามคำร้อง", hint: "ใช้เลข UBN", icon: FileSearch },
  { to: "/volunteer", label: "อาสาสมัคร", hint: "สมัครหรือเข้าสู่ระบบ", icon: Users },
  { to: "/supplies", label: "สิ่งของช่วยเหลือ", hint: "ของที่ยังขาด", icon: Package },
  { to: "/shelters", label: "ศูนย์พักพิง", hint: "ที่พักชั่วคราว", icon: House },
  { to: "/situation", label: "สถานการณ์รายอำเภอ", hint: "สรุปแต่ละอำเภอ", icon: Activity },
  { to: "/about", label: "เกี่ยวกับโครงการ", hint: "เว็บนี้ทำอะไร", icon: Info },
] as const;

const TABS = [
  { to: "/", label: "หน้าแรก", icon: Home, exact: true },
  { to: "/help/new", label: "ขอช่วย", icon: Siren },
  { to: "/report/new", label: "แจ้ง", icon: Megaphone },
  { to: "/map", label: "แผนที่", icon: Map },
] as const;

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-sky to-blue text-surface shadow-lg shadow-black/20">
        <Droplets className="size-5" strokeWidth={2.4} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-base leading-tight font-bold tracking-tight text-surface">UBON Flood Link</span>
        {compact ? null : (
          <span className="block truncate text-[11px] text-mist/80">เชื่อมปัญหา เชื่อมผู้คน เชื่อมความช่วยเหลือ</span>
        )}
      </span>
    </Link>
  );
}

function SideNav({ onPick }: { onPick?: () => void }) {
  return (
    <nav className="space-y-1" aria-label="เมนูหลัก">
      {NAV.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onPick}
            activeOptions={{ exact: "exact" in item ? item.exact : false }}
            className="group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-mist/90 transition hover:bg-white/8 hover:text-surface"
            activeProps={{ className: "bg-white/14 font-semibold !text-surface shadow-inner" }}
          >
            <Icon className="size-[18px] shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function IntelBox({ onPick }: { onPick?: () => void }) {
  return (
    <div className="rounded-xl border border-side-line bg-white/5 p-3">
      <p className="flex items-center gap-2 text-xs font-bold tracking-wide text-[#fbbf24]">
        <Lock className="size-3.5" /> UBON Flood Link Intelligence
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-mist/70">เฉพาะแอดมินและอาสาที่ยืนยันแล้ว</p>
      <IntelLink label="เข้าห้องข่าวกรอง →" className="mt-2 inline-flex text-xs font-semibold text-sky-300 hover:underline" onClick={onPick} />
    </div>
  );
}

function Hotlines({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Phone className="size-3.5" />
      ไม่ใช่หน่วยกู้ภัย ฉุกเฉินโทร
      <a className="font-bold text-crit" href="tel:1784">
        1784
      </a>
      ·
      <a className="font-bold text-crit" href="tel:1669">
        1669
      </a>
    </span>
  );
}

export function AppShell({ children, bleed = false }: { children: ReactNode; bleed?: boolean }) {
  const [open, setOpen] = useState(false);
  const role = useFloodStore((s) => s.role);
  const activeVolunteerId = useFloodStore((s) => s.activeVolunteerId);
  const activeVolunteer = useFloodStore((s) => s.volunteers.find((item) => item.id === activeVolunteerId));
  const logout = useFloodStore((s) => s.logout);
  const name = role === "coordinator" ? "ผู้ประสานงาน" : (activeVolunteer?.name ?? "");
  const roleLabel =
    role === "coordinator" ? "แอดมิน" : activeVolunteer?.approval === "pending" ? "รอแอดมินยืนยัน" : ROLE_LABEL[role];
  const signedIn = Boolean(name);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className={cn("flex bg-mist lg:h-dvh lg:bg-bg", bleed ? "h-svh" : "min-h-svh")}>
      {/* Desktop sidebar */}
      <aside className="side-surface hidden w-64 shrink-0 flex-col gap-6 overflow-y-auto px-4 py-5 lg:flex">
        <Logo />
        <SideNav />
        {role === "coordinator" ? (
          <Link
            to="/coord"
            className="flex min-h-11 items-center gap-3 rounded-xl bg-linear-to-r from-blue to-sky px-3 text-sm font-semibold text-surface shadow-lg shadow-black/20"
          >
            <LayoutDashboard className="size-[18px]" /> ศูนย์ประสาน
          </Link>
        ) : null}
        <IntelBox />
        <p className="mt-auto text-xs leading-relaxed text-mist/70">
          “เราจะผ่านวิกฤตนี้ไปด้วยกัน
          <br />
          อุบลราชธานีไม่เคยเดียวดาย”
        </p>
      </aside>

      <div
        className={cn(
          "relative mx-auto flex w-full max-w-md min-w-0 flex-col bg-bg lg:h-dvh lg:max-w-none lg:overflow-hidden",
          bleed ? "h-svh overflow-hidden" : "min-h-svh",
        )}
      >
        {/* Mobile header: stays put while the page scrolls under it */}
        <div className="sticky top-0 z-40 shrink-0 lg:hidden">
        <header className="side-surface flex h-16 items-center gap-3 px-4">
          <div className="min-w-0 flex-1">
            <Logo compact />
          </div>
          {signedIn ? (
            <Link
              to={role === "coordinator" ? "/coord" : "/volunteer"}
              className="max-w-28 shrink-0 truncate rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold text-surface"
            >
              {name}
            </Link>
          ) : (
            <Link to="/volunteer" className="shrink-0 rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold text-surface">
              อาสา
            </Link>
          )}
        </header>
        <div className="flex items-center justify-center border-b border-crit/15 bg-crit-soft px-4 py-1.5 text-xs text-ink">
          <Hotlines />
        </div>
        </div>

        {/* Desktop top bar */}
        <header className="hidden h-16 shrink-0 items-center gap-4 border-b border-line bg-surface px-6 lg:flex">
          <Hotlines className="rounded-full bg-crit-soft px-3 py-1.5 text-xs text-ink" />
          <div className="ml-auto flex items-center gap-3">
            {signedIn ? (
              <>
                {role === "coordinator" ? null : (
                  <Link to="/volunteer/tasks" className="text-sm font-semibold text-blue">
                    งานของฉัน
                  </Link>
                )}
                <div className="flex items-center gap-2.5 rounded-full border border-line py-1 pr-3 pl-1">
                  <span className="grid size-8 place-items-center rounded-full bg-linear-to-br from-purple to-blue text-sm font-bold text-surface">
                    {name.slice(0, 1)}
                  </span>
                  <span className="leading-tight">
                    <span className="block max-w-40 truncate text-sm font-semibold text-navy">{name}</span>
                    <span className="block text-[11px] text-muted">{roleLabel}</span>
                  </span>
                </div>
                <button
                  type="button"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm text-muted hover:bg-bg"
                  onClick={() => void logout()}
                >
                  <LogOut className="size-4" /> ออก
                </button>
              </>
            ) : (
              <>
                <Link to="/volunteer" className="inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold text-purple hover:bg-purple-soft">
                  สมัครอาสา
                </Link>
                <Link
                  to="/admin/login"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-navy px-4 text-sm font-semibold text-surface"
                >
                  <LogIn className="size-4" /> เข้าสู่ระบบแอดมิน
                </Link>
              </>
            )}
          </div>
        </header>

        {/* Phones scroll the whole page (smooth, no jumping address bar); desktop scrolls this column. */}
        <div
          data-bleed={bleed ? "" : undefined}
          className={cn(
            "relative z-0 flex-1",
            bleed ? "min-h-0 overflow-hidden" : "pb-[calc(4rem+env(safe-area-inset-bottom))] lg:min-h-0 lg:overflow-y-auto lg:pb-0",
          )}
        >
          {bleed ? (
            <div className="absolute inset-0">{children}</div>
          ) : (
            <div key={pathname} className="page-enter">
              {children}
            </div>
          )}
        </div>

        {/* Mobile tab bar */}
        <nav
          className={cn(
            "tabbar grid shrink-0 grid-cols-5 border-t border-line bg-surface/95 backdrop-blur lg:hidden",
            bleed ? "" : "fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md",
          )}
          aria-label="เมนูล่าง"
        >
          {TABS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: "exact" in item ? item.exact : false }}
                className="group flex min-h-16 flex-col items-center justify-center gap-1 text-xs text-muted transition active:scale-95"
                activeProps={{ className: "!text-blue font-semibold" }}
              >
                {({ isActive }) => (
                  <>
                    <span className={cn("grid h-7 w-12 place-items-center rounded-full transition", isActive ? "bg-blue-soft" : "")}>
                      <Icon className="size-5" />
                    </span>
                    {item.label}
                  </>
                )}
              </Link>
            );
          })}
          <button
            type="button"
            className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs text-muted"
            onClick={() => setOpen(true)}
            aria-label="เปิดเมนู"
          >
            <span className="grid h-7 w-12 place-items-center">
              <Menu className="size-5" />
            </span>
            เมนู
          </button>
        </nav>

        {/* Mobile drawer */}
        {open ? (
          <div className="fade-in fixed inset-0 z-50 bg-navy/50 lg:hidden" onClick={() => setOpen(false)}>
            <div
              className="side-surface drawer-in absolute top-0 right-0 flex h-full overscroll-contain w-full max-w-xs flex-col gap-5 overflow-y-auto px-4 py-4"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <Logo compact />
                <button
                  type="button"
                  className="inline-flex size-11 items-center justify-center rounded-xl text-surface hover:bg-white/10"
                  onClick={() => setOpen(false)}
                  aria-label="ปิดเมนู"
                >
                  <X className="size-5" />
                </button>
              </div>
              <SideNav onPick={() => setOpen(false)} />
              <IntelBox onPick={() => setOpen(false)} />
              <div className="mt-auto space-y-1 border-t border-side-line pt-3 text-sm">
                {role === "coordinator" ? (
                  <Link to="/coord" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-surface hover:bg-white/8">
                    <LayoutDashboard className="size-[18px]" /> ศูนย์ประสาน
                  </Link>
                ) : (
                  <Link to="/admin/login" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-mist/90 hover:bg-white/8">
                    <LogIn className="size-[18px]" /> เข้าสู่ระบบแอดมิน
                  </Link>
                )}
                {signedIn ? (
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-mist/90 hover:bg-white/8"
                    onClick={() => {
                      setOpen(false);
                      void logout();
                    }}
                  >
                    <LogOut className="size-[18px]" /> ออกจากระบบ ({name})
                  </button>
                ) : null}
                <Link to="/privacy" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-mist/70 hover:bg-white/8">
                  ความเป็นส่วนตัว
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
