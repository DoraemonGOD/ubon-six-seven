import { useRouterState } from "@tanstack/react-router";
import {
  Activity,
  FileSearch,
  House,
  Info,
  LayoutDashboard,
  Lock,
  Map,
  Megaphone,
  Package,
  ShieldCheck,
  Siren,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ tones */

/** One color family per kind of thing, used the same way on every page. */
export const TONES = {
  red: { solid: "bg-crit text-surface", soft: "bg-crit-soft", text: "text-crit", from: "from-crit-soft" },
  blue: { solid: "bg-blue text-surface", soft: "bg-blue-soft", text: "text-blue", from: "from-blue-soft" },
  purple: { solid: "bg-purple text-surface", soft: "bg-purple-soft", text: "text-purple", from: "from-purple-soft" },
  orange: { solid: "bg-orange text-surface", soft: "bg-orange-soft", text: "text-orange", from: "from-orange-soft" },
  teal: { solid: "bg-teal text-surface", soft: "bg-teal-soft", text: "text-teal", from: "from-teal-soft" },
  sky: { solid: "bg-sky text-surface", soft: "bg-sky-soft", text: "text-sky", from: "from-sky-soft" },
  indigo: { solid: "bg-indigo text-surface", soft: "bg-indigo-soft", text: "text-indigo", from: "from-indigo-soft" },
  green: { solid: "bg-ok text-surface", soft: "bg-ok-soft", text: "text-ok", from: "from-ok-soft" },
  amber: { solid: "bg-watch text-surface", soft: "bg-watch-soft", text: "text-watch", from: "from-watch-soft" },
} as const;
export type Tone = keyof typeof TONES;

/** Each section of the site keeps its own icon and color. */
export const SECTIONS: { prefix: string; icon: LucideIcon; tone: Tone }[] = [
  { prefix: "/help/track", icon: FileSearch, tone: "sky" },
  { prefix: "/help", icon: Siren, tone: "red" },
  { prefix: "/report", icon: Megaphone, tone: "blue" },
  { prefix: "/volunteer", icon: Users, tone: "purple" },
  { prefix: "/supplies", icon: Package, tone: "orange" },
  { prefix: "/shelters", icon: House, tone: "teal" },
  { prefix: "/map", icon: Map, tone: "sky" },
  { prefix: "/situation", icon: Activity, tone: "indigo" },
  { prefix: "/coord", icon: LayoutDashboard, tone: "blue" },
  { prefix: "/admin", icon: Lock, tone: "indigo" },
  { prefix: "/privacy", icon: ShieldCheck, tone: "teal" },
  { prefix: "/about", icon: Info, tone: "blue" },
];

export function sectionFor(path: string) {
  return SECTIONS.find((item) => path.startsWith(item.prefix));
}

export function IconBadge({ icon: Icon, tone, size = "md" }: { icon: LucideIcon; tone: Tone; size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "size-14 rounded-2xl" : size === "sm" ? "size-9 rounded-xl" : "size-11 rounded-xl";
  const glyph = size === "lg" ? "size-7" : size === "sm" ? "size-4" : "size-5";
  return (
    <span className={cn("inline-grid shrink-0 place-items-center", box, TONES[tone].soft, TONES[tone].text)} aria-hidden>
      <Icon className={glyph} strokeWidth={2.2} />
    </span>
  );
}

/* ---------------------------------------------------------------- buttons */

const buttonStyles = {
  primary: "bg-blue text-surface shadow-sm shadow-blue/30",
  danger: "bg-crit text-surface shadow-sm shadow-crit/30",
  ghost: "bg-transparent text-ink",
  soft: "bg-blue-soft text-blue",
  navy: "bg-navy text-surface",
} as const;

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonStyles }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition hover:brightness-105 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:opacity-50",
        buttonStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ pills */

const pillStyles = {
  ok: "bg-ok-soft text-ok",
  watch: "bg-watch-soft text-watch",
  hit: "bg-hit-soft text-hit",
  crit: "bg-crit-soft text-crit",
  info: "bg-blue-soft text-blue",
  muted: "bg-bg text-muted",
} as const;

export function Pill({ tone, children }: { tone: keyof typeof pillStyles; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", pillStyles[tone])}>
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ forms */

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="block">
      <span className="mb-1.5 block text-sm font-semibold text-navy">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs leading-relaxed text-muted">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs font-medium text-crit">{error}</span> : null}
    </div>
  );
}

export const controlClass =
  "min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink outline-none transition focus:border-blue focus:ring-4 focus:ring-blue/10";

/* ----------------------------------------------------------------- layout */

/**
 * Page heading. It picks the section's icon and color from the URL, so every
 * page gets the same treatment without passing anything extra.
 */
export function PageIntro({ title, lede, icon, tone }: { title: string; lede?: string; icon?: LucideIcon; tone?: Tone }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const section = sectionFor(path);
  const Icon = icon ?? section?.icon ?? Info;
  const color = tone ?? section?.tone ?? "blue";
  return (
    <header className={cn("card mb-5 flex items-start gap-4 bg-linear-to-br to-surface p-4 lg:p-5", TONES[color].from)}>
      <span className={cn("inline-grid size-12 shrink-0 place-items-center rounded-2xl shadow-sm", TONES[color].solid)} aria-hidden>
        <Icon className="size-6" strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-balance text-navy lg:text-2xl">{title}</h1>
        {lede ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{lede}</p> : null}
      </div>
    </header>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("card p-4", className)}>{children}</section>;
}

/** A number with its label and a colored icon, for summary rows. */
export function StatCard({
  icon,
  tone,
  label,
  value,
  note,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: ReactNode;
  note?: string;
}) {
  return (
    <div className="card flex items-center gap-3 p-3.5 lg:p-4">
      <IconBadge icon={icon} tone={tone} />
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted">{label}</p>
        <p className="text-2xl leading-tight font-semibold tabular-nums text-navy">{value}</p>
        {note ? <p className="truncate text-[11px] text-muted">{note}</p> : null}
      </div>
    </div>
  );
}
