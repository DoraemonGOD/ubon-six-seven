import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/shell";
import { PageIntro, Pill } from "@/components/ui";
import { DISTRICTS, LEVEL_LABEL, LEVEL_RANK, toneForLevel, type FloodLevel } from "@/lib/model";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/situation")({ component: Situation });

const FILTERS: Array<FloodLevel | "all"> = ["all", "critical", "affected", "watch", "normal"];

function Situation() {
  const [filter, setFilter] = useState<FloodLevel | "all">("all");
  const rows = [...DISTRICTS]
    .filter((d) => filter === "all" || d.level === filter)
    .sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level]);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-4 lg:max-w-5xl lg:px-6 lg:py-6">
        <PageIntro
          title="สถานการณ์รายอำเภอ"
          lede="สีในต้นแบบนี้จำลองตามพื้นที่เสี่ยงริมมูล ชี และโขง ไม่ใช่ประกาศ ปภ. หรือกรมชลประทาน"
        />
        <div className="mb-4 flex gap-2 overflow-x-auto">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
              className={cn(
                "min-h-11 shrink-0 rounded-full px-3 text-sm font-semibold",
                filter === item ? "bg-navy text-surface" : "bg-surface text-ink",
              )}
            >
              {item === "all" ? "ทั้งหมด" : LEVEL_LABEL[item]}
            </button>
          ))}
        </div>
        <ul className="grid gap-2 lg:grid-cols-2">
          {rows.map((d) => (
            <li key={d.id}>
              <Link to="/map" search={{ d: d.id }} className="card flex min-h-16 items-center justify-between gap-3 px-4 py-3 transition hover:-translate-y-0.5">
                <span>
                  <span className="block font-semibold">{d.name}</span>
                  <span className="text-xs text-muted">ลุ่มน้ำ{d.basin}</span>
                </span>
                <Pill tone={toneForLevel(d.level)}>{LEVEL_LABEL[d.level]}</Pill>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
