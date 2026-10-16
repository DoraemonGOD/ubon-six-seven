export type Role = "citizen" | "volunteer" | "student" | "coordinator";

export type FloodLevel = "normal" | "watch" | "affected" | "critical";

export type HelpType =
  | "trapped"
  | "evacuation"
  | "food"
  | "medicine"
  | "vulnerable"
  | "transport"
  | "other";

export type Priority = "critical" | "high" | "medium" | "low";

export type RequestStatus =
  | "submitted"
  | "verified"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "unreachable"
  | "duplicate";

export type VerifyStatus = "verified" | "community" | "pending" | "outdated";

export type Source = "citizen" | "student" | "volunteer" | "community" | "agency";

export type Skill =
  | "transport"
  | "food"
  | "pack"
  | "survey"
  | "data"
  | "clean"
  | "shelter"
  | "coord"
  | "medical"
  | "boat";

export type Vehicle = "none" | "motorbike" | "pickup" | "boat";

export type Precision = "approx" | "tambon";

export type District = {
  id: string;
  name: string;
  lng: number;
  lat: number;
  level: FloodLevel;
  basin: string;
};

export type HelpRequest = {
  id: string;
  type: HelpType;
  priority: Priority;
  status: RequestStatus;
  verify: VerifyStatus;
  source: Source;
  districtId: string;
  placeLabel: string;
  people: number;
  detail: string;
  publicDetail: string;
  phone: string;
  lng: number;
  lat: number;
  precision: Precision;
  photo?: string;
  createdAt: string;
  updatedAt: string;
  assigneeId?: string;
};

export type RequestEvent = {
  id: string;
  requestId: string;
  at: string;
  kind: "create" | "status" | "priority" | "assign" | "note" | "verify";
  message: string;
  internal?: boolean;
};

export type FieldReport = {
  id: string;
  districtId: string;
  placeLabel: string;
  summary: string;
  source: Source;
  verify: VerifyStatus;
  lng: number;
  lat: number;
  createdAt: string;
  updatedAt: string;
  checkerId?: string;
};

export type Volunteer = {
  id: string;
  name: string;
  phone: string;
  kind: "volunteer" | "student";
  skills: Skill[];
  districtIds: string[];
  vehicle: Vehicle;
  window: string;
  jobs: Skill[];
  password?: string;
  approval: "pending" | "verified";
};

export type Assignment = {
  id: string;
  requestId: string;
  volunteerId: string;
  status: "assigned" | "in_progress" | "done" | "released";
  updatedAt: string;
};

export type Shelter = {
  id: string;
  name: string;
  districtId: string;
  lng: number;
  lat: number;
  capacity: number;
  current: number;
  facilities: string[];
  contact: string;
  source: Source;
  note: string;
};

export type SupplyNeed = {
  id: string;
  districtId: string;
  item: string;
  needed: number;
  have: number;
};

export type RoadNote = {
  id: string;
  name: string;
  districtId: string;
  state: "open" | "caution" | "closed";
  lng: number;
  lat: number;
  note: string;
  source: Source;
};

export type MapKind =
  | "district"
  | "request"
  | "report"
  | "shelter"
  | "relief"
  | "volunteerArea"
  | "road";

export type MapSelection = { kind: MapKind; id: string };

export const GAUGE = {
  name: "สถานี M7 สะพานเสรีประชาธิปไตย",
  reading: "ตัวเลขตัวอย่าง",
  note: "ต้นแบบไม่ได้ดึงระดับน้ำราชการสด",
};

