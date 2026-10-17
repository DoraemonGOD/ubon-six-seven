import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { LocationField, type GeoValue } from "@/components/location-field";
import { PhotoField } from "@/components/photo-field";
import { AppShell } from "@/components/shell";
import { Button, Field, PageIntro, controlClass } from "@/components/ui";
import { DISTRICTS, districtById } from "@/lib/model";
import { ingestPublicReport } from "@/lib/intel/fns";
import { useFloodStore } from "@/lib/store";

export const Route = createFileRoute("/report/new")({ component: ReportNew });

function ReportNew() {
  const submitReport = useFloodStore((s) => s.submitReport);
  const role = useFloodStore((s) => s.role);
  const [districtId, setDistrictId] = useState("mueang");
  const [placeLabel, setPlaceLabel] = useState("");
  const [summary, setSummary] = useState("");
  const [pin, setPin] = useState<GeoValue | null>(null);
  const [photo, setPhoto] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState(() => {
    const district = districtById("mueang");
    return district ? { lng: district.lng, lat: district.lat, key: 1 } : null;
  });
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<{ place?: string; summary?: string }>({});

  function chooseDistrict(id: string) {
    setDistrictId(id);
    const district = districtById(id);
    if (district) setFocus({ lng: district.lng, lat: district.lat, key: Date.now() });
  }

  async function submit() {
    const next = {
      place: placeLabel.trim().length >= 2 ? undefined : "ใส่จุดที่เห็น เช่น ชุมชน หรือถนน",
      summary: summary.trim().length >= 2 ? undefined : "บอกสั้น ๆ ว่าเห็นอะไร",
    };
    setErrors(next);
    const first = next.place ?? next.summary;
    if (first) {
      toast(first);
      return;
    }
    setBusy(true);
    const id = await submitReport({
      districtId,
      placeLabel,
      summary,
      lng: pin?.lng,
      lat: pin?.lat,
      accuracy: pin?.accuracy,
      via: pin?.via,
      photo,
    });
    setBusy(false);
    if (!id) {
      toast("ส่งไม่ได้ ลองอีกครั้ง");
      return;
    }
    void ingestPublicReport({
      data: { districtId, placeLabel, text: summary, category: "other", lng: pin?.lng, lat: pin?.lat },
    });
    setDone(true);
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-lg px-4 py-4">
        <PageIntro
          title="แจ้งสถานการณ์"
          lede="ใช้เมื่ออยากบอกว่าน้ำเป็นอย่างไร ไม่ได้ขอของหรือขอทีม รายงานจะขึ้นเป็นรอตรวจสอบ"
        />
        {done ? (
          <div className="rounded-md border border-line bg-surface p-4">
            <p className="font-medium">รับรายงานแล้ว</p>
            <p className="mt-1 text-sm text-muted">
              แหล่งที่มาถูกปักเป็น{role === "student" ? "นักศึกษา" : role === "volunteer" ? "อาสาสมัคร" : "ประชาชน"}
              {pin ? " พร้อมพิกัด" : " จุดคร่าว ๆ อยู่ที่อำเภอที่เลือก"}
              {photo ? " และรูป" : ""} ยังไม่ใช่ข้อมูลหน่วยงาน
            </p>
            <div className="mt-4 flex flex-wrap gap-4">
              <Link to="/reports" className="inline-flex min-h-11 items-center font-semibold text-blue">
                ดูรายงานทั้งหมด
              </Link>
              <Link to="/" className="inline-flex min-h-11 items-center font-medium text-muted">
                กลับหน้าแรก
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="พิกัดจุดที่เห็น" hint="กด GPS ถ้ายืนอยู่ตรงนั้น ระบบจะเลือกอำเภอให้">
              <LocationField
                value={pin}
                onChange={setPin}
                focus={focus}
                onDistrict={(id) => {
                  if (id !== districtId) {
                    setDistrictId(id);
                    toast(`ตั้งอำเภอเป็น ${districtById(id)?.name ?? ""} ตามพิกัดแล้ว`);
                  }
                }}
              />
            </Field>
            <Field label="อำเภอ">
              <select className={controlClass} value={districtId} onChange={(e) => chooseDistrict(e.target.value)}>
                {DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="จุดที่เห็น" error={errors.place}>
              <input
                className={controlClass}
                value={placeLabel}
                onChange={(e) => {
                  setPlaceLabel(e.target.value);
                  setErrors((prev) => ({ ...prev, place: undefined }));
                }}
              />
            </Field>
            <Field label="สิ่งที่เกิดขึ้น" hint="เขียนสั้น ๆ ได้" error={errors.summary}>
              <textarea
                className={`${controlClass} min-h-28 py-3`}
                value={summary}
                onChange={(e) => {
                  setSummary(e.target.value);
                  setErrors((prev) => ({ ...prev, summary: undefined }));
                }}
              />
            </Field>
            <Field label="รูปภาพ ไม่บังคับ">
              <PhotoField value={photo} onChange={setPhoto} hint="ถ่ายระดับน้ำ ถนน หรือสะพาน เลี่ยงการถ่ายหน้าคน รูปนี้ทุกคนเห็นได้" />
            </Field>
            <Button className="w-full" disabled={busy} onClick={() => void submit()}>
              ส่งรายงาน
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
