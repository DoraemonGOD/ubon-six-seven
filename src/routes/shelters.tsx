import { createFileRoute } from "@tanstack/react-router";
import { Navigation, Phone } from "lucide-react";
import { AppShell } from "@/components/shell";
import { PageIntro, Panel, Pill } from "@/components/ui";
import { mapsLink } from "@/lib/geo/locate";
import { SOURCE_LABEL, districtById } from "@/lib/model";
import { useFloodStore } from "@/lib/store";

export const Route = createFileRoute("/shelters")({ component: Shelters });

function Shelters() {
  const shelters = useFloodStore((s) => s.shelters);
  // Shelters with room first, so people see where they can go.
  const list = [...shelters].sort((a, b) => b.capacity - b.current - (a.capacity - a.current));
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-lg px-4 py-4 lg:max-w-5xl lg:px-6 lg:py-6">
        <PageIntro title="ศูนย์พักพิง" lede="ผู้ประสานเป็นคนอัปเดตยอดคน ที่ยังรับได้เรียงไว้ก่อน โทรถามจุดพักก่อนเดินทาง" />
        {list.length === 0 ? <Panel>ยังไม่มีศูนย์พักพิงในระบบ</Panel> : null}
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((shelter) => {
            const pct = shelter.capacity ? Math.min(100, Math.round((shelter.current / shelter.capacity) * 100)) : 100;
            const room = Math.max(0, shelter.capacity - shelter.current);
            const tone = pct >= 100 ? "crit" : pct > 80 ? "hit" : "ok";
            return (
              <Panel key={shelter.id}>
                <Pill tone={tone}>{pct >= 100 ? "เต็มแล้ว" : pct > 80 ? `ใกล้เต็ม · ว่าง ${room}` : `ยังรับได้ ${room} คน`}</Pill>
                <h2 className="mt-2 text-lg font-semibold">{shelter.name}</h2>
                <p className="text-sm text-muted">อ.{districtById(shelter.districtId)?.name}</p>
                <p className="mt-2 text-sm">
                  {shelter.current.toLocaleString("th-TH")} / {shelter.capacity.toLocaleString("th-TH")} คน
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg">
                  <div className={pct > 80 ? "h-full bg-crit" : "h-full bg-blue"} style={{ width: `${pct}%` }} />
                </div>
                {shelter.facilities.length ? <p className="mt-2 text-sm">{shelter.facilities.join(" · ")}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {shelter.contact ? (
                    <a href={`tel:${shelter.contact.replace(/[^\d+]/g, "")}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border-2 border-line px-3 text-sm font-semibold text-ink">
                      <Phone className="size-4" /> {shelter.contact}
                    </a>
                  ) : null}
                  <a
                    href={mapsLink(shelter.lat, shelter.lng)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border-2 border-line px-3 text-sm font-semibold text-blue"
                  >
                    <Navigation className="size-4" /> นำทาง
                  </a>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  แหล่งที่มา: {SOURCE_LABEL[shelter.source]}
                  {shelter.note ? ` · ${shelter.note}` : ""}
                </p>
              </Panel>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