export const DISTRICTS: District[] = [
  { id: "mueang", name: "เมืองอุบลราชธานี", lng: 104.856, lat: 15.229, level: "critical", basin: "มูล" },
  { id: "warin", name: "วารินชำราบ", lng: 104.862, lat: 15.196, level: "critical", basin: "มูล" },
  { id: "phibun", name: "พิบูลมังสาหาร", lng: 105.229, lat: 15.245, level: "affected", basin: "มูล" },
  { id: "donmot", name: "ดอนมดแดง", lng: 105.023, lat: 15.371, level: "affected", basin: "มูล" },
  { id: "khongchiam", name: "โขงเจียม", lng: 105.494, lat: 15.319, level: "affected", basin: "มูล–โขง" },
  { id: "nayia", name: "นาเยีย", lng: 105.061, lat: 15.06, level: "affected", basin: "มูล" },
  { id: "tansum", name: "ตาลสุม", lng: 105.152, lat: 15.314, level: "watch", basin: "มูล" },
  { id: "sawang", name: "สว่างวีระวงศ์", lng: 105.092, lat: 15.24, level: "watch", basin: "มูล" },
  { id: "laoseua", name: "เหล่าเสือโก้ก", lng: 104.925, lat: 15.395, level: "watch", basin: "มูล" },
  { id: "sirindhorn", name: "สิรินธร", lng: 105.4, lat: 15.206, level: "watch", basin: "มูล" },
  { id: "khueangnai", name: "เขื่องใน", lng: 104.553, lat: 15.388, level: "watch", basin: "ชี" },
  { id: "khemarat", name: "เขมราฐ", lng: 105.22, lat: 16.039, level: "watch", basin: "โขง" },
  { id: "simueang", name: "ศรีเมืองใหม่", lng: 105.279, lat: 15.496, level: "normal", basin: "โขง" },
  { id: "phosai", name: "โพธิ์ไทร", lng: 105.251, lat: 15.83, level: "normal", basin: "โขง" },
  { id: "natan", name: "นาตาล", lng: 105.277, lat: 15.908, level: "normal", basin: "โขง" },
  { id: "trakan", name: "ตระการพืชผล", lng: 105.021, lat: 15.612, level: "normal", basin: "ชี–มูล" },
  { id: "kutkhaopun", name: "กุดข้าวปุ้น", lng: 104.997, lat: 15.854, level: "normal", basin: "ชี" },
  { id: "muangsam", name: "ม่วงสามสิบ", lng: 104.726, lat: 15.509, level: "normal", basin: "ชี" },
  { id: "detudom", name: "เดชอุดม", lng: 105.078, lat: 14.906, level: "normal", basin: "มูล" },
  { id: "samrong", name: "สำโรง", lng: 104.778, lat: 15.009, level: "normal", basin: "มูล" },
  { id: "thungsi", name: "ทุ่งศรีอุดม", lng: 104.909, lat: 14.733, level: "normal", basin: "มูล" },
  { id: "nachaluai", name: "นาจะหลวย", lng: 105.243, lat: 14.516, level: "normal", basin: "มูล" },
  { id: "namyuen", name: "น้ำยืน", lng: 105.001, lat: 14.489, level: "normal", basin: "มูล" },
  { id: "buntharik", name: "บุณฑริก", lng: 105.406, lat: 14.756, level: "normal", basin: "มูล" },
  { id: "namkhun", name: "น้ำขุ่น", lng: 104.92, lat: 14.62, level: "normal", basin: "มูล" },
];

export const SHELTERS: Shelter[] = [
  {
    id: "sh-warin",
    name: "ศูนย์พักพิงชั่วคราว เทศบาลเมืองวารินชำราบ",
    districtId: "warin",
    lng: 104.848,
    lat: 15.188,
    capacity: 200,
    current: 86,
    facilities: ["น้ำดื่ม", "อาหาร", "ห้องน้ำ", "ปฐมพยาบาล"],
    contact: "045-000-201",
    source: "agency",
    note: "ตัวอย่างรูปแบบศูนย์พักพิงริมมูล ไม่ใช่ยอดคนจริง",
  },
  {
    id: "sh-bung",
    name: "จุดพักสันเขื่อน ชุมชนบุ่งกาแซว",
    districtId: "mueang",
    lng: 104.874,
    lat: 15.241,
    capacity: 80,
    current: 54,
    facilities: ["เต็นท์", "น้ำดื่ม", "ไฟฟ้าชั่วคราว"],
    contact: "045-000-118",
    source: "community",
    note: "รายงานชุมชนในชุดสาธิต",
  },
  {
    id: "sh-thabo",
    name: "โรงเรียนบ้านท่าบ่อ (จุดพักชั่วคราว)",
    districtId: "mueang",
    lng: 104.912,
    lat: 15.162,
    capacity: 120,
    current: 40,
    facilities: ["ห้องเรียน", "ห้องน้ำ", "อาหาร"],
    contact: "045-000-334",
    source: "community",
    note: "ตัวอย่างจุดพักในเขตแจระแม",
  },
  {
    id: "sh-khong",
    name: "ศาลาอเนกประสงค์ โขงเจียม",
    districtId: "khongchiam",
    lng: 105.48,
    lat: 15.326,
    capacity: 60,
    current: 12,
    facilities: ["น้ำดื่ม", "ที่นอน"],
    contact: "045-000-412",
    source: "agency",
    note: "ตัวอย่างช่วงน้ำมูลบรรจบโขง",
  },
];

