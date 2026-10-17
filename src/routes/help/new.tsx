import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { LocationField, type GeoValue } from "@/components/location-field";
import { PhotoField } from "@/components/photo-field";
import { AppShell } from "@/components/shell";
import { Button, Field, PageIntro, Panel, controlClass } from "@/components/ui";
import { DISTRICTS, HELP_TYPES, PRIORITIES, PRIORITY_LABEL, TYPE_LABEL, districtById, isSensitive, type HelpType, type Priority } from "@/lib/model";
import { ingestPublicReport } from "@/lib/intel/fns";
import { useFloodStore } from "@/lib/store";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/help/new")({ component: HelpNew });

function HelpNew() {
  const navigate = useNavigate();
  const submitRequest = useFloodStore((s) => s.submitRequest);
  const [type, setType] = useState<HelpType | "">("");
  const [priority, setPriority] = useState<Priority>("high");
  const [districtId, setDistrictId] = useState("mueang");
  const [placeLabel, setPlaceLabel] = useState("");
  const [people, setPeople] = useState(1);
  const [detail, setDetail] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState<GeoValue | null>(null);
  const [photo, setPhoto] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ type?: string; place?: string; detail?: string; phone?: string }>({});

  async function submit() {
    const digits = phone.replace(/\D/g, "");
    const next = {
      type: type ? undefined : "เลือกเรื่องที่ต้องการความช่วยเหลือ",
      place: placeLabel.trim().length >= 2 ? undefined : "ใส่จุดสังเกต เช่น ชุมชน หรือวัด",
      detail: detail.trim().length >= 2 ? undefined : "บอกสั้น ๆ ว่าเกิดอะไรขึ้น",
      phone: digits.length >= 9 ? undefined : "ใส่เบอร์ 9–10 หลัก เช่น 0812345678",
    };
    setErrors(next);
    const first = next.type ?? next.place ?? next.detail ?? next.phone;
    if (first || !type) {
      toast(first ?? "กรอกไม่ครบ");
      return;
    }
    setBusy(true);
    const id = await submitRequest({
      type,
      priority,
      districtId,
      placeLabel,
      people: Math.max(1, people || 1),
      detail,
      phone: digits,
      lng: pin?.lng,
      lat: pin?.lat,
      accuracy: pin?.accuracy,
      via: pin?.via,
      photo,
    });
    if (!id) {
      setBusy(false);
      toast("ส่งไม่ได้ เลือกอำเภอแล้วลองอีกครั้ง");
      return;
    }
    const category = type === "medicine" ? "medical" : type === "transport" ? "boat" : type;
    void ingestPublicReport({
      data: {
        districtId,
        placeLabel,
        text: detail,
        people,
        phone: digits,
        category,
        lng: pin?.lng,
        lat: pin?.lat,
      },
    });
    navigate({ to: "/help/track", search: { id } });
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-lg px-4 py-4">
        <PageIntro
          title="ขอความช่วยเหลือ"
          lede="ไม่ต้องสมัครสมาชิก ส่งได้จากมือถือ เบอร์จะไม่ขึ้นบนแผนที่สาธารณะ"
        />
        <Panel className="mb-4 bg-crit-soft">
          <p className="text-sm leading-relaxed">
            ถ้าติดอยู่ในที่อันตรายหรือมีคนเจ็บ ให้โทร{" "}
            <a className="font-semibold" href="tel:1784">1784</a> หรือ{" "}
            <a className="font-semibold" href="tel:1669">1669</a> ก่อน หน้านี้คือชั้นประสานงาน
          </p>
        </Panel>
        <div className="space-y-4">
          <Field label="ต้องการความช่วยเหลือเรื่องอะไร" error={errors.type}>
            <div className="grid grid-cols-1 gap-2">
              {HELP_TYPES.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={type === item}
                  onClick={() => {
                    setType(item);
                    setErrors((prev) => ({ ...prev, type: undefined }));
                    if (item === "trapped" || item === "vulnerable") setPriority("critical");
                    else if (item === "evacuation" || item === "medicine") setPriority("high");
                  }}
                  className={cn(
                    "min-h-11 rounded-xl border px-3 text-left text-sm font-semibold",
                    type === item ? "border-blue bg-blue-soft text-blue" : "border-line bg-surface",
                  )}
                >
                  {TYPE_LABEL[item]}
                </button>
              ))}
            </div>
          </Field>
          <Field label="พิกัด" hint="กด GPS ได้เลย ระบบจะเลือกอำเภอให้ พิกัดจริงเห็นเฉพาะผู้ประสานและทีมที่รับงาน">
            <LocationField
              value={pin}
              onChange={setPin}
              onDistrict={(id) => {
                if (id !== districtId) {
                  setDistrictId(id);
                  toast(`ตั้งอำเภอเป็น ${districtById(id)?.name ?? ""} ตามพิกัดแล้ว`);
                }
              }}
            />
            {type && isSensitive(type) ? (
              <p className="mt-1 text-xs text-watch">คำขอนี้จะไม่เปิดตำแหน่งบ้านบนแผนที่สาธารณะ</p>
            ) : null}
          </Field>
          <Field label="อำเภอ">
            <select className={controlClass} value={districtId} onChange={(e) => setDistrictId(e.target.value)}>
              {DISTRICTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="จุดสังเกต" hint="เช่น ชุมชน วัด ตลาด ไม่ต้องใส่บ้านเลขที่" error={errors.place}>
            <input
              className={controlClass}
              value={placeLabel}
              onChange={(e) => {
                setPlaceLabel(e.target.value);
                setErrors((prev) => ({ ...prev, place: undefined }));
              }}
            />
          </Field>
          <Field label="จำนวนคน">
            <input
              className={controlClass}
              inputMode="numeric"
              type="number"
              min={1}
              value={people}
              onChange={(e) => setPeople(Number(e.target.value))}
            />
          </Field>
          <Field label="เกิดอะไรขึ้น" hint="เขียนสั้น ๆ ได้ ไม่ต้องยาว" error={errors.detail}>
            <textarea
              className={cn(controlClass, "min-h-28 py-3")}
              value={detail}
              onChange={(e) => {
                setDetail(e.target.value);
                setErrors((prev) => ({ ...prev, detail: undefined }));
              }}
            />
          </Field>
          <Field label="เบอร์ติดต่อ" hint="ผู้ประสานและทีมที่รับงานเท่านั้นที่เห็น" error={errors.phone}>
            <input
              className={controlClass}
              inputMode="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              placeholder="0812345678"
            />
          </Field>
          <Field label="ความเร่งด่วน">
            <div className="grid grid-cols-2 gap-2">
              {PRIORITIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={priority === item}
                  onClick={() => setPriority(item)}
                  className={cn(
                    "min-h-11 rounded-xl border text-sm font-semibold",
                    priority === item ? "border-blue bg-blue-soft text-blue" : "border-line bg-surface",
                  )}
                >
                  {PRIORITY_LABEL[item]}
                </button>
              ))}
            </div>
          </Field>
          <Field label="รูปภาพ ไม่บังคับ">
            <PhotoField value={photo} onChange={setPhoto} hint="รูปช่วยให้ทีมเตรียมของและเรือได้ถูก เห็นเฉพาะผู้ประสานและทีมที่รับงาน" />
          </Field>
          <Button className="w-full" variant="danger" disabled={busy} onClick={() => void submit()}>
            ส่งคำร้อง
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

