import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button, controlClass } from "@/components/ui";
import { createIntelMission, getIntelAssignees, getIntelIncident, reviewIntelIncident, updateIntelMission } from "@/lib/intel/fns";
import { CATEGORY_LABEL, MISSION_LABEL, URGENCY_LABEL, VERIFY_LABEL } from "@/lib/intel/labels";
import { CATEGORIES, URGENCIES } from "@/lib/intel/policy";

export const Route = createFileRoute("/intel/review/$id")({
  loader: ({ params }) => getIntelIncident({ data: { id: params.id } }),
  component: ReviewOne,
});

function ReviewOne() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [summary, setSummary] = useState(data.ok ? data.incident.summary : "");
  const [category, setCategory] = useState(data.ok ? data.incident.category : "other");
  const [urgency, setUrgency] = useState(data.ok ? data.incident.urgency : "unknown");
  if (!data.ok) return <p className="text-sm">ไม่พบรายงานนี้ หรืออยู่นอกพื้นที่ที่ได้รับอนุญาต</p>;
  const item = data.incident;

  async function run(action: Parameters<typeof reviewIntelIncident>[0]["data"]["action"], extra?: { intoId?: string }) {
    const result = await reviewIntelIncident({
      data: { id: item.id, action, reason, category, urgency, summary, intoId: extra?.intoId },
    });
    if (!result.ok) {
      toast(result.reason === "need_reason" ? "ใส่เหตุผลก่อน" : "ทำไม่ได้");
      return;
    }
    toast("บันทึกแล้ว");
    await router.invalidate();
  }

  return (
    <div className="space-y-4">
      <Link to="/intel/review" className="text-sm text-blue">
        กลับรายการ
      </Link>
      <div>
        <p className="text-xs text-muted">
          {VERIFY_LABEL[item.verification]} · {item.isDemo ? "ข้อมูลสาธิต" : "รายงานที่ส่งเข้ามา"} · อัปเดต {item.updatedAt}
        </p>
        <h1 className="mt-1 text-xl font-medium text-navy">{item.summary}</h1>
        <p className="mt-2 text-sm leading-relaxed">{item.originalText}</p>
        <p className="mt-2 text-sm text-muted">
          {item.districtName}
          {item.tambon ? ` · ${item.tambon}` : ""} · {item.placeLabel}
          {item.people != null ? ` · ${item.people} คน` : ""}
          {item.locationMasked ? " · จุดถูกเบลอเป็นระดับอำเภอ" : ` · ความละเอียด ${item.precision}`}
        </p>
        {item.phone ? <p className="mt-1 text-sm">เบอร์สำหรับผู้ดูแล: {item.phone}</p> : null}
        {item.mergedInto ? <p className="mt-1 text-sm text-watch">รวมเข้ากับ {item.mergedInto} แล้ว ต้นฉบับยังอยู่</p> : null}
      </div>

      <section className="border border-line bg-blue-soft p-3">
        <h2 className="text-sm font-medium text-navy">ข้อเสนออัตโนมัติ ไม่ใช่ข้อเท็จจริง</h2>
        {data.suggestions.length === 0 ? <p className="mt-2 text-sm text-muted">ยังไม่มีข้อเสนอ</p> : null}
        {data.suggestions.map((sug) => (
          <div key={sug.id} className="mt-2 text-sm">
            <p>
              {CATEGORY_LABEL[sug.category]} · {URGENCY_LABEL[sug.urgency]} · {sug.status}
            </p>
            <p className="mt-1 text-muted">{sug.reason}</p>
            {sug.missingInfo ? <p className="mt-1">ข้อมูลที่ยังขาด: {sug.missingInfo}</p> : null}
            {sug.duplicateOf ? <p className="mt-1">อาจซ้ำกับ {sug.duplicateOf}</p> : null}
            <p className="mt-1 text-xs">ตัวสร้าง: {sug.modelLabel}</p>
          </div>
        ))}
      </section>

      {data.duplicates.length > 0 ? (
        <section>
          <h2 className="text-sm font-medium text-navy">รายงานที่อาจซ้ำในอำเภอเดียวกัน</h2>
          <ul className="mt-2 text-sm">
            {data.duplicates.map((dup) => (
              <li key={dup.id} className="flex items-center justify-between gap-2 border-b border-line py-2">
                <span>
                  {dup.summary} · {VERIFY_LABEL[dup.verification] ?? dup.verification}
                </span>
                {data.canReview ? (
                  <Button
                    onClick={() => {
                      void run("merge", { intoId: dup.id });
                    }}
                  >
                    อนุมัติการรวม
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.canReview ? (
        <section className="space-y-3 border border-line p-3">
          <h2 className="text-sm font-medium text-navy">คำตัดสินของคน</h2>
          <label className="block text-xs text-muted">
            หมวด
            <select className={controlClass} value={category} onChange={(event) => setCategory(event.target.value)}>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {CATEGORY_LABEL[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-muted">
            ความเร่งด่วน
            <select className={controlClass} value={urgency} onChange={(event) => setUrgency(event.target.value)}>
              {URGENCIES.map((item) => (
                <option key={item} value={item}>
                  {URGENCY_LABEL[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-muted">
            สรุป
            <input className={controlClass} value={summary} onChange={(event) => setSummary(event.target.value)} />
          </label>
          <label className="block text-xs text-muted">
            เหตุผลเมื่อปฏิเสธหรือขอข้อมูล
            <input className={controlClass} value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void run("verify")}>ยืนยันรายงาน</Button>
            <Button variant="soft" onClick={() => void run("edit")}>
              บันทึกการแก้
            </Button>
            <Button variant="soft" onClick={() => void run("accept_suggestion")}>
              รับข้อเสนอ
            </Button>
            <Button variant="soft" onClick={() => void run("needs_info")}>
              ขอข้อมูลเพิ่ม
            </Button>
            <Button variant="soft" onClick={() => void run("reject_suggestion")}>
              ปฏิเสธข้อเสนอ
            </Button>
            <Button variant="soft" onClick={() => void run("reject")}>
              ปฏิเสธรายงาน
            </Button>
            <Button
              onClick={async () => {
                const result = await createIntelMission({ data: { incidentId: item.id } });
                if (!result.ok) toast("เปิดภารกิจไม่ได้");
                else {
                  toast("เปิดภารกิจแล้ว ยังไม่จบงาน");
                  await router.invalidate();
                }
              }}
            >
              เปิดภารกิจ
            </Button>
          </div>
          <Assign incidentId={item.id} districtId={item.districtId} missions={data.missions} />
        </section>
      ) : null}

      <section>
        <h2 className="text-sm font-medium text-navy">ภารกิจ</h2>
        <ul className="mt-2 text-sm">
          {data.missions.map((mission) => (
            <li key={mission.id} className="border-b border-line py-2">
              {mission.title} · {MISSION_LABEL[mission.status] ?? mission.status}
              {mission.fieldNote ? ` · ${mission.fieldNote}` : ""}
            </li>
          ))}
        </ul>
      </section>
      {data.history.length > 0 ? (
        <section>
          <h2 className="text-sm font-medium text-navy">ประวัติ</h2>
          <ul className="mt-2 text-xs text-muted">
            {data.history.map((row) => (
              <li key={row.id}>
                {row.at} · {row.action} · {row.detail}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Assign({
  districtId,
  missions,
}: {
  incidentId: string;
  districtId: string;
  missions: { id: string; status: string }[];
}) {
  const router = useRouter();
  const [people, setPeople] = useState<{ id: string; displayName: string }[]>([]);
  const [assignee, setAssignee] = useState("");
  const open = missions.find((item) => item.status !== "completed" && item.status !== "cancelled");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="soft"
        onClick={async () => {
          const result = await getIntelAssignees({ data: { districtId } });
          if (result.ok) setPeople(result.items);
        }}
      >
        โหลดทีมในพื้นที่
      </Button>
      <select className={controlClass} value={assignee} onChange={(event) => setAssignee(event.target.value)}>
        <option value="">เลือกอาสา</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.displayName}
          </option>
        ))}
      </select>
      <Button
        disabled={!open || !assignee}
        onClick={async () => {
          if (!open) return;
          const result = await updateIntelMission({ data: { id: open.id, assigneeId: assignee } });
          if (!result.ok) toast("มอบงานไม่ได้");
          else {
            toast("มอบแล้ว");
            await router.invalidate();
          }
        }}
      >
        มอบภารกิจ
      </Button>
    </div>
  );
}