export const SUPPLIES: SupplyNeed[] = [
  { id: "sup-w-water", districtId: "warin", item: "น้ำดื่ม", needed: 500, have: 220 },
  { id: "sup-w-food", districtId: "warin", item: "อาหารกล่อง", needed: 300, have: 140 },
  { id: "sup-m-water", districtId: "mueang", item: "น้ำดื่ม", needed: 400, have: 80 },
  { id: "sup-m-med", districtId: "mueang", item: "ชุดยาสามัญ", needed: 120, have: 0 },
  { id: "sup-m-clean", districtId: "mueang", item: "ชุดทำความสะอาด", needed: 200, have: 40 },
  { id: "sup-p-food", districtId: "phibun", item: "อาหารกล่อง", needed: 250, have: 250 },
  { id: "sup-p-water", districtId: "phibun", item: "น้ำดื่ม", needed: 300, have: 60 },
  { id: "sup-k-water", districtId: "khongchiam", item: "น้ำดื่ม", needed: 150, have: 0 },
  { id: "sup-d-food", districtId: "donmot", item: "อาหารแห้ง", needed: 100, have: 20 },
];

export const ROADS: RoadNote[] = [
  {
    id: "rd-m7",
    name: "สะพานเสรีประชาธิปไตย",
    districtId: "mueang",
    state: "caution",
    lng: 104.861,
    lat: 15.226,
    note: "รถเล็กผ่านได้ช้า น้ำใกล้ผิวจราจร",
    source: "community",
  },
  {
    id: "rd-warin",
    name: "ถนนอุปราชช่วงตลาดวาริน",
    districtId: "warin",
    state: "closed",
    lng: 104.851,
    lat: 15.193,
    note: "น้ำท่วมผิวทาง ปิดการสัญจร",
    source: "student",
  },
  {
    id: "rd-217",
    name: "ทางหลวง 217 ช่วงเมือง–พิบูล",
    districtId: "sawang",
    state: "caution",
    lng: 105.04,
    lat: 15.23,
    note: "บางช่วงมีน้ำขัง ใช้ความเร็วต่ำ",
    source: "citizen",
  },
  {
    id: "rd-khong",
    name: "ทางเข้าโขงเจียม",
    districtId: "khongchiam",
    state: "open",
    lng: 105.47,
    lat: 15.31,
    note: "ยังเปิด แต่ให้ตรวจซ้ำก่อนออกเดินทาง",
    source: "community",
  },
];

export const LEVEL_LABEL: Record<FloodLevel, string> = {
  normal: "ปกติ",
  watch: "เฝ้าระวัง",
  affected: "ได้รับผลกระทบ",
  critical: "วิกฤต",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  critical: "วิกฤต",
  high: "สูง",
  medium: "ปานกลาง",
  low: "ต่ำ",
};

export const STATUS_LABEL: Record<RequestStatus, string> = {
  submitted: "ส่งแล้ว",
  verified: "ตรวจแล้ว",
  assigned: "มอบทีมแล้ว",
  in_progress: "กำลังช่วย",
  resolved: "ช่วยแล้ว",
  unreachable: "ติดต่อไม่ได้",
  duplicate: "เรื่องซ้ำ",
};

export const VERIFY_LABEL: Record<VerifyStatus, string> = {
  verified: "ตรวจยืนยันแล้ว",
  community: "รายงานชุมชน",
  pending: "รอตรวจสอบ",
  outdated: "ข้อมูลเก่า",
};

export const SOURCE_LABEL: Record<Source, string> = {
  citizen: "ประชาชน",
  student: "นักศึกษา",
  volunteer: "อาสาสมัคร",
  community: "ผู้นำชุมชน",
  agency: "หน่วยงาน",
};

