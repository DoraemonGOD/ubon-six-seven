import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/shell";
import { Button, PageIntro, Panel } from "@/components/ui";
import { useState } from "react";
import { toast } from "sonner";
import { useFloodStore } from "@/lib/store";

export const Route = createFileRoute("/about")({ component: About });

function About() {
  const resetDemo = useFloodStore((s) => s.resetDemo);
  const role = useFloodStore((s) => s.role);
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-lg px-4 py-4">
        <PageIntro
          title="เกี่ยวกับโครงการ"
          lede="UBON Six Seven เป็นต้นแบบศูนย์ประสานน้ำท่วมของจังหวัดอุบลราชธานี สำหรับเครือข่ายมหาวิทยาลัย ชุมชน และหน่วยช่วยเหลือ"
        />
        <div className="space-y-3 text-sm leading-relaxed">
          <Panel>
            <p>
              เว็บนี้เชื่อมคนที่เดือดร้อนเข้ากับคนที่ช่วยได้ ผ่านแผนที่ คำร้อง และคิวงาน ไม่ได้ทำหน้าที่แทนสายด่วนฉุกเฉิน
            </p>
            <p className="mt-2">
              อันตรายถึงชีวิต โทร <a className="font-semibold text-crit" href="tel:1784">1784</a> ปภ. หรือ{" "}
              <a className="font-semibold text-crit" href="tel:1669">1669</a> การแพทย์ฉุกเฉิน ไฟฟ้าขัดข้อง{" "}
              <a className="font-semibold" href="tel:1129">1129</a>
            </p>
          </Panel>
          <Panel>
            <p className="font-semibold">ขอบเขตของต้นแบบนี้</p>
            <p className="mt-2 text-muted">
              ข้อมูลอำเภอ จุดร้องขอ ศูนย์พักพิง และของขาด เป็นชุดสาธิตที่เก็บบนเซิร์ฟเวอร์ ทุกเครื่องเห็นชุดเดียวกัน ยังไม่ส่งถึงหน่วยงานจริง และยังไม่เปิดโหมดฟื้นฟูบ้าน ถนน โรงเรียน และที่นา
            </p>
            <p className="mt-2 text-muted">
              สมัครอาสาหรือเข้าด้วยบัญชีตัวอย่างได้ที่หน้าอาสาสมัคร ผู้ประสานใช้รหัสบนหน้าเข้าสู่ระบบแอดมิน ข้อมูลยังไม่ถูกส่งออกไปหน่วยงานจริง
            </p>
          </Panel>
          <Panel>
            <p>
              อ่านเรื่องข้อมูลที่เปิดและข้อมูลที่ล็อกได้ที่หน้า{" "}
              <Link to="/privacy" className="font-semibold text-blue">
                ความเป็นส่วนตัว
              </Link>
            </p>
          </Panel>
          {role === "coordinator" ? (
            confirmReset ? (
              <Panel>
                <p className="text-sm font-semibold">ล้างข้อมูลทุกเครื่องแล้วโหลดชุดตัวอย่างใหม่?</p>
                <p className="mt-1 text-sm text-muted">คำร้องและอาสาที่เพิ่มเข้ามาจะหายทั้งหมด</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="danger"
                    onClick={() => {
                      setConfirmReset(false);
                      void resetDemo().then((ok) => toast(ok ? "โหลดข้อมูลตัวอย่างใหม่แล้ว" : "ล้างไม่ได้"));
                    }}
                  >
                    ล้างเลย
                  </Button>
                  <Button variant="soft" onClick={() => setConfirmReset(false)}>
                    ยกเลิก
                  </Button>
                </div>
              </Panel>
            ) : (
              <Button variant="soft" onClick={() => setConfirmReset(true)}>
                ล้างแล้วโหลดข้อมูลตัวอย่างใหม่ (ทุกเครื่อง)
              </Button>
            )
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
