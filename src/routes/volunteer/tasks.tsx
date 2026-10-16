import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/shell";
import { Button, PageIntro, Panel, Pill } from "@/components/ui";
import { STATUS_LABEL, TYPE_LABEL, canSeePrivate, districtById, toneForPriority, PRIORITY_LABEL } from "@/lib/model";
import { useFloodStore } from "@/lib/store";

export const Route = createFileRoute("/volunteer/tasks")({ component: Tasks });

function Tasks() {
  const activeVolunteerId = useFloodStore((s) => s.activeVolunteerId);
  const volunteers = useFloodStore((s) => s.volunteers);
  const requests = useFloodStore((s) => s.requests);
  const assignments = useFloodStore((s) => s.assignments);
  const reports = useFloodStore((s) => s.reports);
  const progress = useFloodStore((s) => s.progress);
  const confirmReport = useFloodStore((s) => s.confirmReport);
  const role = useFloodStore((s) => s.role);
  const me = volunteers.find((vol) => vol.id === activeVolunteerId);
  const mine = assignments.filter(
    (item) => item.volunteerId === activeVolunteerId && item.status !== "released",
  );
  const checks = reports.filter((report) => report.checkerId === activeVolunteerId);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-lg px-4 py-4">
        <PageIntro title="งานของฉัน" lede={me ? me.name : "ยังไม่ได้เลือกโปรไฟล์อาสา"} />
        {!me ? (
          <Link to="/volunteer" className="font-semibold text-blue">
            ไปลงทะเบียนหรือเลือกโปรไฟล์ตัวอย่าง
          </Link>
        ) : me.approval === "pending" ? (
          <Panel>
            <p className="text-sm leading-relaxed">บัญชีนี้ยังรอแอดมินยืนยัน ยังเปิดงานไม่ได้</p>
            <Link to="/volunteer" className="mt-3 inline-flex min-h-11 items-center font-semibold text-blue">
              กลับหน้าอาสา
            </Link>
          </Panel>
        ) : null}
        {me && me.approval !== "pending" ? (
        <div className="space-y-3">
          {mine.map((item) => {
            const req = requests.find((row) => row.id === item.requestId);
            if (!req) return null;
            const priv = canSeePrivate(role, req, activeVolunteerId);
            return (
              <Panel key={item.id}>
                <div className="flex flex-wrap gap-2">
                  <Pill tone={toneForPriority(req.priority)}>{PRIORITY_LABEL[req.priority]}</Pill>
                  <Pill tone="info">{STATUS_LABEL[req.status]}</Pill>
                </div>
                <h2 className="mt-2 font-semibold">
                  {TYPE_LABEL[req.type]} · {districtById(req.districtId)?.name}
                </h2>
                <p className="text-sm text-muted">{req.placeLabel}</p>
                <p className="mt-2 text-sm leading-relaxed">{priv ? req.detail : req.publicDetail}</p>
                {priv ? (
                  <a className="mt-2 inline-flex min-h-11 items-center font-semibold text-blue" href={`tel:${req.phone}`}>
                    โทร {req.phone}
                  </a>
                ) : null}
                {req.photo && priv ? <img src={req.photo} alt="รูปที่ผู้แจ้งแนบ" className="mt-3 max-h-48 w-full rounded-xl object-cover" /> : null}
                <div className="mt-3 flex gap-2">
                  {req.status === "assigned" ? (
                    <Button onClick={() => progress(req.id, "in_progress")}>เริ่มช่วย</Button>
                  ) : null}
                  {req.status === "in_progress" ? (
                    <Button onClick={() => progress(req.id, "done")}>ช่วยเสร็จแล้ว</Button>
                  ) : null}
                </div>
              </Panel>
            );
          })}
          {checks.map((report) => (
            <Panel key={report.id}>
              <Pill tone="info">รายงานที่รับตรวจ</Pill>
              <h2 className="mt-2 font-semibold">{report.placeLabel}</h2>
              <p className="text-sm text-muted">{report.summary}</p>
              {report.verify === "pending" ? (
                <Button className="mt-3" variant="soft" onClick={() => confirmReport(report.id)}>
                  ยืนยันว่ายังตรง
                </Button>
              ) : (
                <p className="mt-2 text-xs text-muted">สถานะตรวจอัปเดตแล้ว รอผู้ประสานปิดถ้าจำเป็น</p>
              )}
            </Panel>
          ))}
          {me && mine.length === 0 && checks.length === 0 ? (
            <p className="text-sm text-muted">ยังไม่มีงานค้าง</p>
          ) : null}
        </div>
        ) : null}
      </div>
    </AppShell>
  );
}
