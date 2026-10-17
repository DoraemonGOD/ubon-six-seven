import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { adjustIntelSupply, getIntelSupplies } from "@/lib/intel/fns";

export const Route = createFileRoute("/intel/resources")({
  loader: () => getIntelSupplies(),
  component: Resources,
});

function Resources() {
  const data = Route.useLoaderData();
  const router = useRouter();
  if (!data.ok) return <p className="text-sm">ไม่มีสิทธิ์</p>;
  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy">ทรัพยากรและสิ่งของ</h1>
      <p className="mt-1 text-sm text-muted">จำนวนมาจากตารางในฐานข้อมูล แถวสาธิตไม่ได้แปลว่าคลังจริงขาดของ</p>
      <ul className="mt-4 border-t border-line">
        {data.items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-3 border-b border-line py-3 text-sm">
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-navy">
                {item.name} · {item.districtName}
              </span>
              <span className="text-xs text-muted">
                คงเหลือ {item.onHand} / ต้องการ {item.needed}
                {item.short ? " · ขาด" : " · พอ"}
                {item.isDemo ? " · สาธิต" : ""}
              </span>
            </span>
            {data.canEdit ? (
              <Button
                variant="soft"
                onClick={async () => {
                  const result = await adjustIntelSupply({ data: { id: item.id, onHand: item.onHand + 10 } });
                  if (!result.ok) toast("แก้ไม่ได้");
                  else await router.invalidate();
                }}
              >
                +10
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
