// Back office for supplies and shelters. Coordinators add, edit and remove
// them here; the public pages, the home page and the map read the same rows.
import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { House, Minus, Package, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { LocationField, type GeoValue } from "@/components/location-field";
import { controlClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import { DISTRICTS, SUPPLY_LABEL, districtById, supplyState, type Shelter, type SupplyNeed } from "@/lib/model";
import { useFloodStore } from "@/lib/store";

export const Route = createFileRoute("/intel/resources")({ component: Resources });

type Tab = "supplies" | "shelters";

function Resources() {
  const supplies = useFloodStore((s) => s.supplies);
  const shelters = useFloodStore((s) => s.shelters);
  const canEdit = useFloodStore((s) => s.role === "coordinator");
  const hash = useRouterState({ select: (s) => s.location.hash });
  const [tab, setTab] = useState<Tab>(hash === "shelters" ? "shelters" : "supplies");
  useEffect(() => {
    if (hash === "shelters") setTab("shelters");
  }, [hash]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-navy">ทรัพยากรและศูนย์พักพิง</h1>
      <p className="mt-1 text-sm text-muted">
        {canEdit ? "เพิ่ม แก้ หรือลบได้เลย หน้าเว็บสาธารณะและแผนที่อัปเดตตามทันที" : "ดูได้อย่างเดียว เฉพาะผู้ดูแลที่แก้ไขได้"}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-surface p-1 ring-1 ring-line">
        <TabButton on={tab === "supplies"} onClick={() => setTab("supplies")} icon={<Package className="size-4" />}>
          สิ่งของ ({supplies.length})
        </TabButton>
        <TabButton on={tab === "shelters"} onClick={() => setTab("shelters")} icon={<House className="size-4" />}>
          ศูนย์พักพิง ({shelters.length})
        </TabButton>
      </div>

      <div key={tab} className="fade-in mt-4">
        {tab === "supplies" ? <SuppliesTab canEdit={canEdit} /> : <SheltersTab canEdit={canEdit} />}
      </div>
    </div>
  );
}

function TabButton({ on, onClick, icon, children }: { on: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition", on ? "bg-navy text-surface" : "text-muted")}
    >
      {icon}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ shared */

function Stepper({ value, step, onSet, label }: { value: number; step: number; onSet: (n: number) => void; label: string }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const n = Math.max(0, Math.round(Number(draft)));
    if (Number.isFinite(n) && n !== value) onSet(n);
    else setDraft(String(value));
  };
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label={`ลด${label} ${step}`}
        onClick={() => onSet(Math.max(0, value - step))}
        className="grid size-10 place-items-center rounded-xl border-2 border-line bg-surface text-ink transition active:scale-95"
      >
        <Minus className="size-4" />
      </button>
      <input
        aria-label={label}
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="h-10 w-20 rounded-xl border-2 border-line bg-surface text-center text-base font-semibold text-ink outline-none focus:border-blue"
      />
      <button
        type="button"
        aria-label={`เพิ่ม${label} ${step}`}
        onClick={() => onSet(value + step)}
        className="grid size-10 place-items-center rounded-xl border-2 border-line bg-surface text-ink transition active:scale-95"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

/** Delete needs a second tap so nothing goes by accident. */
function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 3000);
    return () => window.clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      onClick={() => (armed ? onDelete() : setArmed(true))}
      className={cn(
        "inline-flex min-h-10 items-center gap-1.5 rounded-xl border-2 px-3 text-sm font-semibold transition",
        armed ? "border-crit bg-crit text-surface" : "border-line bg-surface text-crit",
      )}
    >
      <Trash2 className="size-4" /> {armed ? "กดอีกครั้งเพื่อลบ" : "ลบ"}
    </button>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border-2 border-line bg-surface px-3 text-sm font-semibold text-ink">
      <Pencil className="size-4" /> แก้ไข
    </button>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue/50 bg-blue-soft text-sm font-semibold text-blue transition active:scale-[0.99]"
    >
      <Plus className="size-4" /> {children}
    </button>
  );
}

function Label({ text, children }: { text: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-navy">{text}</span>
      {children}
    </label>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "min-h-10 rounded-full border-2 px-3 text-sm font-semibold transition active:scale-95",
        on ? "border-blue bg-blue text-surface" : "border-muted/40 bg-surface text-ink",
      )}
    >
      {children}
    </button>
  );
}

