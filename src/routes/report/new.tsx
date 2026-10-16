import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { FloodMap, type LayerKey } from "@/components/flood-map";
import { AppShell } from "@/components/shell";
import { Button, Field, PageIntro, controlClass } from "@/components/ui";
import { DISTRICTS, districtById } from "@/lib/model";
import { ingestPublicReport } from "@/lib/intel/fns";
import { useFloodStore } from "@/lib/store";

export const Route = createFileRoute("/report/new")({ component: ReportNew });

const OFF: Record<LayerKey, boolean> = {
  situation: true,
  requests: false,
  reports: false,
  shelters: false,
  relief: false,
  volunteers: false,
  roads: false,
};

function ReportNew() {
  const submitReport = useFloodStore((s) => s.submitReport);
  const role = useFloodStore((s) => s.role);
  const [districtId, setDistrictId] = useState("mueang");
  const [placeLabel, setPlaceLabel] = useState("");
  const [summary, setSummary] = useState("");
  const [pin, setPin] = useState<{ lng: number; lat: number } | null>(null);
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
    const id = await submitReport({ districtId, placeLabel, summary, lng: pin?.lng, lat: pin?.lat });
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
              {pin ? " พร้อมจุดที่ปักบนแผนที่" : " จุดคร่าว ๆ อยู่ที่อำเภอที่เลือก"} และยังไม่ใช่ข้อมูลหน่วยงาน
            </p>
            <Link to="/" className="mt-4 inline-flex min-h-11 items-center font-medium text-blue">
              กลับหน้าแรก
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
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
            <Field label="ปักจุดบนแผนที่" hint="ไม่บังคับ แตะแผนที่เพื่อวางหมุด ถ้าไม่ปักจะใช้จุดกลางอำเภอ">
              <div className="relative h-64 overflow-hidden rounded-md border border-line">
                <FloodMap layers={OFF} onPick={(lng, lat) => setPin({ lng, lat })} pick={pin} focus={focus} chrome={false} />
              </div>
              <p className="mt-1 text-xs text-muted">{pin ? "ปักจุดแล้ว" : "ยังไม่ปัก"}</p>
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
            <Button className="w-full" onClick={() => void submit()}>
              ส่งรายงาน
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
