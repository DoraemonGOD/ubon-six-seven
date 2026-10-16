import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { getIntelMembers, setIntelMemberRole } from "@/lib/intel/fns";
import { ROLE_LABEL } from "@/lib/intel/labels";
import { DISTRICTS } from "@/lib/model";

export const Route = createFileRoute("/intel/volunteers")({
  loader: () => getIntelMembers(),
  component: Volunteers,
});

function Volunteers() {
  const data = Route.useLoaderData();
  const router = useRouter();
  if (!data.ok) return <p className="text-sm">ไม่มีสิทธิ์</p>;
  return (
    <div>
      <h1 className="text-xl font-medium text-navy">อาสาและการยืนยัน</h1>
      <p className="mt-1 text-sm text-muted">
        {data.canManage ? "อนุมัติแล้วสิทธิ์มีผลทันที การถอนยืนยันทำให้คำขอถัดไปเข้าห้องนี้ไม่ได้" : "เห็นเฉพาะบัญชีตัวเอง ไม่เห็นเบอร์คนอื่น และยืนยันตัวเองไม่ได้"}
      </p>
      <ul className="mt-4 space-y-3">
        {data.items.map((item) => (
          <MemberRow key={item.id} item={item} canManage={data.canManage} onDone={() => router.invalidate()} />
        ))}
      </ul>
    </div>
  );
}

function MemberRow({
  item,
  canManage,
  onDone,
}: {
  item: { id: string; displayName: string; phone: string | null; role: string; districtIds: string[] };
  canManage: boolean;
  onDone: () => Promise<void>;
}) {
  const [districts, setDistricts] = useState(item.districtIds);
  function toggle(id: string) {
    setDistricts((prev) => (prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]));
  }
  return (
    <li className="border border-line bg-surface p-3 text-sm">
      <p className="font-medium text-navy">
        {item.displayName} · {ROLE_LABEL[item.role] ?? item.role}
      </p>
      {item.phone ? <p className="text-xs text-muted">เบอร์ {item.phone}</p> : null}
      {canManage && item.role !== "admin" ? (
        <div className="mt-2">
          <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">
            {DISTRICTS.map((district) => (
              <button
                key={district.id}
                type="button"
                className={districts.includes(district.id) ? "border border-navy px-2 py-1 text-xs" : "border border-line px-2 py-1 text-xs text-muted"}
                onClick={() => toggle(district.id)}
              >
                {district.name}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Button
              onClick={async () => {
                const result = await setIntelMemberRole({ data: { id: item.id, role: "verified_volunteer", districtIds: districts } });
                if (!result.ok) toast("ยืนยันไม่ได้");
                else {
                  toast("ยืนยันแล้ว");
                  await onDone();
                }
              }}
            >
              ยืนยัน
            </Button>
            <Button
              variant="soft"
              onClick={async () => {
                const result = await setIntelMemberRole({ data: { id: item.id, role: "pending_volunteer", districtIds: districts } });
                if (!result.ok) toast("ถอนไม่ได้");
                else {
                  toast("ถอนการยืนยันแล้ว");
                  await onDone();
                }
              }}
            >
              ถอนการยืนยัน
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-1 text-xs text-muted">{item.districtIds.join(", ") || "ไม่จำกัดอำเภอ"}</p>
      )}
    </li>
  );
}
