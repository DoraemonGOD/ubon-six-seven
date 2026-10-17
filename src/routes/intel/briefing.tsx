import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { getIntelBriefing } from "@/lib/intel/fns";
import { CATEGORY_LABEL, VERIFY_LABEL } from "@/lib/intel/labels";
import { DISTRICTS } from "@/lib/model";

export const Route = createFileRoute("/intel/briefing")({
  loader: () => getIntelBriefing({ data: {} }),
  component: Briefing,
});

function Briefing() {
  const initial = Route.useLoaderData();
  const [data, setData] = useState(initial);
  const [districtId, setDistrictId] = useState("");
  const [category, setCategory] = useState("");
  const [verification, setVerification] = useState("");
  if (!data.ok) return <p className="text-sm">ไม่มีสิทธิ์</p>;
  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy">สรุปสถานการณ์อัตโนมัติ</h1>
      <p className="mt-1 text-sm text-muted">
        สรุปจากแถวที่คุณมีสิทธิ์เห็น ณ {data.generatedAt} ไม่ได้เรียกโมเดลภายนอก ({data.modelLabel})
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <select className="min-h-11 rounded-xl border border-line bg-surface px-3 text-sm" value={districtId} onChange={(event) => setDistrictId(event.target.value)}>
          <option value="">ทุกอำเภอในสิทธิ์</option>
          {DISTRICTS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select className="min-h-11 rounded-xl border border-line bg-surface px-3 text-sm" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">ทุกหมวด</option>
          {Object.entries(CATEGORY_LABEL).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <select className="min-h-11 rounded-xl border border-line bg-surface px-3 text-sm" value={verification} onChange={(event) => setVerification(event.target.value)}>
          <option value="">ทุกสถานะ</option>
          {Object.entries(VERIFY_LABEL).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="min-h-11 border border-line bg-navy px-3 text-sm text-surface"
          onClick={async () => {
            const next = await getIntelBriefing({ data: { districtId, category, verification } });
            setData(next);
          }}
        >
          สรุปใหม่
        </button>
      </div>
      <p className="mt-4 border border-watch bg-watch-soft p-3 text-sm text-watch">{data.gap}</p>
      <Block title="เหตุที่ยืนยันแล้ว" rows={data.verified} />
      <Block title="เรื่องเร่งที่ยังไม่จบ" rows={data.urgent} />
      <Block title="ยังต้องตรวจภาคสนาม" rows={data.unverified} />
      <section className="mt-4">
        <h2 className="text-sm font-medium text-navy">ของที่ขาด</h2>
        <ul className="mt-2 text-sm">
          {data.shortages.map((row) => (
            <li key={row.id} className="border-b border-line py-2">
              {row.text}
              {row.isDemo ? " · สาธิต" : ""}
            </li>
          ))}
        </ul>
      </section>
      {data.uncovered.length > 0 ? (
        <p className="mt-4 text-xs text-muted">ยังไม่มีรายงานในชุดนี้: {data.uncovered.slice(0, 8).join(", ")} และอีก {Math.max(0, data.uncovered.length - 8)} อำเภอ</p>
      ) : null}
    </div>
  );
}

function Block({ title, rows }: { title: string; rows: { id: string; text: string; updatedAt?: string }[] }) {
  return (
    <section className="mt-4">
      <h2 className="text-sm font-medium text-navy">{title}</h2>
      <ul className="mt-2 text-sm">
        {rows.length === 0 ? <li className="text-muted">ไม่มีในตัวกรองนี้</li> : null}
        {rows.map((row) => (
          <li key={row.id} className="border-b border-line py-2">
            <Link to="/intel/review/$id" params={{ id: row.id }} className="text-navy">
              {row.text}
            </Link>
            {row.updatedAt ? <span className="mt-0.5 block text-xs text-muted">อัปเดต {row.updatedAt}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
