import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell";
import { Button, Field, PageIntro, Panel, Pill, controlClass } from "@/components/ui";
import { intelLoginVolunteer, intelRegister } from "@/lib/intel/fns";
import { suggestionsFor } from "@/lib/match";
import {
  DISTRICTS,
  PRIORITY_LABEL,
  SKILL_LABEL,
  SKILL_LIST,
  TYPE_LABEL,
  VEHICLE_LABEL,
  districtById,
  toneForPriority,
  type Skill,
  type Vehicle,
} from "@/lib/model";
import { useFloodStore } from "@/lib/store";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/volunteer/")({ component: VolunteerHome });

const DEMOS = [
  { phone: "0815550101", name: "สมชาย ใจดี" },
  { phone: "0825550102", name: "อามีนา ศรีอุบล" },
  { phone: "0835550103", name: "วิชัย พรหมมา" },
  { phone: "0845550104", name: "นภา วงศ์ไทย" },
];

const TIME_SLOTS = [
  { id: "morning", label: "เช้า", hint: "06:00–12:00" },
  { id: "afternoon", label: "บ่าย", hint: "12:00–17:00" },
  { id: "evening", label: "เย็น", hint: "17:00–21:00" },
  { id: "night", label: "กลางคืน", hint: "21:00–06:00" },
] as const;

const WEEKDAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function VolunteerHome() {
  const navigate = useNavigate();
  const volunteers = useFloodStore((s) => s.volunteers);
  const requests = useFloodStore((s) => s.requests);
  const reports = useFloodStore((s) => s.reports);
  const activeVolunteerId = useFloodStore((s) => s.activeVolunteerId);
  const registerVolunteer = useFloodStore((s) => s.registerVolunteer);
  const loginVolunteer = useFloodStore((s) => s.loginVolunteer);
  const logout = useFloodStore((s) => s.logout);
  const assign = useFloodStore((s) => s.assign);
  const claimReport = useFloodStore((s) => s.claimReport);
  const me = volunteers.find((vol) => vol.id === activeVolunteerId);

  const [tab, setTab] = useState<"join" | "login">("join");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [student, setStudent] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle>("none");
  const [freeDates, setFreeDates] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [districtIds, setDistrictIds] = useState<string[]>(["mueang"]);
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const ideas = me ? suggestionsFor(me, requests, reports) : [];
  const openDays = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      const prefix = index === 0 ? "วันนี้" : index === 1 ? "พรุ่งนี้" : WEEKDAYS[date.getDay()];
      return { key, label: `${prefix} ${date.getDate()} ${MONTHS[date.getMonth()]}` };
    });
  }, []);

  function toggleSkill(skill: Skill) {
    setSkills((prev) => (prev.includes(skill) ? prev.filter((item) => item !== skill) : [...prev, skill]));
  }

  function toggleDistrict(id: string) {
    setDistrictIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function toggleDate(key: string) {
    setFreeDates((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));
  }

  function toggleTime(id: string) {
    setTimeSlots((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  async function submit() {
    const digits = phone.replace(/\D/g, "");
    if (name.trim().length < 2 || digits.length < 9 || skills.length === 0 || districtIds.length === 0) {
      toast("ใส่ชื่อ เบอร์ ทักษะ และพื้นที่ที่ไปได้");
      return;
    }
    if (password.length < 4) {
      toast("ตั้งรหัสอย่างน้อย 4 ตัว");
      return;
    }
    if (password !== password2) {
      toast("รหัสสองช่องไม่ตรงกัน");
      return;
    }
    if (freeDates.length === 0 || timeSlots.length === 0) {
      toast("เลือกวันที่ว่างและช่วงเวลาอย่างน้อยอย่างละหนึ่ง");
      return;
    }
    const windowText = [
      openDays
        .filter((day) => freeDates.includes(day.key))
        .map((day) => day.label)
        .join(", "),
      TIME_SLOTS.filter((slot) => timeSlots.includes(slot.id))
        .map((slot) => `${slot.label} ${slot.hint}`)
        .join(", "),
    ].join(" · ");
    const id = await registerVolunteer({
      name,
      phone: digits,
      kind: student ? "student" : "volunteer",
      skills,
      districtIds,
      vehicle,
      window: windowText,
      password,
    });
    void intelRegister({ data: { name, phone: digits, password, districtIds } });
    if (!id) {
      toast("เบอร์นี้มีในระบบแล้ว ลองเข้าสู่ระบบแทน");
      setTab("login");
      setLoginPhone(digits);
      return;
    }
    toast("สมัครแล้ว รอแอดมินยืนยันก่อนรับงาน");
  }

  async function login() {
    const client = await loginVolunteer(loginPhone, loginPassword);
    const server = await intelLoginVolunteer({ data: { phone: loginPhone, password: loginPassword } });
    if (client === "pending") {
      toast("บัญชียังรอแอดมินยืนยัน รับงานไม่ได้");
      return;
    }
    if (server.ok) {
      toast("เข้าห้องข่าวกรองแล้ว");
      void navigate({ to: "/intel" });
      return;
    }
    if (server.reason === "pending") {
      toast("บัญชียังรอการยืนยัน เข้าห้องข่าวกรองไม่ได้");
      return;
    }
    if (client !== "ok") {
      toast("เบอร์หรือรหัสไม่ตรง");
      return;
    }
    toast("เข้าสู่ระบบอาสาแล้ว บัญชีนี้ยังไม่มีสิทธิ์ข่าวกรอง");
  }

  async function demoLogin(demoPhone: string) {
    const result = await loginVolunteer(demoPhone, "demo1234");
    if (result !== "ok") toast("บัญชีตัวอย่างยังไม่พร้อม ลองล้างข้อมูลที่หน้าเกี่ยวกับ");
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-lg px-4 py-4">
        <PageIntro
          title="อาสาสมัคร"
          lede="สมัครแล้วต้องรอแอดมินกดยืนยันก่อนถึงจะรับงานได้"
        />
        {me ? (
          me.approval === "pending" ? (
            <Panel>
              <p className="text-xs font-semibold text-watch">รอแอดมินยืนยัน</p>
              <h2 className="mt-1 text-lg font-semibold">{me.name}</h2>
              <p className="mt-2 text-sm leading-relaxed">
                ส่งใบสมัครแล้ว ยังรับงานไม่ได้ จนกว่าแอดมินจะเข้าศูนย์ประสานแล้วกดยืนยันรายชื่อนี้
              </p>
              <p className="mt-2 text-sm text-muted">
                {me.kind === "student" ? "นักศึกษา" : "อาสาสมัคร"} · {VEHICLE_LABEL[me.vehicle]} · {me.window}
              </p>
              <button type="button" className="mt-3 min-h-11 text-sm font-semibold text-muted" onClick={() => void logout()}>
                ออกจากระบบ
              </button>
            </Panel>
          ) : (
          <div className="space-y-3">
            <Panel>
              <p className="text-xs text-muted">กำลังใช้งาน</p>
              <h2 className="text-lg font-semibold">{me.name}</h2>
              <p className="text-sm text-muted">
                {me.kind === "student" ? "นักศึกษา" : "อาสาสมัคร"} · {VEHICLE_LABEL[me.vehicle]} · {me.window}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link to="/volunteer/tasks" className="inline-flex min-h-11 items-center font-semibold text-blue">
                  ดูงานของฉัน
                </Link>
                <button type="button" className="min-h-11 text-sm font-semibold text-muted" onClick={() => void logout()}>
                  ออกจากระบบ
                </button>
              </div>
            </Panel>
            <h2 className="text-base font-semibold">งานที่น่าจะเหมาะ</h2>
            {ideas.length === 0 ? <p className="text-sm text-muted">ยังไม่มีงานว่างในพื้นที่ที่รับได้</p> : null}
            {ideas.map((idea) => {
              if (idea.kind === "request") {
                const req = requests.find((item) => item.id === idea.id);
                if (!req) return null;
                return (
                  <Panel key={idea.id}>
                    <div className="flex flex-wrap gap-2">
                      <Pill tone={toneForPriority(req.priority)}>{PRIORITY_LABEL[req.priority]}</Pill>
                      <Pill tone="muted">{TYPE_LABEL[req.type]}</Pill>
                    </div>
                    <p className="mt-2 font-semibold">
                      {districtById(req.districtId)?.name} · {req.placeLabel}
                    </p>
                    <p className="text-sm text-muted">{req.publicDetail}</p>
                    <p className="mt-2 text-xs text-muted">{idea.why}</p>
                    <Button className="mt-3" onClick={() => assign(req.id, me.id)}>
                      รับงานนี้
                    </Button>
                  </Panel>
                );
              }
              const report = reports.find((item) => item.id === idea.id);
              if (!report) return null;
              return (
                <Panel key={idea.id}>
                  <Pill tone="info">ตรวจข้อมูลภาคสนาม</Pill>
                  <p className="mt-2 font-semibold">{report.placeLabel}</p>
                  <p className="text-sm text-muted">{report.summary}</p>
                  <p className="mt-2 text-xs text-muted">{idea.why}</p>
                  <Button className="mt-3" variant="soft" onClick={() => claimReport(report.id)}>
                    รับไปตรวจ
                  </Button>
                </Panel>
              );
            })}
          </div>
          )
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={cn("min-h-11 rounded-xl text-sm font-semibold", tab === "join" ? "bg-navy text-surface" : "bg-surface text-ink")}
                onClick={() => setTab("join")}
              >
                สมัคร
              </button>
              <button
                type="button"
                className={cn("min-h-11 rounded-xl text-sm font-semibold", tab === "login" ? "bg-navy text-surface" : "bg-surface text-ink")}
                onClick={() => setTab("login")}
              >
                เข้าสู่ระบบ
              </button>
            </div>
            {tab === "login" ? (
              <div className="space-y-4">
                <Field label="เบอร์โทร">
                  <input className={controlClass} inputMode="tel" value={loginPhone} onChange={(e) => setLoginPhone(e.target.value)} />
                </Field>
                <Field label="รหัส">
                  <input className={controlClass} type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                </Field>
                <Button className="w-full" onClick={() => void login()}>
                  เข้าสู่ระบบ
                </Button>
                <Panel>
                  <p className="text-sm font-semibold">บัญชีตัวอย่าง</p>
                  <p className="mt-1 text-xs text-muted">รหัสทุกบัญชีคือ demo1234 ใช้รีวิวได้เลย</p>
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    {DEMOS.map((demo) => (
                      <button
                        key={demo.phone}
                        type="button"
                        className="min-h-11 rounded-xl border border-line px-3 text-left text-sm"
                        onClick={() => void demoLogin(demo.phone)}
                      >
                        <span className="font-semibold">{demo.name}</span>
                        <span className="mt-0.5 block text-xs text-muted">{demo.phone}</span>
                      </button>
                    ))}
                  </div>
                </Panel>
              </div>
            ) : (
              <div className="space-y-4">
                <Field label="ชื่อที่แสดง">
                  <input className={controlClass} value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="เบอร์">
                  <input className={controlClass} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </Field>
                <Field label="รหัส" hint="ใช้เข้าห้องข่าวกรองหลังผู้ดูแลยืนยัน บนเซิร์ฟเวอร์เก็บเป็นรหัสแฮช">
                  <input className={controlClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </Field>
                <Field label="ยืนยันรหัส">
                  <input className={controlClass} type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
                </Field>
                <button
                  type="button"
                  aria-pressed={student}
                  className={cn("min-h-11 w-full rounded-xl px-3 text-left text-sm font-semibold", student ? "bg-blue text-surface" : "bg-bg text-ink")}
                  onClick={() => setStudent((value) => !value)}
                >
                  {student ? "สมัครในฐานะนักศึกษาภาคสนาม" : "ฉันเป็นนักศึกษาภาคสนาม"}
                </button>
                <Field label="พาหนะ">
                  <select className={controlClass} value={vehicle} onChange={(e) => setVehicle(e.target.value as Vehicle)}>
                    {(Object.keys(VEHICLE_LABEL) as Vehicle[]).map((item) => (
                      <option key={item} value={item}>
                        {VEHICLE_LABEL[item]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="วันที่ว่าง">
                  <div className="flex flex-wrap gap-2">
                    {openDays.map((day) => (
                      <button
                        key={day.key}
                        type="button"
                        aria-pressed={freeDates.includes(day.key)}
                        onClick={() => toggleDate(day.key)}
                        className={cn("min-h-11 rounded-full px-3 text-sm font-semibold", freeDates.includes(day.key) ? "bg-blue text-surface" : "bg-bg text-ink")}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="เวลาที่ไปได้">
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_SLOTS.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        aria-pressed={timeSlots.includes(slot.id)}
                        onClick={() => toggleTime(slot.id)}
                        className={cn("min-h-11 rounded-xl px-3 text-left text-sm", timeSlots.includes(slot.id) ? "bg-navy text-surface" : "bg-bg text-ink")}
                      >
                        <span className="block font-semibold">{slot.label}</span>
                        <span className={cn("block text-xs", timeSlots.includes(slot.id) ? "text-mist" : "text-muted")}>{slot.hint}</span>
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="ทักษะและงานที่ทำได้">
                  <div className="flex flex-wrap gap-2">
                    {SKILL_LIST.map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        aria-pressed={skills.includes(skill)}
                        onClick={() => toggleSkill(skill)}
                        className={cn("min-h-11 rounded-full px-3 text-sm font-semibold", skills.includes(skill) ? "bg-blue text-surface" : "bg-bg text-ink")}
                      >
                        {SKILL_LABEL[skill]}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="อำเภอที่ไปได้">
                  <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
                    {DISTRICTS.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        aria-pressed={districtIds.includes(d.id)}
                        onClick={() => toggleDistrict(d.id)}
                        className={cn("min-h-11 rounded-full px-3 text-sm", districtIds.includes(d.id) ? "bg-navy text-surface" : "bg-bg text-ink")}
                      >
                        {d.name}
                      </button>
                    ))}
                  </div>
                </Field>
                <Button className="w-full" onClick={() => void submit()}>
                  {student ? "ลงทะเบียนนักศึกษา" : "ลงทะเบียนอาสา"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
