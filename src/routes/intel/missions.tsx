import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button, controlClass } from "@/components/ui";
import { getIntelMissions, updateIntelMission } from "@/lib/intel/fns";
import { MISSION_LABEL } from "@/lib/intel/labels";

export const Route = createFileRoute("/intel/missions")({
  loader: () => getIntelMissions(),
  component: Missions,
});

function Missions() {
  const data = Route.useLoaderData();
  const router = useRouter();
  if (!data.ok) return <p className="text-sm">ไม่มีสิทธิ์</p>;
  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy">ภารกิจช่วยเหลือ</h1>
      <p className="mt-1 text-sm text-muted">
        {data.canAssign ? "ผู้ดูแลมอบงานและปิดงานได้ ระบบจะไม่ปิดงานเอง" : "เห็นเฉพาะงานที่มอบให้คุณ เลื่อนได้ถึงขั้นรอตรวจผล แต่ปิดงานเองไม่ได้"}
      </p>
      <ul className="mt-4 space-y-3">
        {data.items.map((item) => (
          <MissionRow key={item.id} item={item} canAssign={data.canAssign} onDone={() => router.invalidate()} />
        ))}
      </ul>
      <Link to="/intel/review" className="mt-4 inline-flex text-sm text-blue">
        เปิดภารกิจจากรายงาน
      </Link>
    </div>
  );
}

function MissionRow({
  item,
  canAssign,
  onDone,
}: {
  item: {
    id: string;
    incidentId: string;
    title: string;
    status: string;
    suppliesRequested: string;
    suppliesDelivered: string;
    fieldNote: string;
    updatedAt: string;
  };
  canAssign: boolean;
  onDone: () => Promise<void>;
}) {
  const [note, setNote] = useState(item.fieldNote);
  const [delivered, setDelivered] = useState(item.suppliesDelivered);
  async function save(status?: string) {
    const result = await updateIntelMission({
      data: { id: item.id, status, note, delivered: canAssign ? delivered : undefined },
    });
    if (!result.ok) toast("บันทึกไม่ได้");
    else {
      toast("บันทึกแล้ว");
      await onDone();
    }
  }
  return (
    <li className="card p-4 text-sm">
      <p className="font-medium text-navy">{item.title}</p>
      <p className="mt-1 text-xs text-muted">
        {MISSION_LABEL[item.status] ?? item.status} · {item.updatedAt}
      </p>
      {item.suppliesRequested ? <p className="mt-1">ขอ: {item.suppliesRequested}</p> : null}
      <Link to="/intel/review/$id" params={{ id: item.incidentId }} className="mt-1 inline-flex text-blue">
        รายงานต้นทาง
      </Link>
      <textarea className={`${controlClass} mt-2 min-h-16`} value={note} onChange={(event) => setNote(event.target.value)} />
      {canAssign ? (
        <input className={`${controlClass} mt-2`} value={delivered} placeholder="ของที่ส่งแล้ว" onChange={(event) => setDelivered(event.target.value)} />
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button variant="soft" onClick={() => void save("in_progress")}>
          กำลังทำ
        </Button>
        <Button variant="soft" onClick={() => void save("awaiting_verification")}>
          ส่งรอตรวจผล
        </Button>
        {canAssign ? (
          <Button onClick={() => void save("completed")}>
            ปิดงาน
          </Button>
        ) : null}
        <Button variant="soft" onClick={() => void save()}>
          บันทึกหมายเหตุ
        </Button>
      </div>
    </li>
  );
}
