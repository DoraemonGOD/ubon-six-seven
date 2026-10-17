// Team list: people waiting come first with one "approve" button that keeps
// the districts they signed up for. Changing districts is tucked away.
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Check, ChevronDown, Phone, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { getIntelMembers, setIntelMemberRole } from "@/lib/intel/fns";
import { ROLE_LABEL } from "@/lib/intel/labels";
import { DISTRICTS, districtById } from "@/lib/model";

export const Route = createFileRoute("/intel/volunteers")({
  loader: () => getIntelMembers(),
  component: Volunteers,
});

type Member = { id: string; displayName: string; phone: string | null; role: string; districtIds: string[] };

function Volunteers() {
  const data = Route.useLoaderData();
  const router = useRouter();
  if (!data.ok) return <p className="text-sm">ไม่มีสิทธิ์</p>;
  const items = data.items as Member[];
  const waiting = items.filter((m) => m.role === "pending_volunteer");
  const others = items.filter((m) => m.role !== "pending_volunteer");
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-navy">ทีมอาสาสมัคร</h1>
      <p className="mt-1 text-sm text-muted">
        {data.canManage ? "ยืนยันที่นี่หรือที่ศูนย์ประสานก็ได้ ผลตรงกันทั้งสองที่" : "เห็นเฉพาะบัญชีตัวเอง"}
      </p>
      {data.canManage ? (
        <>
          <h2 className="mt-5 text-sm font-semibold text-navy">รอยืนยัน ({waiting.length})</h2>
          <ul className="mt-2 space-y-3">
            {waiting.map((m) => (
              <MemberCard key={m.id} m={m} canManage onDone={() => router.invalidate()} />
            ))}
            {waiting.length === 0 ? <li className="card p-4 text-center text-sm text-muted">ไม่มีใบสมัครค้าง</li> : null}
          </ul>
        </>
      ) : null}
      <h2 className="mt-5 text-sm font-semibold text-navy">{data.canManage ? `ทีมที่ยืนยันแล้ว (${others.length})` : "บัญชีของคุณ"}</h2>
      <ul className="mt-2 space-y-2">
        {others.map((m) => (
          <MemberCard key={m.id} m={m} canManage={data.canManage} onDone={() => router.invalidate()} />
        ))}
      </ul>
    </div>
  );
}

function MemberCard({ m, canManage, onDone }: { m: Member; canManage: boolean; onDone: () => Promise<void> }) {
  const [districts, setDistricts] = useState(m.districtIds);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = m.role === "pending_volunteer";
  const names = m.districtIds.map((id) => districtById(id)?.name).filter(Boolean).join(", ") || "ยังไม่ระบุพื้นที่";

  async function setRole(role: "pending_volunteer" | "verified_volunteer", ids = districts) {
    setBusy(true);
    const result = await setIntelMemberRole({ data: { id: m.id, role, districtIds: ids } });
    setBusy(false);
    if (!result.ok) {
      toast("ทำไม่ได้");
      return;
    }
    toast(role === "verified_volunteer" ? `ยืนยัน ${m.displayName} แล้ว` : `ถอนการยืนยัน ${m.displayName} แล้ว`);
    setEditing(false);
    await onDone();
  }

  return (
    <li className={cn("card p-4", pending && "border-l-4 border-l-purple")}>
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-purple-soft font-semibold text-purple">{m.displayName.slice(0, 1)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-navy">{m.displayName}</p>
          <p className="truncate text-xs text-muted">
            {ROLE_LABEL[m.role] ?? m.role} · {names}
          </p>
        </div>
        {m.phone ? (
          <a href={`tel:${m.phone}`} className="grid size-10 place-items-center rounded-xl border border-line text-ink" aria-label={`โทรหา ${m.displayName}`}>
            <Phone className="size-4" />
          </a>
        ) : null}
      </div>

      {canManage && m.role !== "admin" ? (
        <div className="mt-3 space-y-2">
          {pending ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void setRole("verified_volunteer", m.districtIds)}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-ok text-sm font-semibold text-surface shadow-sm transition active:scale-[0.98] disabled:opacity-60"
            >
              <Check className="size-4" /> ยืนยันอาสา (พื้นที่ตามที่สมัคร)
            </button>
          ) : null}
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setEditing((v) => !v)} className="inline-flex items-center gap-1 text-sm font-semibold text-blue">
              แก้พื้นที่ที่รับผิดชอบ <ChevronDown className={cn("size-4 transition", editing && "rotate-180")} />
            </button>
            {!pending ? (
              <button type="button" disabled={busy} onClick={() => void setRole("pending_volunteer")} className="inline-flex items-center gap-1 text-sm text-muted">
                <Undo2 className="size-3.5" /> ถอนการยืนยัน
              </button>
            ) : null}
          </div>
          {editing ? (
            <div className="fade-in space-y-2">
              <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                {DISTRICTS.map((d) => {
                  const on = districts.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setDistricts((prev) => (on ? prev.filter((x) => x !== d.id) : [...prev, d.id]))}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition",
                        on ? "border-purple bg-purple-soft font-semibold text-purple" : "border-line text-muted",
                      )}
                    >
                      {d.name}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void setRole(pending ? "pending_volunteer" : "verified_volunteer")}
                className="min-h-10 rounded-xl bg-navy px-4 text-sm font-semibold text-surface"
              >
                บันทึกพื้นที่
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
