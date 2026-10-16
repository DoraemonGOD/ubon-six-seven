import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell";
import { PageIntro, Panel, Pill } from "@/components/ui";
import { DISTRICTS, SUPPLIES, SUPPLY_LABEL, districtById, supplyState } from "@/lib/model";

export const Route = createFileRoute("/supplies")({ component: Supplies });

function Supplies() {
  const groups = DISTRICTS.map((d) => ({
    district: d,
    items: SUPPLIES.filter((item) => item.districtId === d.id),
  })).filter((group) => group.items.length > 0);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-lg px-4 py-4 lg:max-w-5xl lg:px-6 lg:py-6">
        <PageIntro
          title="สิ่งของช่วยเหลือ"
          lede="ดูว่าพื้นที่ไหนยังขาดอะไร ต้นแบบนี้ยังไม่เปิดให้กดบริจาคเข้าคลังจริง"
        />
        <div className="grid gap-3 lg:grid-cols-2">
          {groups.map((group) => (
            <Panel key={group.district.id}>
              <h2 className="font-semibold">{districtById(group.district.id)?.name}</h2>
              <ul className="mt-3 space-y-3">
                {group.items.map((item) => {
                  const state = supplyState(item);
                  return (
                    <li key={item.id} className="flex items-center justify-between gap-3">
                      <span>
                        <span className="block text-sm font-medium">{item.item}</span>
                        <span className="text-xs text-muted">
                          {item.have.toLocaleString("th-TH")} / {item.needed.toLocaleString("th-TH")}
                        </span>
                      </span>
                      <Pill tone={state === "fulfilled" ? "ok" : state === "partial" ? "hit" : "crit"}>
                        {SUPPLY_LABEL[state]}
                      </Pill>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
