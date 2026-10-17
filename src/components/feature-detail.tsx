import { Link } from "@tanstack/react-router";
import {
  DISTRICTS,
  PRIORITY_LABEL,
  ROAD_LABEL,
  ROADS,
  SOURCE_LABEL,
  STATUS_LABEL,
  SUPPLY_LABEL,
  TYPE_LABEL,
  VERIFY_LABEL,
  canSeePrivate,
  districtById,
  isOpenStatus,
  supplyState,
  toneForLevel,
  toneForPriority,
  toneForRoad,
  toneForVerify,
  type MapSelection,
} from "@/lib/model";
import { useFloodStore } from "@/lib/store";
import { ago } from "@/lib/time";
import { Button, Pill } from "@/components/ui";

export function FeatureDetail({
  sel,
  onClose,
}: {
  sel: MapSelection;
  onClose: () => void;
}) {
  const role = useFloodStore((s) => s.role);
  const shelters = useFloodStore((s) => s.shelters);
  const supplies = useFloodStore((s) => s.supplies);
  const requests = useFloodStore((s) => s.requests);
  const reports = useFloodStore((s) => s.reports);
  const volunteers = useFloodStore((s) => s.volunteers);
  const activeVolunteerId = useFloodStore((s) => s.activeVolunteerId);
  const claimReport = useFloodStore((s) => s.claimReport);
  const confirmReport = useFloodStore((s) => s.confirmReport);

  let body = null;

  if (sel.kind === "district") {
    const district = districtById(sel.id);
    if (!district) return null;
    const open = requests.filter((req) => req.districtId === district.id && isOpenStatus(req.status));
    body = (
      <>
        <Pill tone={toneForLevel(district.level)}>{district.level === "normal" ? "ปกติ" : district.level === "watch" ? "เฝ้าระวัง" : district.level === "affected" ? "ได้รับผลกระทบ" : "วิกฤต"}</Pill>
        <h2 className="mt-2 text-lg font-semibold">{district.name}</h2>
        <p className="text-sm text-muted">ลุ่มน้ำ{district.basin}</p>
        <p className="mt-2 text-sm">คำร้องที่ยังไม่จบ {open.length} เรื่อง</p>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          สีสถานะพื้นที่ในต้นแบบนี้เป็นชุดสาธิตตามแนวน้ำมูล ชี และโขง ไม่ใช่ประกาศของหน่วยงานราชการ
        </p>
      </>
    );
  }

  if (sel.kind === "request") {
    const req = requests.find((item) => item.id === sel.id);
    if (!req) return null;
    const district = districtById(req.districtId);
    const priv = canSeePrivate(role, req, activeVolunteerId);
    body = (
      <>
        <div className="flex flex-wrap gap-2">
          <Pill tone={toneForPriority(req.priority)}>{PRIORITY_LABEL[req.priority]}</Pill>
          <Pill tone="info">{STATUS_LABEL[req.status]}</Pill>
          <Pill tone={toneForVerify(req.verify)}>{VERIFY_LABEL[req.verify]}</Pill>
        </div>
        <h2 className="mt-2 text-lg font-semibold">{TYPE_LABEL[req.type]}</h2>
        <p className="text-sm text-muted">
          {district?.name} · {req.placeLabel}
        </p>
        <p className="mt-2 text-sm leading-relaxed">{priv ? req.detail : req.publicDetail}</p>
        <p className="mt-2 text-sm">ผู้ประสบภัยประมาณ {req.people} คน</p>
        <Meta source={req.source} created={req.createdAt} updated={req.updatedAt} />
        {priv ? (
          <a className="mt-3 inline-flex min-h-11 items-center font-semibold text-blue" href={`tel:${req.phone}`}>
            โทร {req.phone}
          </a>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-muted">เบอร์โทรไม่แสดงบนแผนที่สาธารณะ</p>
        )}
        {req.precision === "tambon" ? (
          <p className="mt-1 text-xs text-muted">จุดนี้ปักระดับอำเภอ เพื่อไม่เปิดตำแหน่งบ้าน</p>
        ) : null}
        {role === "coordinator" ? (
          <Link to="/coord/requests/$id" params={{ id: req.id }} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-blue">
            เปิดในศูนย์ประสาน
          </Link>
        ) : null}
      </>
    );
  }

  if (sel.kind === "report") {
    const report = reports.find((item) => item.id === sel.id);
    if (!report) return null;
    const district = districtById(report.districtId);
    const me = volunteers.find((vol) => vol.id === activeVolunteerId);
    body = (
      <>
        <div className="flex flex-wrap gap-2">
          <Pill tone={toneForVerify(report.verify)}>{VERIFY_LABEL[report.verify]}</Pill>
          <Pill tone="muted">รายงานสถานการณ์</Pill>
        </div>
        <h2 className="mt-2 text-lg font-semibold">{report.placeLabel}</h2>
        <p className="text-sm text-muted">{district?.name}</p>
        <p className="mt-2 text-sm leading-relaxed">{report.summary}</p>
        <Meta source={report.source} created={report.createdAt} updated={report.updatedAt} />
        {me && me.approval !== "pending" && report.verify !== "verified" ? (
          <div className="mt-3 flex flex-col gap-2">
            {!report.checkerId ? (
              <Button variant="soft" onClick={() => claimReport(report.id)}>
                รับไปตรวจในพื้นที่
              </Button>
            ) : report.checkerId === me.id ? (
              <Button onClick={() => confirmReport(report.id)}>ยืนยันว่าข้อมูลยังตรง</Button>
            ) : (
              <p className="text-xs text-muted">มีคนรับตรวจรายงานนี้แล้ว</p>
            )}
          </div>
        ) : null}
      </>
    );
  }

  if (sel.kind === "shelter") {
    const shelter = shelters.find((item) => item.id === sel.id);
    if (!shelter) return null;
    const district = districtById(shelter.districtId);
    const pct = shelter.capacity ? Math.min(100, Math.round((shelter.current / shelter.capacity) * 100)) : 100;
    body = (
      <>
        <Pill tone="info">ศูนย์พักพิง</Pill>
        <h2 className="mt-2 text-lg font-semibold">{shelter.name}</h2>
        <p className="text-sm text-muted">{district?.name}</p>
        <p className="mt-2 text-sm">
          คนปัจจุบัน {shelter.current} / รับได้ {shelter.capacity}
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg">
          <div className="h-full bg-blue" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-sm">{shelter.facilities.join(" · ")}</p>
        {shelter.contact ? <p className="mt-2 text-sm">ติดต่อจุดพัก {shelter.contact}</p> : null}
        <p className="mt-2 text-xs leading-relaxed text-muted">
          แหล่งที่มา: {SOURCE_LABEL[shelter.source]}
          {shelter.note ? ` · ${shelter.note}` : ""}
        </p>
      </>
    );
  }

  if (sel.kind === "relief") {
    const item = supplies.find((supply) => supply.id === sel.id);
    if (!item) return null;
    const district = districtById(item.districtId);
    const state = supplyState(item);
    body = (
      <>
        <Pill tone={state === "fulfilled" ? "ok" : state === "partial" ? "hit" : "crit"}>{SUPPLY_LABEL[state]}</Pill>
        <h2 className="mt-2 text-lg font-semibold">
          {item.item} · {district?.name}
        </h2>
        <p className="mt-2 text-sm">
          มีแล้ว {item.have.toLocaleString("th-TH")} จากที่ต้องการ {item.needed.toLocaleString("th-TH")}
        </p>
        <p className="mt-2 text-xs text-muted">อัปเดตโดยผู้ประสานในหลังบ้าน</p>
      </>
    );
  }

  if (sel.kind === "volunteerArea") {
    const district = DISTRICTS.find((item) => item.id === sel.id);
    const people = volunteers.filter((vol) => vol.districtIds.includes(sel.id));
    body = (
      <>
        <Pill tone="ok">ทีมในพื้นที่</Pill>
        <h2 className="mt-2 text-lg font-semibold">{district?.name}</h2>
        <p className="mt-2 text-sm">มีอาสาที่รับพื้นที่นี้ {people.length} คน</p>
        <ul className="mt-2 space-y-1 text-sm">
          {people.map((vol) => (
            <li key={vol.id}>{vol.name}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs leading-relaxed text-muted">ไม่แสดงพิกัดตัวคน และไม่แสดงเบอร์บนแผนที่สาธารณะ</p>
      </>
    );
  }

  if (sel.kind === "road") {
    const road = ROADS.find((item) => item.id === sel.id);
    if (!road) return null;
    body = (
      <>
        <Pill tone={toneForRoad(road.state)}>{ROAD_LABEL[road.state]}</Pill>
        <h2 className="mt-2 text-lg font-semibold">{road.name}</h2>
        <p className="mt-2 text-sm leading-relaxed">{road.note}</p>
        <p className="mt-2 text-xs text-muted">แหล่งที่มา: {SOURCE_LABEL[road.source]} · ชุดสาธิต</p>
      </>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wide text-muted">รายละเอียด</p>
        <button type="button" className="min-h-11 px-2 text-sm font-semibold text-blue" onClick={onClose}>
          ปิด
        </button>
      </div>
      {body}
    </div>
  );
}

function Meta({ source, created, updated }: { source: keyof typeof SOURCE_LABEL; created: string; updated: string }) {
  return (
    <p className="mt-2 text-xs leading-relaxed text-muted">
      แหล่งที่มา: {SOURCE_LABEL[source]}
      {source !== "agency" ? " · ไม่ใช่ประกาศราชการ" : ""}
      <br />
      รายงานเมื่อ {ago(created)} · อัปเดตล่าสุด {ago(updated)}
    </p>
  );
}
