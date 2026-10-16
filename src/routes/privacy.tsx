import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell";
import { PageIntro, Panel } from "@/components/ui";

export const Route = createFileRoute("/privacy")({ component: Privacy });

function Privacy() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-lg px-4 py-4">
        <PageIntro title="ความเป็นส่วนตัว" lede="แผนที่สาธารณะมีไว้ประสานงาน ไม่ใช่ที่เปิดข้อมูลส่วนตัวของผู้ประสบภัย" />
        <div className="space-y-3 text-sm leading-relaxed">
          <Panel>
            <p className="font-semibold">สิ่งที่คนทั่วไปเห็น</p>
            <p className="mt-2 text-muted">
              ประเภทคำร้อง ความเร่งด่วน สถานะ จำนวนคนคร่าว ๆ จุดสังเกต และเวลา พร้อมแหล่งที่มาว่ามาจากประชาชน ชุมชน นักศึกษา อาสา หรือหน่วยงาน
            </p>
          </Panel>
          <Panel>
            <p className="font-semibold">สิ่งที่แผนที่สาธารณะไม่แสดง</p>
            <p className="mt-2 text-muted">
              เบอร์โทร ชื่อเต็ม อาการป่วย และตำแหน่งบ้านของกลุ่มเปราะบาง คำขอยาและกลุ่มเปราะบางถูกปักแค่ระดับอำเภอ
            </p>
          </Panel>
          <Panel>
            <p className="font-semibold">ใครเห็นช่องทางติดต่อ</p>
            <p className="mt-2 text-muted">
              ในต้นแบบนี้ ผู้ประสานเห็นทั้งหมด อาสาเห็นเฉพาะงานที่รับแล้ว ผู้แจ้งติดตามคำร้องของตัวเองได้ด้วยเลข UBN
            </p>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
