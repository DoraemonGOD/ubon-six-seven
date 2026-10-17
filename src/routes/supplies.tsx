import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell";
import { PageIntro, Panel, Pill } from "@/components/ui";
import { DISTRICTS, SUPPLY_LABEL, supplyState } from "@/lib/model";
import { useFloodStore } from "@/lib/store";

export const Route = createFileRoute("/supplies")({ component: Supplies });

function Supplies() {
  const supplies = useFloodStore((s) => s.supplies);
  const groups = DISTRICTS.map((d) => ({
    district: d,
    items: supplies.filter((item) => item.districtId === d.id),
  })).filter((group) => group.items.length > 0);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-lg px-4 py-4 lg:max-w-5xl lg:px-6 lg:py-6">
        <PageIntro title="สิ่งของช่วยเหลือ" lede="ดูว่าพื้นที่ไหนยังขาดอะไร ผู้ประสานเป็นคนอัปเดตยอดในหลังบ้าน" />
        {groups.length === 0 ? <Panel>ยังไม่มีรายการสิ่งของ</Panel> : null}
        <div className="grid gap-3 lg:grid-cols-2">
          {groups.map((group) => (
            <Panel key={group.district.id}>
              <h2 className="font-semibold">อ.{group.district.name}</h2>
              <ul className="mt-3 space-y-3">
                {group.items.map((item) => {
                  const state = supplyState(item);
                  const pct = item.needed ? Math.min(100, Math.round((item.have / item.needed) * 100)) : 100;
                  return (
                    <li key={item.id}>
                      <div className="flex items-center justify-between gap-3">
                        <span>
                          <span className="block text-sm font-medium">{item.item}</span>
                          <span className="text-xs text-muted">
                            มีแล้ว {item.have.toLocaleString("th-TH")} / ต้องการ {item.needed.toLocaleString("th-TH")}
                          </span>
                        </span>
                        <Pill tone={state === "fulfilled" ? "ok" : state === "partial" ? "hit" : "crit"}>{SUPPLY_LABEL[state]}</Pill>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg">
                        <div className={state === "fulfilled" ? "h-full bg-ok" : state === "partial" ? "h-full bg-orange" : "h-full bg-crit"} style={{ width: `${pct}%` }} />
                      </div>
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
