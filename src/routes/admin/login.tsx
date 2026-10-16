import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell";
import { Button, Field, PageIntro, Panel, controlClass } from "@/components/ui";
import { useFloodStore } from "@/lib/store";

export const Route = createFileRoute("/admin/login")({ component: AdminLogin });

function AdminLogin() {
  const navigate = useNavigate();
  const role = useFloodStore((s) => s.role);
  const loginAdmin = useFloodStore((s) => s.loginAdmin);
  const logout = useFloodStore((s) => s.logout);
  const demoAdminCode = useFloodStore((s) => s.demoAdminCode);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    const ok = await loginAdmin(code);
    setBusy(false);
    if (!ok) {
      toast("รหัสไม่ตรง หรือลองผิดหลายครั้งเกินไป");
      return;
    }
    toast("เข้าห้องข่าวกรองแล้ว");
    void navigate({ to: "/intel" });
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-lg px-4 py-4">
        <PageIntro
          title="เข้าสู่ระบบแอดมิน"
          lede="รหัสตรวจบนเซิร์ฟเวอร์ เข้าครั้งเดียวใช้ได้ทั้งศูนย์ประสานและ UBON Six Seven Intelligence"
        />
        {role === "coordinator" ? (
          <Panel>
            <p className="font-semibold">เข้าสู่ระบบผู้ประสานแล้ว</p>
            <p className="mt-1 text-sm text-muted">ใช้ได้ทั้งศูนย์ประสานและห้องข่าวกรอง</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/coord" className="inline-flex min-h-11 items-center rounded-xl bg-blue px-4 text-sm font-semibold text-surface">
                ไปศูนย์ประสาน
              </Link>
              <Button
                variant="soft"
                onClick={() => void logout()}
              >
                ออกจากระบบ
              </Button>
            </div>
          </Panel>
        ) : null}
        <div className="mt-4 space-y-4">
          {demoAdminCode ? (
            <Panel>
              <p className="text-sm leading-relaxed">
                รหัสต้นแบบสำหรับรีวิวคือ <span className="font-semibold text-navy">{demoAdminCode}</span>
              </p>
            </Panel>
          ) : null}
          <Field label="รหัสผู้ประสาน">
            <input
              className={controlClass}
              value={code}
              autoComplete="off"
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submit();
              }}
            />
          </Field>
          <Button className="w-full" disabled={busy} onClick={() => void submit()}>
            เข้าสู่ระบบ
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