function FormCard({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="card fade-in space-y-4 border-2 border-blue/40 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-navy">{title}</h2>
        <button type="button" onClick={onClose} aria-label="ปิด" className="grid size-9 place-items-center rounded-xl text-muted">
          <X className="size-5" />
        </button>
      </div>
      {children}
    </div>
  );
}

function DistrictSelect({ value, onChange, all }: { value: string; onChange: (id: string) => void; all?: string }) {
  return (
    <select className={controlClass} value={value} onChange={(e) => onChange(e.target.value)}>
      {all != null ? <option value="">{all}</option> : <option value="">เลือกอำเภอ</option>}
      {DISTRICTS.map((d) => (
        <option key={d.id} value={d.id}>
          {d.name}
        </option>
      ))}
    </select>
  );
}

const num = (s: string) => Math.max(0, Math.round(Number(s) || 0));

/* ---------------------------------------------------------------- supplies */

const ITEM_PRESETS = ["น้ำดื่ม", "อาหารกล่อง", "ถุงยังชีพ", "ยาสามัญ", "ผ้าห่ม", "ผ้าอนามัย", "นมเด็ก", "เรือท้องแบน", "เสื้อชูชีพ", "กระสอบทราย"];

function SuppliesTab({ canEdit }: { canEdit: boolean }) {
  const supplies = useFloodStore((s) => s.supplies);
  const saveSupply = useFloodStore((s) => s.saveSupply);
  const deleteSupply = useFloodStore((s) => s.deleteSupply);
  const [editing, setEditing] = useState<Partial<SupplyNeed> | null>(null);
  const [district, setDistrict] = useState("");

  const short = supplies.filter((s) => supplyState(s) === "needed").length;
  const partial = supplies.filter((s) => supplyState(s) === "partial").length;
  const full = supplies.filter((s) => supplyState(s) === "fulfilled").length;
  const shown = supplies.filter((s) => !district || s.districtId === district);
  const groups = DISTRICTS.map((d) => ({ d, items: shown.filter((s) => s.districtId === d.id) })).filter((g) => g.items.length);

  async function save(next: Partial<SupplyNeed>, message?: string) {
    const ok = await saveSupply(next);
    if (!ok) toast("บันทึกไม่ได้ ลองใหม่อีกครั้ง");
    else if (message) toast(message);
    return ok;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Count n={short} label="ยังขาดมาก" tone="text-crit" />
        <Count n={partial} label="ได้บางส่วน" tone="text-orange" />
        <Count n={full} label="ครบแล้ว" tone="text-ok" />
      </div>

      {canEdit ? (
        editing ? (
          <SupplyForm
            initial={editing}
            onClose={() => setEditing(null)}
            onSave={async (next) => {
              if (await save(next, next.id ? "แก้ไขแล้ว" : `เพิ่ม ${next.item} แล้ว`)) setEditing(null);
            }}
          />
        ) : (
          <AddButton onClick={() => setEditing({ districtId: district })}>เพิ่มสิ่งของที่ต้องการ</AddButton>
        )
      ) : null}

      <DistrictSelect value={district} onChange={setDistrict} all="ทุกอำเภอ" />

      {groups.length === 0 ? <p className="card p-6 text-center text-sm text-muted">ยังไม่มีรายการ</p> : null}
      {groups.map(({ d, items }) => (
        <section key={d.id} className="card p-4">
          <h2 className="font-semibold text-navy">อ.{d.name}</h2>
          <ul className="mt-2 divide-y divide-line">
            {items.map((item) => {
              const state = supplyState(item);
              const pct = item.needed ? Math.min(100, Math.round((item.have / item.needed) * 100)) : 100;
              const step = item.needed >= 100 ? 10 : 1;
              return (
                <li key={item.id} className="space-y-2 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-ink">{item.item}</p>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", state === "fulfilled" ? "bg-ok-soft text-ok" : state === "partial" ? "bg-orange-soft text-orange" : "bg-crit-soft text-crit")}>
                      {SUPPLY_LABEL[state]}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-bg">
                    <div className={cn("h-full transition-all", state === "fulfilled" ? "bg-ok" : state === "partial" ? "bg-orange" : "bg-crit")} style={{ width: `${pct}%` }} />
                  </div>
                  {canEdit ? (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="text-sm text-muted">มีแล้ว</span>
                      <Stepper value={item.have} step={step} label="จำนวนที่มี" onSet={(n) => void save({ ...item, have: n })} />
                      <span className="text-sm text-muted">จากที่ต้องการ {item.needed.toLocaleString("th-TH")}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted">
                      มีแล้ว {item.have.toLocaleString("th-TH")} จากที่ต้องการ {item.needed.toLocaleString("th-TH")}
                    </p>
                  )}
                  {canEdit ? (
                    <div className="flex gap-2">
                      <EditButton onClick={() => setEditing(item)} />
                      <DeleteButton
                        onDelete={async () => {
                          if (await deleteSupply(item.id)) toast(`ลบ ${item.item} แล้ว`);
                          else toast("ลบไม่ได้");
                        }}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Count({ n, label, tone }: { n: number; label: string; tone: string }) {
  return (
    <div className="card px-2 py-3">
      <p className={cn("text-2xl font-bold", tone)}>{n}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function SupplyForm({ initial, onClose, onSave }: { initial: Partial<SupplyNeed>; onClose: () => void; onSave: (s: Partial<SupplyNeed>) => Promise<void> }) {
  const [item, setItem] = useState(initial.item ?? "");
  const [districtId, setDistrictId] = useState(initial.districtId ?? "");
  const [needed, setNeeded] = useState(String(initial.needed ?? ""));
  const [have, setHave] = useState(String(initial.have ?? "0"));
  const [busy, setBusy] = useState(false);
  const missing = !item.trim() ? "ใส่ชื่อสิ่งของ" : !districtId ? "เลือกอำเภอ" : !num(needed) ? "ใส่จำนวนที่ต้องการ" : "";
  return (
    <FormCard title={initial.id ? "แก้ไขสิ่งของ" : "เพิ่มสิ่งของที่ต้องการ"} onClose={onClose}>
      <Label text="ต้องการอะไร">
        <input className={controlClass} value={item} placeholder="เช่น น้ำดื่ม" onChange={(e) => setItem(e.target.value)} />
      </Label>
      <div className="flex flex-wrap gap-2">
        {ITEM_PRESETS.map((p) => (
          <Chip key={p} on={item === p} onClick={() => setItem(p)}>
            {p}
          </Chip>
        ))}
      </div>
      <Label text="อำเภอ">
        <DistrictSelect value={districtId} onChange={setDistrictId} />
      </Label>
      <div className="grid grid-cols-2 gap-3">
        <Label text="ต้องการทั้งหมด">
          <input className={controlClass} inputMode="numeric" value={needed} onChange={(e) => setNeeded(e.target.value.replace(/\D/g, ""))} />
        </Label>
        <Label text="มีแล้ว">
          <input className={controlClass} inputMode="numeric" value={have} onChange={(e) => setHave(e.target.value.replace(/\D/g, ""))} />
        </Label>
      </div>
      <button
        type="button"
        disabled={busy || Boolean(missing)}
        onClick={async () => {
          setBusy(true);
          await onSave({ id: initial.id, item: item.trim(), districtId, needed: num(needed), have: num(have) });
          setBusy(false);
        }}
        className="min-h-12 w-full rounded-xl bg-blue text-sm font-semibold text-surface shadow-sm transition active:scale-[0.99] disabled:opacity-50"
      >
        {missing || (busy ? "กำลังบันทึก…" : "บันทึก")}
      </button>
    </FormCard>
  );
}

/* ---------------------------------------------------------------- shelters */

const FACILITY_PRESETS = ["น้ำดื่ม", "อาหาร", "ห้องน้ำ", "ปฐมพยาบาล", "เต็นท์", "ไฟฟ้า", "ที่ชาร์จมือถือ", "ที่จอดรถ", "รับสัตว์เลี้ยง"];

function SheltersTab({ canEdit }: { canEdit: boolean }) {
  const shelters = useFloodStore((s) => s.shelters);
  const saveShelter = useFloodStore((s) => s.saveShelter);
  const deleteShelter = useFloodStore((s) => s.deleteShelter);
  const [editing, setEditing] = useState<Partial<Shelter> | null>(null);

  const people = shelters.reduce((n, s) => n + s.current, 0);
  const room = shelters.reduce((n, s) => n + Math.max(0, s.capacity - s.current), 0);

  async function save(next: Partial<Shelter>, message?: string) {
    const ok = await saveShelter(next);
    if (!ok) toast("บันทึกไม่ได้ ลองใหม่อีกครั้ง");
    else if (message) toast(message);
    return ok;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Count n={shelters.length} label="ศูนย์ทั้งหมด" tone="text-navy" />
        <Count n={people} label="คนอยู่ตอนนี้" tone="text-blue" />
        <Count n={room} label="รับเพิ่มได้" tone="text-ok" />
      </div>

      {canEdit ? (
        editing ? (
          <ShelterForm
            initial={editing}
            onClose={() => setEditing(null)}
            onSave={async (next) => {
              if (await save(next, next.id ? "แก้ไขแล้ว" : "เพิ่มศูนย์พักพิงแล้ว")) setEditing(null);
            }}
          />
        ) : (
          <AddButton onClick={() => setEditing({})}>เพิ่มศูนย์พักพิง</AddButton>
        )
      ) : null}

      {shelters.length === 0 ? <p className="card p-6 text-center text-sm text-muted">ยังไม่มีศูนย์พักพิง</p> : null}
      <ul className="space-y-3">
        {shelters.map((shelter) => {
          const pct = shelter.capacity ? Math.min(100, Math.round((shelter.current / shelter.capacity) * 100)) : 100;
          const full = pct >= 100;
          const near = pct > 80;
          return (
            <li key={shelter.id} className="card space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-navy">{shelter.name}</p>
                  <p className="text-xs text-muted">
                    อ.{districtById(shelter.districtId)?.name}
                    {shelter.contact ? ` · โทร ${shelter.contact}` : ""}
                  </p>
                </div>
                <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", full ? "bg-crit-soft text-crit" : near ? "bg-orange-soft text-orange" : "bg-ok-soft text-ok")}>
                  {full ? "เต็ม" : near ? "ใกล้เต็ม" : "ยังรับได้"}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-bg">
                <div className={cn("h-full transition-all", full ? "bg-crit" : near ? "bg-orange" : "bg-blue")} style={{ width: `${pct}%` }} />
              </div>
              {canEdit ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="text-sm text-muted">คนอยู่ตอนนี้</span>
                  <Stepper value={shelter.current} step={1} label="จำนวนคน" onSet={(n) => void save({ ...shelter, current: n })} />
                  <span className="text-sm text-muted">จากที่รับได้ {shelter.capacity.toLocaleString("th-TH")}</span>
                </div>
              ) : (
                <p className="text-sm text-muted">
                  คนอยู่ {shelter.current.toLocaleString("th-TH")} จากที่รับได้ {shelter.capacity.toLocaleString("th-TH")}
                </p>
              )}
              {shelter.facilities.length ? <p className="text-sm">{shelter.facilities.join(" · ")}</p> : null}
              {canEdit ? (
                <div className="flex gap-2">
                  <EditButton onClick={() => setEditing(shelter)} />
                  <DeleteButton
                    onDelete={async () => {
                      if (await deleteShelter(shelter.id)) toast("ลบศูนย์พักพิงแล้ว");
                      else toast("ลบไม่ได้");
                    }}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ShelterForm({ initial, onClose, onSave }: { initial: Partial<Shelter>; onClose: () => void; onSave: (s: Partial<Shelter>) => Promise<void> }) {
  const [name, setName] = useState(initial.name ?? "");
  const [districtId, setDistrictId] = useState(initial.districtId ?? "");
  const [where, setWhere] = useState<GeoValue | null>(initial.lng != null && initial.lat != null ? { lng: initial.lng, lat: initial.lat, via: "map" } : null);
  const [capacity, setCapacity] = useState(String(initial.capacity ?? ""));
  const [current, setCurrent] = useState(String(initial.current ?? "0"));
  const [facilities, setFacilities] = useState<string[]>(initial.facilities ?? []);
  const [contact, setContact] = useState(initial.contact ?? "");
  const [note, setNote] = useState(initial.note ?? "");
  const [busy, setBusy] = useState(false);
  const missing = !name.trim() ? "ใส่ชื่อศูนย์" : !districtId ? "เลือกอำเภอหรือตำแหน่ง" : !num(capacity) ? "ใส่จำนวนที่รับได้" : "";
  const toggle = (f: string) => setFacilities((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  return (
    <FormCard title={initial.id ? "แก้ไขศูนย์พักพิง" : "เพิ่มศูนย์พักพิง"} onClose={onClose}>
      <Label text="ชื่อศูนย์">
        <input className={controlClass} value={name} placeholder="เช่น โรงเรียนบ้านหนองบัว" onChange={(e) => setName(e.target.value)} />
      </Label>
      <div>
        <span className="mb-1 block text-sm font-semibold text-navy">ตำแหน่ง</span>
        <LocationField value={where} onChange={setWhere} onDistrict={setDistrictId} />
      </div>
      <Label text="อำเภอ">
        <DistrictSelect value={districtId} onChange={setDistrictId} />
      </Label>
      <div className="grid grid-cols-2 gap-3">
        <Label text="รับได้ (คน)">
          <input className={controlClass} inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ""))} />
        </Label>
        <Label text="อยู่ตอนนี้ (คน)">
          <input className={controlClass} inputMode="numeric" value={current} onChange={(e) => setCurrent(e.target.value.replace(/\D/g, ""))} />
        </Label>
      </div>
      <div>
        <span className="mb-1 block text-sm font-semibold text-navy">ที่ศูนย์มี</span>
        <div className="flex flex-wrap gap-2">
          {FACILITY_PRESETS.map((f) => (
            <Chip key={f} on={facilities.includes(f)} onClick={() => toggle(f)}>
              {f}
            </Chip>
          ))}
        </div>
      </div>
      <Label text="เบอร์ติดต่อ">
        <input className={controlClass} inputMode="tel" value={contact} onChange={(e) => setContact(e.target.value)} />
      </Label>
      <Label text="หมายเหตุ (ถ้ามี)">
        <input className={controlClass} value={note} placeholder="เช่น รับผู้สูงอายุก่อน" onChange={(e) => setNote(e.target.value)} />
      </Label>
      <button
        type="button"
        disabled={busy || Boolean(missing)}
        onClick={async () => {
          setBusy(true);
          const d = districtById(districtId);
          await onSave({
            ...initial,
            name: name.trim(),
            districtId,
            lng: where?.lng ?? d?.lng,
            lat: where?.lat ?? d?.lat,
            capacity: num(capacity),
            current: num(current),
            facilities,
            contact: contact.trim(),
            note: note.trim(),
          });
          setBusy(false);
        }}
        className="min-h-12 w-full rounded-xl bg-blue text-sm font-semibold text-surface shadow-sm transition active:scale-[0.99] disabled:opacity-50"
      >
        {missing || (busy ? "กำลังบันทึก…" : "บันทึก")}
      </button>
    </FormCard>
  );
}
