import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FloodMap, type LayerKey } from "@/components/flood-map";
import { getIntelIncidents } from "@/lib/intel/fns";
import { CATEGORY_LABEL, URGENCY_LABEL, VERIFY_LABEL } from "@/lib/intel/labels";
import { DISTRICTS } from "@/lib/model";

export const Route = createFileRoute("/intel/map")({
  loader: () => getIntelIncidents(),
  component: IntelMap,
});

const OFF: Record<LayerKey, boolean> = {
  situation: false,
  requests: true,
  reports: false,
  shelters: true,
  relief: false,
  volunteers: false,
  roads: false,
};

function IntelMap() {
  const data = Route.useLoaderData();
  const [districtId, setDistrictId] = useState("all");
  const [category, setCategory] = useState("all");
  const [verification, setVerification] = useState("all");
  const [urgency, setUrgency] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const items = data.ok ? data.items : [];
  const filtered = useMemo(
    () =>
      items.filter((item) => {
        if (districtId !== "all" && item.districtId !== districtId) return false;
        if (category !== "all" && item.category !== category) return false;
        if (verification !== "all" && item.verification !== verification) return false;
        if (urgency !== "all" && item.urgency !== urgency) return false;
        return item.lng != null && item.lat != null;
      }),
    [items, districtId, category, verification, urgency],
  );
  const selectedItem = filtered.find((item) => item.id === selected) ?? null;
  if (!data.ok) return <p className="text-sm">ไม่มีสิทธิ์</p>;
  return (
    <div>
      <h1 className="text-xl font-medium text-navy">แผนที่เหตุในพื้นที่ที่ได้รับอนุญาต</h1>
      <p className="mt-1 text-xs text-muted">จุดน้ำเงินคือรายงานที่ยังไม่ยืนยัน จุดแดงคือเหตุวิกฤตที่ยืนยันแล้ว ที่พักเป็นจุดของชุดสาธิตสาธารณะ</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <select className="min-h-11 border border-line bg-surface px-2 text-sm" value={districtId} onChange={(event) => setDistrictId(event.target.value)}>
          <option value="all">ทุกอำเภอ</option>
          {DISTRICTS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select className="min-h-11 border border-line bg-surface px-2 text-sm" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">ทุกหมวด</option>
          {Object.entries(CATEGORY_LABEL).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <select className="min-h-11 border border-line bg-surface px-2 text-sm" value={verification} onChange={(event) => setVerification(event.target.value)}>
          <option value="all">ทุกสถานะตรวจ</option>
          {Object.entries(VERIFY_LABEL).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <select className="min-h-11 border border-line bg-surface px-2 text-sm" value={urgency} onChange={(event) => setUrgency(event.target.value)}>
          <option value="all">ทุกความเร่งด่วน</option>
          {Object.entries(URGENCY_LABEL).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="relative mt-3 h-[420px] overflow-hidden border border-line">
        <FloodMap
          layers={OFF}
          chrome={false}
          storeData={false}
          markers={filtered.map((item) => ({
            id: item.id,
            lng: item.lng ?? 0,
            lat: item.lat ?? 0,
            label: `${VERIFY_LABEL[item.verification] ?? ""} ${item.placeLabel}`,
            tone: item.verification === "verified" && item.urgency === "critical" ? "#b42318" : item.verification === "verified" ? "#c2410c" : "#1f4f8a",
          }))}
          onSelect={(selection) => setSelected(selection?.id ?? null)}
          selectedId={selected ?? undefined}
        />
      </div>
      {selectedItem ? (
        <div className="mt-3 border border-line bg-surface p-3 text-sm">
          <p className="font-medium text-navy">{selectedItem.summary}</p>
          <p className="mt-1 text-muted">
            {selectedItem.districtName} · {VERIFY_LABEL[selectedItem.verification]} · {selectedItem.locationMasked ? "จุดถูกเบลอ" : "จุดตามที่บันทึก"}
          </p>
          <Link to="/intel/review/$id" params={{ id: selectedItem.id }} className="mt-2 inline-flex text-blue">
            เปิดรายงาน
          </Link>
        </div>
      ) : null}
    </div>
  );
}
