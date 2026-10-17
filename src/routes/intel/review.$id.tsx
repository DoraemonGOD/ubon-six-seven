// One incident: decide (true / need info / not real), then send a team in one
// tap. Category and urgency edits, suggestions and history sit under "more".
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Check, ChevronDown, HelpCircle, Lightbulb, Phone, Send, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Pill, controlClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import { createIntelMission, getIntelAssignees, getIntelIncident, reviewIntelIncident, updateIntelMission } from "@/lib/intel/fns";
import { CATEGORY_LABEL, MISSION_LABEL, URGENCY_LABEL, VERIFY_LABEL } from "@/lib/intel/labels";
import { CATEGORIES, URGENCIES } from "@/lib/intel/policy";

export const Route = createFileRoute("/intel/review/$id")({
  loader: ({ params }) => getIntelIncident({ data: { id: params.id } }),
  component: ReviewOne,
});

type Data = Extract<Awaited<ReturnType<typeof getIntelIncident>>, { ok: true }>;
type Action = Parameters<typeof reviewIntelIncident>[0]["data"]["action"];

const VERIFY_TONE: Record<string, "ok" | "watch" | "info" | "muted"> = {
  verified: "ok",
  unverified: "watch",
  needs_more_information: "info",
  rejected: "muted",
};

function ReviewOne() {
  const data = Route.useLoaderData();
  if (!data.ok) return <p className="text-sm">ไม่พบรายงานนี้ หรืออยู่นอกพื้นที่ที่ได้รับอนุญาต</p>;
  return <Review data={data} />;
}

