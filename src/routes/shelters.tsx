import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell";
import { PageIntro, Panel, Pill } from "@/components/ui";
import { SHELTERS, SOURCE_LABEL, districtById } from "@/lib/model";

export const Route = createFileRoute("/shelters")({ component: Shelters });

function Shelters() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-lg px-4 py-4 lg:max-w-5xl lg:px-6 lg:py-6">
        <PageIntro
          title="ศูนย์พักพิง"
          lede="อ่านอย่างเดียวในต้นแบบนี้ ยอดคนและเบอร์เป็นตัวอย่าง ไม่ใช่ยอดเรียลไทม์ของเทศบาล"
        />
        <div className="grid gap-3 lg:grid-cols-2">
          {SHELTERS.map((shelter) => {
            const pct = Math.min(100, Math.round((shelter.current / shelter.capacity) * 100));
            return (
              <Panel key={shelter.id}>
                <Pill tone={pct > 80 ? "crit" : "info"}>{pct > 80 ? "ใกล้เต็ม" : "ยังรับได้"}</Pill>
                <h2 className="mt-2 text-lg font-semibold">{shelter.name}</h2>
                <p className="text-sm text-muted">{districtById(shelter.districtId)?.name}</p>
                <p className="mt-2 text-sm">
                  {shelter.current} / {shelter.capacity} คน
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg">
                  <div className="h-full bg-blue" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-sm">{shelter.facilities.join(" · ")}</p>
                <p className="mt-2 text-sm">ติดต่อจุดพัก {shelter.contact}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  แหล่งที่มา: {SOURCE_LABEL[shelter.source]} · {shelter.note}
                </p>
              </Panel>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
