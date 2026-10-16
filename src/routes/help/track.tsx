import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/shell";
import { Button, Field, PageIntro, Panel, Pill, controlClass } from "@/components/ui";
import { STATUS_LABEL, TYPE_LABEL, toneForPriority, PRIORITY_LABEL } from "@/lib/model";
import { useFloodStore } from "@/lib/store";
import { ago } from "@/lib/time";

export const Route = createFileRoute("/help/track")({
  validateSearch: (search: Record<string, unknown>): { id?: string } => {
    if (typeof search.id === "string" && search.id) return { id: search.id };
    return {};
  },
  component: Track,
});

const FLOW = ["submitted", "verified", "assigned", "in_progress", "resolved"] as const;

function Track() {
  const { id: initial = "" } = Route.useSearch();
  const requests = useFloodStore((s) => s.requests);
  const events = useFloodStore((s) => s.events);
  const myRequestIds = useFloodStore((s) => s.myRequestIds);
  const role = useFloodStore((s) => s.role);
  const unlockRequest = useFloodStore((s) => s.unlockRequest);
  const [id, setId] = useState(initial);
  const [tail, setTail] = useState("");
  const [unlocked, setUnlocked] = useState<string | null>(null);

  const key = id.trim().toUpperCase();
  const req = requests.find((item) => item.id === key);
  const owned = req ? myRequestIds.includes(req.id) || role === "coordinator" || unlocked === req.id : false;

  // The phone number never reaches this browser; the server checks the last
  // four digits and remembers that this browser may follow the request.
  async function unlock() {
    const ok = await unlockRequest(key, tail);
    setUnlocked(ok ? key : "missing");
  }

  const step = req ? FLOW.indexOf(req.status as (typeof FLOW)[number]) : -1;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-lg px-4 py-4">
        <PageIntro title="ติดตามคำร้อง" lede="ใช้เลข UBN ถ้าส่งจากเครื่องนี้จะเปิดได้ทันที เครื่องอื่นต้องใส่เบอร์ 4 ตัวท้าย" />
        <div className="space-y-3">
          <Field label="เลขติดตาม">
            <input className={controlClass} value={id} onChange={(e) => setId(e.target.value)} placeholder="UBN-2026-00125" />
          </Field>
          {!owned ? (
            <>
              <Field label="เบอร์ 4 ตัวท้าย">
                <input className={controlClass} inputMode="numeric" value={tail} onChange={(e) => setTail(e.target.value)} />
              </Field>
              <Button onClick={() => void unlock()}>ดูสถานะ</Button>
              {unlocked === "missing" ? <p className="text-sm text-crit">ไม่พบคำร้องหรือเบอร์ไม่ตรง</p> : null}
            </>
          ) : null}
        </div>
        {req && owned ? (
          <Panel className="mt-4">
            <p className="text-sm font-semibold text-blue">{req.id}</p>
            <h2 className="mt-1 text-xl font-semibold">{TYPE_LABEL[req.type]}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <Pill tone={toneForPriority(req.priority)}>{PRIORITY_LABEL[req.priority]}</Pill>
              <Pill tone="info">{STATUS_LABEL[req.status]}</Pill>
            </div>
            <p className="mt-3 text-sm text-muted">สถานะอัปเดตเองเมื่อผู้ประสานหรืออาสาเปลี่ยน</p>
            {req.status === "unreachable" || req.status === "duplicate" ? (
              <p className="mt-3 text-sm">{STATUS_LABEL[req.status]}</p>
            ) : (
              <ol className="mt-4 space-y-2">
                {FLOW.map((item, index) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <span className={index <= step ? "size-2.5 rounded-full bg-blue" : "size-2.5 rounded-full bg-line"} />
                    <span className={index <= step ? "font-semibold" : "text-muted"}>{STATUS_LABEL[item]}</span>
                  </li>
                ))}
              </ol>
            )}
            <ul className="mt-4 space-y-3 border-t border-line pt-3">
              {events
                .filter((event) => event.requestId === req.id && !event.internal)
                .map((event) => (
                  <li key={event.id}>
                    <p className="text-sm">{event.message}</p>
                    <p className="text-xs text-muted">{ago(event.at)}</p>
                  </li>
                ))}
            </ul>
          </Panel>
        ) : null}
      </div>
    </AppShell>
  );
}