function Review({ data }: { data: Data }) {
  const router = useRouter();
  const item = data.incident;
  const openMission = data.missions.find((m) => m.status !== "completed" && m.status !== "cancelled");

  async function run(action: Action, extra: { reason?: string; intoId?: string; category?: string; urgency?: string; summary?: string } = {}) {
    const result = await reviewIntelIncident({
      data: {
        id: item.id,
        action,
        reason: extra.reason ?? "",
        category: extra.category ?? item.category,
        urgency: extra.urgency ?? item.urgency,
        summary: extra.summary ?? item.summary,
        intoId: extra.intoId,
      },
    });
    if (!result.ok) {
      toast(result.reason === "need_reason" ? "ใส่เหตุผลสั้น ๆ ก่อน" : "ทำไม่ได้");
      return false;
    }
    await router.invalidate();
    return true;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link to="/intel/review" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-blue">
        <ArrowLeft className="size-4" /> รายการทั้งหมด
      </Link>

      <section className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={VERIFY_TONE[item.verification] ?? "muted"}>{VERIFY_LABEL[item.verification] ?? item.verification}</Pill>
          <span className="text-xs text-muted">
            {CATEGORY_LABEL[item.category] ?? item.category} · {URGENCY_LABEL[item.urgency] ?? item.urgency} · {item.isDemo ? "ข้อมูลสาธิต" : "ส่งเข้ามาจริง"}
          </span>
        </div>
        <h1 className="text-xl font-semibold text-navy">{item.summary}</h1>
        <p className="rounded-xl bg-bg px-3 py-2.5 text-sm leading-relaxed">{item.originalText}</p>
        <p className="text-sm text-muted">
          อ.{item.districtName}
          {item.tambon ? ` · ${item.tambon}` : ""} · {item.placeLabel}
          {item.people != null ? ` · ${item.people} คน` : ""}
          {item.locationMasked ? " · จุดถูกเบลอเป็นระดับอำเภอ" : ""}
        </p>
        {item.phone ? (
          <a href={`tel:${item.phone}`} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ok text-sm font-semibold text-surface">
            <Phone className="size-4" /> โทรหาผู้แจ้ง {item.phone}
          </a>
        ) : null}
        {item.mergedInto ? <p className="text-sm text-watch">รวมเข้ากับ {item.mergedInto} แล้ว ต้นฉบับยังเก็บไว้</p> : null}
      </section>

      {data.canReview && !item.mergedInto ? (
        item.verification === "verified" ? (
          <SendTeam
            incidentId={item.id}
            districtId={item.districtId}
            mission={openMission ? { id: openMission.id, status: openMission.status, assigneeId: openMission.assigneeId } : null}
          />
        ) : (
          <Decide run={run} current={item.verification} />
        )
      ) : null}

      {data.canReview && data.suggestions.some((s) => s.status === "pending_review") ? (
        <section className="card p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-navy">
            <Lightbulb className="size-4 text-teal" /> ระบบแนะนำ (จากกฎคีย์เวิร์ด ไม่ใช่ AI)
          </p>
          {data.suggestions
            .filter((s) => s.status === "pending_review")
            .slice(0, 1)
            .map((s) => (
              <div key={s.id} className="mt-2 space-y-2 text-sm">
                <p>
                  หมวด <b>{CATEGORY_LABEL[s.category] ?? s.category}</b> · ความเร่งด่วน <b>{URGENCY_LABEL[s.urgency] ?? s.urgency}</b>
                </p>
                {s.missingInfo ? <p className="text-muted">ข้อมูลที่ยังขาด: {s.missingInfo}</p> : null}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void run("accept_suggestion").then((ok) => ok && toast("ใช้ตามที่ระบบแนะนำแล้ว"))}
                    className="min-h-10 flex-1 rounded-xl bg-teal text-sm font-semibold text-surface"
                  >
                    ใช้ตามนี้
                  </button>
                  <button
                    type="button"
                    onClick={() => void run("reject_suggestion", { reason: "ผู้ตรวจไม่ใช้ข้อเสนอ" }).then((ok) => ok && toast("ไม่ใช้ข้อเสนอนี้"))}
                    className="min-h-10 rounded-xl border border-line px-4 text-sm font-semibold text-muted"
                  >
                    ไม่ใช้
                  </button>
                </div>
              </div>
            ))}
        </section>
      ) : null}

      {data.duplicates.length > 0 && data.canReview ? (
        <section className="card p-4">
          <p className="text-sm font-semibold text-navy">อาจเป็นเรื่องเดียวกับรายงานเหล่านี้</p>
          <ul className="mt-2 space-y-2">
            {data.duplicates.map((dup) => (
              <li key={dup.id} className="flex items-center gap-3 rounded-xl bg-bg p-3 text-sm">
                <span className="min-w-0 flex-1">
                  {dup.summary}
                  <span className="block text-xs text-muted">{VERIFY_LABEL[dup.verification] ?? dup.verification}</span>
                </span>
                <button
                  type="button"
                  onClick={() => void run("merge", { intoId: dup.id }).then((ok) => ok && toast("รวมเป็นเรื่องเดียวกันแล้ว"))}
                  className="min-h-10 shrink-0 rounded-xl bg-navy px-3 text-xs font-semibold text-surface"
                >
                  รวมเป็นเรื่องเดียวกัน
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <details className="card group p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-navy">
          แก้หมวด ความเร่งด่วน และดูประวัติ
          <ChevronDown className="size-4 transition group-open:rotate-180" />
        </summary>
        <div className="mt-3 space-y-4">
          {data.canReview ? <EditBox item={item} run={run} /> : null}
          {data.missions.length ? (
            <div>
              <p className="text-xs font-semibold text-muted">ภารกิจ</p>
              <ul className="mt-1 space-y-1 text-sm">
                {data.missions.map((m) => (
                  <li key={m.id}>
                    {m.title} · {MISSION_LABEL[m.status] ?? m.status}
                    {m.fieldNote ? ` · ${m.fieldNote}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {data.history.length ? (
            <ol className="space-y-2 border-l-2 border-line pl-4 text-xs text-muted">
              {data.history.map((row) => (
                <li key={row.id}>
                  {new Date(row.at).toLocaleString("th-TH")} · {row.detail || row.action}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </details>
    </div>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="fade-in rounded-2xl border-2 border-blue/40 bg-blue-soft/50 p-4">
      <p className="text-xs font-semibold tracking-wide text-blue">ขั้นต่อไป</p>
      <h2 className="mt-0.5 text-lg font-semibold text-navy">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Decide({ run, current }: { run: (a: Action, e?: { reason?: string }) => Promise<boolean>; current: string }) {
  const [asking, setAsking] = useState<null | "needs_info" | "reject">(null);
  const [reason, setReason] = useState("");
  return (
    <Card
      title="เรื่องนี้จริงไหม"
      hint={current === "needs_more_information" ? "รอข้อมูลเพิ่มอยู่ ถ้าได้ข้อมูลครบแล้วกดยืนยันได้เลย" : "อ่านข้อความ โทรถามถ้าจำเป็น แล้วเลือกหนึ่งข้อ"}
    >
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => void run("verify").then((ok) => ok && toast("ยืนยันแล้ว เลือกทีมต่อได้เลย"))}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-ok text-sm font-semibold text-surface shadow-sm transition active:scale-[0.98]"
        >
          <Check className="size-4" /> จริง ยืนยันรายงาน
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={asking === "needs_info"}
            onClick={() => setAsking(asking === "needs_info" ? null : "needs_info")}
            className={cn(
              "inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold",
              asking === "needs_info" ? "border-sky bg-sky-soft text-sky" : "border-line bg-surface text-ink",
            )}
          >
            <HelpCircle className="size-4" /> ขอข้อมูลเพิ่ม
          </button>
          <button
            type="button"
            aria-pressed={asking === "reject"}
            onClick={() => setAsking(asking === "reject" ? null : "reject")}
            className={cn(
              "inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold",
              asking === "reject" ? "border-crit bg-crit-soft text-crit" : "border-line bg-surface text-ink",
            )}
          >
            <X className="size-4" /> ไม่ใช่เหตุจริง
          </button>
        </div>
        {asking ? (
          <div className="fade-in flex gap-2">
            <input
              autoFocus
              className={controlClass}
              placeholder={asking === "reject" ? "เหตุผลสั้น ๆ เช่น ข้อมูลปลอม" : "ต้องการข้อมูลอะไรเพิ่ม"}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <button
              type="button"
              onClick={() =>
                void run(asking, { reason }).then((ok) => {
                  if (ok) {
                    toast(asking === "reject" ? "บันทึกว่าไม่ใช่เหตุจริง" : "บันทึกว่าขอข้อมูลเพิ่ม");
                    setAsking(null);
                    setReason("");
                  }
                })
              }
              className="min-h-11 shrink-0 rounded-xl bg-navy px-4 text-sm font-semibold text-surface"
            >
              บันทึก
            </button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function SendTeam({
  incidentId,
  districtId,
  mission,
}: {
  incidentId: string;
  districtId: string;
  mission: { id: string; status: string; assigneeId: string | null } | null;
}) {
  const router = useRouter();
  const [people, setPeople] = useState<{ id: string; displayName: string }[] | null>(null);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let alive = true;
    void getIntelAssignees({ data: { districtId } }).then((r) => alive && setPeople(r.ok ? r.items : []));
    return () => {
      alive = false;
    };
  }, [districtId]);

  async function give(personId: string, name: string) {
    setBusy(personId);
    let missionId = mission?.id;
    if (!missionId) {
      const made = await createIntelMission({ data: { incidentId } });
      if (!made.ok) {
        setBusy("");
        toast("เปิดภารกิจไม่ได้");
        return;
      }
      missionId = made.id;
    }
    const result = await updateIntelMission({ data: { id: missionId, assigneeId: personId } });
    setBusy("");
    if (!result.ok) {
      toast("มอบงานไม่ได้");
      return;
    }
    toast(`มอบภารกิจให้ ${name} แล้ว`);
    await router.invalidate();
  }

  const assigned = mission?.assigneeId ? people?.find((p) => p.id === mission.assigneeId) : null;

  return (
    <Card
      title={mission?.assigneeId ? "ภารกิจมอบแล้ว" : "ส่งทีมไปช่วย"}
      hint={
        mission?.assigneeId
          ? `สถานะ: ${MISSION_LABEL[mission.status] ?? mission.status}${assigned ? ` · ${assigned.displayName}` : ""} ติดตามต่อในหน้าภารกิจ`
          : "รายชื่อคืออาสาที่ยืนยันแล้วและรับพื้นที่นี้ กดชื่อเดียวก็มอบงานได้"
      }
    >
      {people === null ? (
        <p className="text-sm text-muted">กำลังโหลดทีมในพื้นที่…</p>
      ) : people.length === 0 ? (
        <p className="text-sm text-muted">ยังไม่มีอาสาที่รับพื้นที่นี้ ไปยืนยันอาสาและกำหนดพื้นที่ในหน้าทีมอาสาสมัคร</p>
      ) : (
        <ul className="space-y-2">
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
              <span className="grid size-9 place-items-center rounded-full bg-purple-soft font-semibold text-purple">{p.displayName.slice(0, 1)}</span>
              <span className="min-w-0 flex-1 truncate font-semibold text-navy">{p.displayName}</span>
              {mission?.assigneeId === p.id ? (
                <span className="rounded-full bg-ok-soft px-3 py-1 text-xs font-semibold text-ok">รับงานอยู่</span>
              ) : (
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void give(p.id, p.displayName)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-blue px-3 text-sm font-semibold text-surface transition active:scale-95 disabled:opacity-60"
                >
                  <Send className="size-3.5" /> {busy === p.id ? "กำลังมอบ…" : mission?.assigneeId ? "เปลี่ยนเป็นคนนี้" : "มอบภารกิจ"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {mission?.assigneeId ? (
        <Link to="/intel/missions" className="mt-3 inline-flex text-sm font-semibold text-blue">
          ไปหน้าภารกิจ →
        </Link>
      ) : null}
    </Card>
  );
}

function EditBox({
  item,
  run,
}: {
  item: { summary: string; category: string; urgency: string };
  run: (a: Action, e?: { category?: string; urgency?: string; summary?: string }) => Promise<boolean>;
}) {
  const [summary, setSummary] = useState(item.summary);
  const [category, setCategory] = useState(item.category);
  const [urgency, setUrgency] = useState(item.urgency);
  return (
    <div className="space-y-2">
      <label className="block text-xs text-muted">
        สรุปสั้น
        <input className={cn(controlClass, "mt-1")} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs text-muted">
          หมวด
          <select className={cn(controlClass, "mt-1")} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-muted">
          ความเร่งด่วน
          <select className={cn(controlClass, "mt-1")} value={urgency} onChange={(e) => setUrgency(e.target.value)}>
            {URGENCIES.map((u) => (
              <option key={u} value={u}>
                {URGENCY_LABEL[u]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="button"
        onClick={() => void run("edit", { summary, category, urgency }).then((ok) => ok && toast("บันทึกการแก้แล้ว"))}
        className="min-h-10 rounded-xl bg-navy px-4 text-sm font-semibold text-surface"
      >
        บันทึกการแก้
      </button>
    </div>
  );
}
