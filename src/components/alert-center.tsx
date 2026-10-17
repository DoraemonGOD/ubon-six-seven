// Urgent pop-up for coordinators: every new help request or volunteer sign-up
// that arrives through polling shows here, on any page, until acknowledged.
import { Link } from "@tanstack/react-router";
import { BellRing, DatabaseZap, MapPin, Siren, UserPlus, Users, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { PRIORITY_LABEL, TYPE_LABEL, districtById, type HelpRequest } from "@/lib/model";
import { useFloodStore, type OpsAlert } from "@/lib/store";

const URGENT = new Set(["critical", "high"]);

function beep(urgent: boolean) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const tones = urgent ? [880, 660, 880, 660] : [740, 990];
    tones.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.22;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.21);
    });
    window.setTimeout(() => void ctx.close(), tones.length * 260 + 200);
  } catch {
    /* sound is optional */
  }
}

function readMuted() {
  try {
    return window.localStorage.getItem("ufc_alert_muted") === "1";
  } catch {
    return false;
  }
}

function notify(alert: OpsAlert) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (alert.kind === "request") {
      const r = alert.request;
      new Notification(`คำร้องใหม่ ${PRIORITY_LABEL[r.priority]} · ${TYPE_LABEL[r.type]}`, {
        body: `${districtById(r.districtId)?.name ?? ""} · ${r.placeLabel} · ${r.people} คน`,
        tag: alert.key,
      });
    } else {
      new Notification("อาสาสมัครใหม่รอยืนยัน", { body: alert.volunteer.name, tag: alert.key });
    }
  } catch {
    /* optional */
  }
}