export const TYPE_LABEL: Record<HelpType, string> = {
  trapped: "ติดอยู่ในพื้นที่",
  evacuation: "ต้องการอพยพ",
  food: "อาหารและน้ำ",
  medicine: "ยาและของจำเป็น",
  vulnerable: "ผู้สูงอายุ เด็ก กลุ่มเปราะบาง",
  transport: "ขนส่ง",
  other: "อื่น ๆ",
};

export const SKILL_LABEL: Record<Skill, string> = {
  transport: "ขนส่ง",
  food: "แจกอาหาร",
  pack: "แพ็กของ",
  survey: "สำรวจพื้นที่",
  data: "เก็บข้อมูล",
  clean: "ทำความสะอาด",
  shelter: "ช่วยศูนย์พักพิง",
  coord: "ประสานงาน",
  medical: "ยาและปฐมพยาบาล",
  boat: "เรือ",
};

export const VEHICLE_LABEL: Record<Vehicle, string> = {
  none: "ไม่มีพาหนะ",
  motorbike: "มอเตอร์ไซค์",
  pickup: "รถกระบะ",
  boat: "เรือ",
};

export const ROAD_LABEL: Record<RoadNote["state"], string> = {
  open: "เปิด",
  caution: "ระวัง",
  closed: "ปิด",
};

export const ROLE_LABEL: Record<Role, string> = {
  citizen: "ประชาชน",
  volunteer: "อาสา",
  student: "นักศึกษา",
  coordinator: "ประสาน",
};

export const HELP_TYPES: HelpType[] = [
  "trapped",
  "evacuation",
  "food",
  "medicine",
  "vulnerable",
  "transport",
  "other",
];

export const PRIORITIES: Priority[] = ["critical", "high", "medium", "low"];

export const SKILL_LIST: Skill[] = [
  "transport",
  "food",
  "pack",
  "survey",
  "data",
  "clean",
  "shelter",
  "coord",
  "medical",
  "boat",
];

export const TYPE_SKILLS: Record<HelpType, Skill[]> = {
  trapped: ["boat", "transport"],
  evacuation: ["boat", "transport", "shelter"],
  food: ["food", "pack", "transport"],
  medicine: ["medical"],
  vulnerable: ["transport", "medical", "shelter"],
  transport: ["transport"],
  other: ["coord", "survey", "data"],
};

export const LEVEL_RANK: Record<FloodLevel, number> = {
  critical: 0,
  affected: 1,
  watch: 2,
  normal: 3,
};

export const PRIORITY_RANK: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function districtById(id: string) {
  return DISTRICTS.find((d) => d.id === id);
}

export function isOpenStatus(status: RequestStatus) {
  return (
    status === "submitted" ||
    status === "verified" ||
    status === "assigned" ||
    status === "in_progress"
  );
}

export function isSensitive(type: HelpType) {
  return type === "medicine" || type === "vulnerable";
}

export function supplyState(item: SupplyNeed): "needed" | "partial" | "fulfilled" {
  if (item.have <= 0) return "needed";
  if (item.have < item.needed) return "partial";
  return "fulfilled";
}

export const SUPPLY_LABEL = {
  needed: "ยังขาด",
  partial: "ได้บางส่วน",
  fulfilled: "ครบแล้ว",
} as const;

export function toneForLevel(level: FloodLevel) {
  if (level === "critical") return "crit" as const;
  if (level === "affected") return "hit" as const;
  if (level === "watch") return "watch" as const;
  return "ok" as const;
}

export function toneForPriority(priority: Priority) {
  if (priority === "critical") return "crit" as const;
  if (priority === "high") return "hit" as const;
  if (priority === "medium") return "watch" as const;
  return "ok" as const;
}

export function toneForVerify(verify: VerifyStatus) {
  if (verify === "verified") return "ok" as const;
  if (verify === "community") return "info" as const;
  if (verify === "pending") return "watch" as const;
  return "muted" as const;
}

export function toneForRoad(state: RoadNote["state"]) {
  if (state === "closed") return "crit" as const;
  if (state === "caution") return "watch" as const;
  return "ok" as const;
}

export function canSeePrivate(role: Role, request: HelpRequest, activeVolunteerId: string | null) {
  if (role === "coordinator") return true;
  if (
    (role === "volunteer" || role === "student") &&
    activeVolunteerId &&
    request.assigneeId === activeVolunteerId
  ) {
    return true;
  }
  return false;
}
