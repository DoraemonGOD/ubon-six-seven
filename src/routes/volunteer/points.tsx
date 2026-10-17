// Points and rewards for volunteers: how many points they have, how they got
// them, and exchanging points for the volunteer certificate.
import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, CheckCircle2, Hand, Star } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell";
import { PageIntro, Panel, controlClass } from "@/components/ui";
import { CERT_COST, POINTS, pointsFor } from "@/lib/points";
import { useFloodStore } from "@/lib/store";

const CertificateView = lazy(() => import("@/components/certificate").then((m) => ({ default: m.CertificateView })));

export const Route = createFileRoute("/volunteer/points")({ component: Points });

function Points() {
  const ready = useFloodStore((s) => s.ready);
  const meId = useFloodStore((s) => s.activeVolunteerId);
  const me = useFloodStore((s) => s.volunteers.find((v) => v.id === s.activeVolunteerId));
  const assignments = useFloodStore((s) => s.assignments);
  const certificates = useFloodStore((s) => s.certificates);
  const redeemCertificate = useFloodStore((s) => s.redeemCertificate);
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const points = pointsFor(assignments, certificates, meId);
  const cert = certificates.find((c) => c.volunteerId === meId);
  const shortBy = Math.max(0, CERT_COST - points.balance);

  async function redeem() {
    setBusy(true);
    const result = await redeemCertificate((name ?? me?.name ?? "").trim());
    setBusy(false);
    if (result.id) toast.success("แลกเกียรติบัตรแล้ว ดาวน์โหลดหรือพิมพ์ได้เลย");
    else if (result.reason === "points") toast("แต้มยังไม่พอ");
    else toast("แลกไม่ได้ ลองใหม่อีกครั้ง");
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-lg px-4 py-4 lg:max-w-3xl">
        <PageIntro title="แต้มและเกียรติบัตร" lede="รับงานและทำงานสำเร็จเพื่อสะสมแต้ม แล้วนำมาแลกเกียรติบัตรอาสาสมัคร" icon={Award} tone="purple" />

        {!ready ? (
          <Panel>กำลังโหลด…</Panel>
        ) : !me ? (
          <Panel>
            <p className="font-semibold">เข้าสู่ระบบอาสาก่อน</p>
            <p className="mt-1 text-sm text-muted">แต้มผูกกับบัญชีอาสาของคุณ</p>
            <Link to="/volunteer" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-navy px-4 text-sm font-semibold text-surface">
              ไปหน้าอาสาสมัคร
            </Link>
          </Panel>
        ) : me.approval === "pending" ? (
          <Panel>
            <p className="font-semibold text-watch">รอแอดมินยืนยัน</p>
            <p className="mt-1 text-sm text-muted">ยืนยันแล้วถึงจะรับงานและเริ่มสะสมแต้มได้</p>
          </Panel>
        ) : (
          <div className="space-y-4">
            {/* Balance */}
            <section className="hero-surface relative overflow-hidden rounded-3xl p-5 text-surface shadow-xl shadow-navy/15">
              <p className="text-sm text-sky-100">แต้มของ {me.name}</p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="text-5xl font-bold tracking-tight">{points.balance.toLocaleString("th-TH")}</span>
                <span className="text-lg font-semibold text-sky-100">แต้ม</span>
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl bg-white/10 px-3 py-2">
                  <p className="text-sky-100">รับงาน</p>
                  <p className="text-xl font-bold">{points.taken} ครั้ง</p>
                </div>
                <div className="rounded-2xl bg-white/10 px-3 py-2">
                  <p className="text-sky-100">ทำสำเร็จ</p>
                  <p className="text-xl font-bold">{points.finished} ครั้ง</p>
                </div>
              </div>
            </section>

            {/* How to earn */}
            <Panel>
              <h2 className="font-semibold">ได้แต้มจากอะไร</h2>
              <ul className="mt-3 space-y-2">
                <Rule icon={<Hand className="size-5" />} label="รับงานช่วยเหลือ" points={POINTS.take} />
                <Rule icon={<CheckCircle2 className="size-5" />} label="ทำงานสำเร็จ (ปิดงานแล้ว)" points={POINTS.finish} />
              </ul>
              <Link to="/volunteer/tasks" className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-blue">
                ดูงานของฉัน →
              </Link>
            </Panel>

            {/* Reward */}
            <Panel>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">เกียรติบัตรอาสาสมัคร</h2>
                  <p className="text-sm text-muted">ใส่ชื่อของคุณให้อัตโนมัติ ดาวน์โหลดหรือพิมพ์ได้</p>
                </div>
                <span className="shrink-0 rounded-full bg-purple-soft px-3 py-1 text-sm font-semibold text-purple">
                  {CERT_COST === 0 ? "ฟรี · 0 แต้ม" : `${CERT_COST} แต้ม`}
                </span>
              </div>
              {cert ? (
                <div className="mt-4 space-y-2">
                  <Suspense fallback={<p className="text-sm text-muted">กำลังโหลด…</p>}>
                    <CertificateView cert={cert} />
                  </Suspense>
                  <p className="text-xs text-muted">
                    เลขที่ {cert.ref}
                    {cert.issuedBy === "coordinator" ? " · ออกโดยผู้ประสาน" : ""}
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold">ชื่อ-นามสกุลบนเกียรติบัตร</span>
                    <input className={controlClass} value={name ?? me.name} onChange={(e) => setName(e.target.value)} maxLength={80} />
                  </label>
                  <button
                    type="button"
                    disabled={busy || shortBy > 0 || !(name ?? me.name).trim()}
                    onClick={() => void redeem()}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-purple text-sm font-semibold text-surface shadow-sm transition active:scale-[0.99] disabled:opacity-50"
                  >
                    <Award className="size-4" />
                    {shortBy > 0 ? `ต้องมีอีก ${shortBy} แต้ม` : busy ? "กำลังแลก…" : `แลกเกียรติบัตร (ใช้ ${CERT_COST} แต้ม)`}
                  </button>
                  <p className="text-xs text-muted">ตรวจชื่อให้ถูกก่อนกด แลกได้คนละ 1 ใบ</p>
                </div>
              )}
            </Panel>

            {/* History */}
            <Panel>
              <h2 className="font-semibold">ประวัติแต้ม</h2>
              {points.lines.length === 0 ? (
                <p className="mt-2 text-sm text-muted">ยังไม่มีแต้ม รับงานแรกเพื่อเริ่มสะสม</p>
              ) : (
                <ul className="mt-2 divide-y divide-line">
                  {points.lines.map((line, i) => (
                    <li key={`${line.requestId}-${line.label}-${i}`} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{line.label}</span>
                        <span className="text-xs text-muted">
                          {line.requestId} · {new Date(line.at).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold text-ok">+{line.points}</span>
                    </li>
                  ))}
                  {cert && cert.cost > 0 ? (
                    <li className="flex items-center justify-between py-2.5">
                      <span className="text-sm font-medium">แลกเกียรติบัตร</span>
                      <span className="font-semibold text-crit">−{cert.cost}</span>
                    </li>
                  ) : null}
                </ul>
              )}
            </Panel>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Rule({ icon, label, points }: { icon: React.ReactNode; label: string; points: number }) {
  return (
    <li className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-purple-soft text-purple">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <span className="inline-flex items-center gap-1 font-semibold text-purple">
        <Star className="size-4" />+{points}
      </span>
    </li>
  );
}