export function AlertCenter() {
  const role = useFloodStore((s) => s.role);
  const alerts = useFloodStore((s) => s.alerts);
  const storage = useFloodStore((s) => s.storage);
  const hosted = useFloodStore((s) => s.hosted);
  const dismiss = useFloodStore((s) => s.dismissAlert);
  const dismissAll = useFloodStore((s) => s.dismissAll);
  const [muted, setMuted] = useState(false);
  const [perm, setPerm] = useState<string>("unsupported");
  const heard = useRef(new Set<string>());

  useEffect(() => {
    setMuted(readMuted());
    if (typeof Notification !== "undefined") setPerm(Notification.permission);
  }, []);

  // Sound + system notification once per new alert.
  useEffect(() => {
    const fresh = alerts.filter((a) => !heard.current.has(a.key));
    if (!fresh.length) return;
    fresh.forEach((a) => heard.current.add(a.key));
    const urgent = fresh.some((a) => a.kind === "request" && URGENT.has(a.request.priority));
    if (!muted) beep(urgent);
    if (document.visibilityState !== "visible") fresh.forEach(notify);
  }, [alerts, muted]);

  // Flash the tab title while anything is unacknowledged.
  useEffect(() => {
    if (!alerts.length) return;
    const original = document.title;
    let on = false;
    const timer = window.setInterval(() => {
      on = !on;
      document.title = on ? `(${alerts.length}) 🚨 เรื่องใหม่เข้า` : original;
    }, 1000);
    return () => {
      window.clearInterval(timer);
      document.title = original;
    };
  }, [alerts.length]);

  if (role !== "coordinator") return null;

  const dbWarning = storage === "temporary" && hosted;
  const [top, ...rest] = alerts;

  return (
    <>
      {dbWarning ? (
        <div className="fixed inset-x-0 bottom-0 z-[60] bg-crit px-4 py-2 text-center text-sm text-surface md:bottom-auto md:top-0" role="alert">
          <DatabaseZap className="mr-1 inline size-4 align-[-3px]" />
          เว็บยังไม่ได้ต่อฐานข้อมูล: คำร้องและใบสมัครจากเครื่องอื่นจะไม่ขึ้นที่นี่ ใส่ <b>DATABASE_URL</b> ใน Vercel แล้ว Redeploy
        </div>
      ) : null}

      {top ? (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center p-3 md:top-4 md:right-4 md:left-auto md:w-[420px] md:p-0">
          <div className="pointer-events-auto w-full max-w-md">
            <AlertCard alert={top} onClose={() => dismiss(top.key)} />
            {rest.length ? (
              <div className="mt-2 rounded-2xl bg-navy/95 p-2 text-surface shadow-xl">
                <div className="flex items-center justify-between px-2 py-1 text-xs text-mist">
                  <span>รออีก {rest.length} เรื่อง</span>
                  <button type="button" className="underline" onClick={dismissAll}>
                    รับทราบทั้งหมด
                  </button>
                </div>
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {rest.slice(0, 6).map((a) => (
                    <li key={a.key} className="flex items-center gap-2 rounded-xl bg-white/8 px-2 py-1.5 text-xs">
                      {a.kind === "request" ? <Siren className="size-3.5 shrink-0 text-[#ffb4a8]" /> : <UserPlus className="size-3.5 shrink-0 text-[#c9b8ff]" />}
                      <span className="min-w-0 flex-1 truncate">
                        {a.kind === "request"
                          ? `${PRIORITY_LABEL[a.request.priority]} · ${TYPE_LABEL[a.request.type]} · ${districtById(a.request.districtId)?.name ?? ""}`
                          : `อาสาใหม่ · ${a.volunteer.name}`}
                      </span>
                      <button type="button" aria-label="รับทราบ" onClick={() => dismiss(a.key)} className="text-mist hover:text-surface">
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="mt-2 flex justify-end gap-2 text-xs">
              <button
                type="button"
                className="rounded-full bg-surface/95 px-3 py-1 text-muted shadow"
                onClick={() => {
                  const next = !muted;
                  setMuted(next);
                  try {
                    window.localStorage.setItem("ufc_alert_muted", next ? "1" : "0");
                  } catch {
                    /* ignore */
                  }
                }}
              >
                {muted ? <VolumeX className="mr-1 inline size-3.5" /> : <Volume2 className="mr-1 inline size-3.5" />}
                {muted ? "เปิดเสียง" : "ปิดเสียง"}
              </button>
              {perm === "default" ? (
                <button
                  type="button"
                  className="rounded-full bg-surface/95 px-3 py-1 text-muted shadow"
                  onClick={() => void Notification.requestPermission().then(setPerm)}
                >
                  <BellRing className="mr-1 inline size-3.5" />
                  แจ้งเตือนบนเครื่อง
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function AlertCard({ alert, onClose }: { alert: OpsAlert; onClose: () => void }) {
  if (alert.kind === "volunteer") {
    const v = alert.volunteer;
    return (
      <div className="alert-pop overflow-hidden rounded-2xl border-2 border-purple bg-surface shadow-2xl" role="alert">
        <div className="flex items-center gap-2 bg-purple px-4 py-2 text-sm font-semibold text-surface">
          <Users className="size-4" /> อาสาสมัครใหม่ รอยืนยัน
          <button type="button" aria-label="ปิด" onClick={onClose} className="ml-auto opacity-80 hover:opacity-100">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-lg font-semibold text-navy">{v.name}</p>
          <p className="mt-1 text-sm text-muted">
            {v.kind === "student" ? "นักศึกษา" : "อาสาสมัคร"} · {v.districtIds.map((id) => districtById(id)?.name).filter(Boolean).join(", ")}
          </p>
          <div className="mt-3 flex gap-2">
            <Link to="/coord" hash="volunteers" onClick={onClose} className="flex-1 rounded-xl bg-purple px-3 py-2.5 text-center text-sm font-semibold text-surface">
              ไปยืนยันอาสา
            </Link>
            <button type="button" onClick={onClose} className="rounded-xl border border-line px-4 py-2.5 text-sm">
              รับทราบ
            </button>
          </div>
        </div>
      </div>
    );
  }
  const r: HelpRequest = alert.request;
  const urgent = URGENT.has(r.priority);
  return (
    <div
      className={cn("alert-pop overflow-hidden rounded-2xl border-2 bg-surface shadow-2xl", urgent ? "alert-urgent border-crit" : "border-orange")}
      role="alertdialog"
      aria-label="คำร้องใหม่"
    >
      <div className={cn("flex items-center gap-2 px-4 py-2 text-sm font-semibold text-surface", urgent ? "bg-crit" : "bg-orange")}>
        <span className="grid size-6 place-items-center rounded-full bg-white/20">
          <Siren className="size-4 animate-pulse" />
        </span>
        {urgent ? "เหตุด่วน! มีคำร้องใหม่เข้ามา" : "มีคำร้องใหม่เข้ามา"}
        <button type="button" aria-label="ปิด" onClick={onClose} className="ml-auto opacity-80 hover:opacity-100">
          <X className="size-4" />
        </button>
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", urgent ? "bg-crit-soft text-crit" : "bg-orange-soft text-orange")}>
            {PRIORITY_LABEL[r.priority]}
          </span>
          <span className="text-xs text-muted">{r.id}</span>
        </div>
        <p className="mt-2 text-lg leading-snug font-semibold text-navy">{TYPE_LABEL[r.type]}</p>
        <p className="mt-1 flex items-start gap-1 text-sm text-ink">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted" />
          <span>
            {districtById(r.districtId)?.name ?? ""} · {r.placeLabel} · {r.people} คน
          </span>
        </p>
        {r.detail || r.publicDetail ? <p className="mt-1 line-clamp-2 text-sm text-muted">{r.detail || r.publicDetail}</p> : null}
        <div className="mt-3 flex gap-2">
          <Link
            to="/coord/requests/$id"
            params={{ id: r.id }}
            onClick={onClose}
            className={cn("flex-1 rounded-xl px-3 py-2.5 text-center text-sm font-semibold text-surface", urgent ? "bg-crit" : "bg-orange")}
          >
            เปิดคำร้อง
          </Link>
          <button type="button" onClick={onClose} className="rounded-xl border border-line px-4 py-2.5 text-sm">
            รับทราบ
          </button>
        </div>
      </div>
    </div>
  );
}
