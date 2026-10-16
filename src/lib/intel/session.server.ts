import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { deleteCookie, getCookie, getRequestHeader, setCookie } from "@tanstack/react-start/server";
import { getSql, type Sql } from "@/lib/db";
import { DISTRICTS, districtById } from "@/lib/model";
import {
  canManageMembers,
  canReadAudit,
  canReview,
  canSeePhone,
  decideAccess,
  incidentInScope,
  projectLocation,
  volunteerMissionStatus,
  type IncidentCategory,
  type MemberRecord,
  type MissionStatus,
  type Urgency,
  type Verification,
} from "@/lib/intel/policy";
import { classifyReport, LOCAL_MODEL } from "@/lib/intel/suggest";

const COOKIE = "ufc_intel";
const attempts = new Map<string, { n: number; at: number }>();

type MemberRow = {
  id: string;
  display_name: string;
  phone: string;
  password_hash: string;
  role: string;
  district_ids: string;
};

type IncidentRow = {
  id: string;
  category: string;
  summary: string;
  original_text: string;
  district_id: string;
  tambon: string;
  place_label: string;
  people: number | null;
  urgency: string;
  verification: string;
  lng: number | null;
  lat: number | null;
  precision: string;
  phone: string | null;
  is_demo: boolean;
  outdated: boolean;
  merged_into: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [kind, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const next = scryptSync(password, salt, 32);
  const prev = Buffer.from(hash, "hex");
  if (prev.length !== next.length) return false;
  return timingSafeEqual(prev, next);
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function stamp(value: string | Date) {
  return new Date(value).toISOString();
}

function asMember(row: MemberRow): MemberRecord | null {
  if (
    row.role !== "admin" &&
    row.role !== "verified_volunteer" &&
    row.role !== "pending_volunteer" &&
    row.role !== "public_user"
  ) {
    return null;
  }
  let districtIds: string[] = [];
  try {
    const parsed = JSON.parse(row.district_ids) as unknown;
    if (Array.isArray(parsed)) districtIds = parsed.filter((item) => typeof item === "string");
  } catch {
    districtIds = [];
  }
  return { id: row.id, displayName: row.display_name, role: row.role, districtIds };
}

function limited(key: string) {
  const now = Date.now();
  const slot = attempts.get(key);
  if (!slot || now - slot.at > 10 * 60 * 1000) {
    attempts.set(key, { n: 1, at: now });
    return false;
  }
  slot.n += 1;
  return slot.n > 8;
}

// One seed pass per process, so parallel first requests cannot both insert
// the demo rows and trip the primary key.
let seeding: Promise<void> | null = null;

async function ready() {
  const sql = await getSql();
  seeding ??= seed(sql).catch((err) => {
    seeding = null;
    throw err;
  });
  await seeding;
  return sql;
}

async function seed(sql: Sql) {
  const existing = await sql<{ id: string }>`select id from intel_member where id = 'mem-admin'`;
  if (existing.length > 0) return;
  const adminHash = hashPassword(process.env.ADMIN_CODE?.trim() || "ubon-admin");
  const volHash = hashPassword("demo1234");
  const pendingHash = hashPassword("demo1234");
  await sql`
    insert into intel_member (id, display_name, phone, password_hash, role, district_ids)
    values
      ('mem-admin', 'ผู้ประสานต้นแบบ', '0000000000', ${adminHash}, 'admin', '[]'),
      ('mem-vol', 'อาสาที่ยืนยันแล้ว', '0810000000', ${volHash}, 'verified_volunteer', '["mueang","warin"]'),
      ('mem-pending', 'อาสารอการตรวจ', '0820000000', ${pendingHash}, 'pending_volunteer', '["mueang"]')
  `;
  const now = new Date();
  const old = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString();
  const iso = now.toISOString();
  const rows: Array<[string, string, string, string, string, string, string, number | null, string, string, number, number, string, string | null, boolean, boolean, string]> = [
    ["inc-food", "food", "ชุมชนบุ่งต้องการน้ำดื่ม", "อาหารและน้ำดื่มไม่พอประมาณ 40 คน", "mueang", "ในเมือง", "ชุมชนบุ่ง", 40, "high", "verified", 104.86, 15.23, "approx", "0811111111", true, false, iso],
    ["inc-trap", "trapped", "มีคนติดอยู่ในบ้าน", "น้ำสูง มีผู้สูงอายุติดอยู่ ช่วยออกไม่ได้", "warin", "วาริน", "บ้านท่าบ่อ", 3, "critical", "unverified", 104.87, 15.19, "precise", "0822222222", true, false, iso],
    ["inc-dup", "food", "ขออาหารซ้ำโซนบุ่ง", "ของกินและน้ำดื่มที่ชุมชนบุ่งยังไม่พอ", "mueang", "ในเมือง", "ชุมชนบุ่ง", 40, "medium", "unverified", 104.861, 15.231, "approx", "0811111111", true, false, iso],
    ["inc-med", "medical", "ผู้ป่วยขาดยา", "ผู้ป่วยติดเตียงขาดยา", "phibun", "พิบูล", "บ้านโนน", 1, "critical", "verified", 105.23, 15.25, "tambon", "0833333333", true, false, iso],
    ["inc-road", "road", "ถนนตัดขาด", "ถนนเข้าชุมชนท่วม สัญจรไม่ได้", "mueang", "แจระแม", "ถนนแจระแม", null, "medium", "needs_more_information", 104.9, 15.2, "approx", null, true, false, iso],
    ["inc-old", "shelter", "ศูนย์พักคนแน่น", "ที่พักชั่วคราวรับเพิ่มไม่ได้", "warin", "วาริน", "ศูนย์พักวาริน", 20, "high", "verified", 104.85, 15.188, "approx", null, true, true, old],
    ["inc-evac", "evacuation", "ขออพยพ", "อยากย้ายออกจากพื้นที่", "khongchiam", "โขงเจียม", "บ้านโขง", 8, "high", "unverified", 105.49, 15.32, "approx", "0844444444", true, false, iso],
  ];
  for (const row of rows) {
    await sql`
      insert into intel_incident (
        id, category, summary, original_text, district_id, tambon, place_label, people, urgency, verification,
        lng, lat, precision, phone, is_demo, outdated, created_at, updated_at
      ) values (
        ${row[0]}, ${row[1]}, ${row[2]}, ${row[3]}, ${row[4]}, ${row[5]}, ${row[6]}, ${row[7]}, ${row[8]}, ${row[9]},
        ${row[10]}, ${row[11]}, ${row[12]}, ${row[13]}, ${row[14]}, ${row[15]}, ${row[16]}, ${row[16]}
      )
    `;
  }
  const trap = classifyReport("น้ำสูง มีผู้สูงอายุติดอยู่ ช่วยออกไม่ได้", 3);
  const dup = classifyReport("ของกินและน้ำดื่มที่ชุมชนบุ่งยังไม่พอ", 40);
  await sql`
    insert into intel_suggestion (id, incident_id, category, summary, urgency, reason, missing_info, duplicate_of, status, model_label)
    values
      ('sug-trap', 'inc-trap', ${trap.category}, ${trap.summary}, ${trap.urgency}, ${trap.reason}, ${trap.missingInfo}, null, 'pending_review', ${LOCAL_MODEL}),
      ('sug-dup', 'inc-dup', ${dup.category}, ${dup.summary}, ${dup.urgency}, ${dup.reason}, ${dup.missingInfo}, 'inc-food', 'pending_review', ${LOCAL_MODEL})
  `;
  await sql`
    insert into intel_mission (id, incident_id, title, status, assignee_id, district_id, supplies_requested, supplies_allocated, created_at, updated_at)
    values
      ('mis-food', 'inc-food', 'ส่งน้ำดื่มชุมชนบุ่ง', 'in_progress', 'mem-vol', 'mueang', 'น้ำดื่ม 200 ลิตร', 'น้ำดื่ม 80 ลิตร', ${iso}, ${iso}),
      ('mis-old', 'inc-old', 'ตรวจศูนย์พักวาริน', 'awaiting_verification', 'mem-vol', 'warin', '', '', ${old}, ${old})
  `;
  await sql`
    insert into intel_supply (id, name, district_id, needed, on_hand, is_demo)
    values
      ('sup-water', 'น้ำดื่ม', 'mueang', 400, 80, true),
      ('sup-boat', 'เรือท้องแบน', 'warin', 6, 1, true),
      ('sup-med', 'ยาสามัญ', 'phibun', 20, 20, true)
  `;
  await sql`
    insert into intel_audit (id, actor_id, action, target, detail)
    values ('aud-seed', 'mem-admin', 'seed', 'intel', 'โหลดชุดข้อมูลสาธิต ไม่ใช่สถานการณ์จริง')
  `;
}

function writeCookie(token: string) {
  const proto = getRequestHeader("x-forwarded-proto")?.split(",")[0]?.trim();
  setCookie(COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: proto === "https",
    maxAge: 60 * 60 * 12,
  });
}

async function memberByToken(sql: Sql) {
  const token = getCookie(COOKIE);
  if (!token) return null;
  const rows = await sql<MemberRow>`
    select m.id, m.display_name, m.phone, m.password_hash, m.role, m.district_ids
    from intel_session s
    join intel_member m on m.id = s.member_id
    where s.token_hash = ${tokenHash(token)} and s.expires_at > now()
  `;
  const row = rows[0];
  return row ? asMember(row) : null;
}

async function openSession(sql: Sql, memberId: string) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  await sql`delete from intel_session where member_id = ${memberId}`;
  await sql`insert into intel_session (token_hash, member_id, expires_at) values (${tokenHash(token)}, ${memberId}, ${expires})`;
  writeCookie(token);
}

async function audit(sql: Sql, actorId: string, action: string, target: string, detail: string) {
  await sql`insert into intel_audit (id, actor_id, action, target, detail) values (${`aud-${randomBytes(4).toString("hex")}`}, ${actorId}, ${action}, ${target}, ${detail})`;
}

function districtOf(id: string) {
  return districtById(id) ?? DISTRICTS[0];
}

function presentIncident(member: MemberRecord, row: IncidentRow) {
  const district = districtOf(row.district_id);
  const place = projectLocation(member, {
    precision: row.precision,
    lng: row.lng,
    lat: row.lat,
    districtLng: district.lng,
    districtLat: district.lat,
  });
  return {
    id: row.id,
    category: row.category,
    summary: row.summary,
    originalText: row.original_text,
    districtId: row.district_id,
    districtName: district.name,
    tambon: row.tambon,
    placeLabel: row.place_label,
    people: row.people,
    urgency: row.urgency,
    verification: row.verification,
    lng: place.lng,
    lat: place.lat,
    precision: place.precision,
    locationMasked: place.masked,
    phone: canSeePhone(member.role) ? row.phone : null,
    isDemo: row.is_demo,
    outdated: row.outdated,
    mergedInto: row.merged_into,
    createdAt: stamp(row.created_at),
    updatedAt: stamp(row.updated_at),
  };
}

function denied() {
  return { ok: false as const, reason: "unauthenticated" as const };
}

async function requireMember() {
  const sql = await ready();
  const member = await memberByToken(sql);
  const access = decideAccess(member);
  return { sql, member, access };
}

export async function readAccess() {
  const { access } = await requireMember();
  return access;
}

export async function loginAdmin(code: string) {
  if (limited("admin")) return { ok: false as const, reason: "rate" as const };
  const sql = await ready();
  const rows = await sql<MemberRow>`select id, display_name, phone, password_hash, role, district_ids from intel_member where id = 'mem-admin'`;
  const row = rows[0];
  if (!row || !verifyPassword(code.trim(), row.password_hash)) return { ok: false as const, reason: "bad" as const };
  await openSession(sql, row.id);
  await audit(sql, row.id, "login", row.id, "เข้าสู่ระบบผู้ดูแล");
  return { ok: true as const, access: decideAccess(asMember(row)) };
}

export async function loginVolunteer(phone: string, password: string) {
  const digits = phone.replace(/\D/g, "");
  if (limited(digits || "volunteer")) return { ok: false as const, reason: "rate" as const };
  const sql = await ready();
  const rows = await sql<MemberRow>`select id, display_name, phone, password_hash, role, district_ids from intel_member where phone = ${digits}`;
  const row = rows[0];
  if (!row || !verifyPassword(password, row.password_hash)) return { ok: false as const, reason: "bad" as const };
  const member = asMember(row);
  if (!member) return { ok: false as const, reason: "bad" as const };
  await openSession(sql, row.id);
  await audit(sql, row.id, "login", row.id, "เข้าสู่ระบบอาสา");
  const access = decideAccess(member);
  if (!access.ok) return { ok: false as const, reason: access.reason };
  return { ok: true as const, access };
}

export async function logoutIntel() {
  const sql = await ready();
  const token = getCookie(COOKIE);
  if (token) await sql`delete from intel_session where token_hash = ${tokenHash(token)}`;
  deleteCookie(COOKIE, { path: "/" });
  return { ok: true as const };
}

export async function registerVolunteerAccount(input: { name: string; phone: string; password: string; districtIds: string[] }) {
  const digits = input.phone.replace(/\D/g, "");
  const name = input.name.trim().slice(0, 80);
  const districts = input.districtIds.filter((id) => DISTRICTS.some((item) => item.id === id)).slice(0, 8);
  if (name.length < 2 || digits.length < 9 || input.password.length < 4 || districts.length === 0) {
    return { ok: false as const, reason: "invalid" as const };
  }
  const sql = await ready();
  const existing = await sql<{ id: string }>`select id from intel_member where phone = ${digits}`;
  if (existing.length > 0) return { ok: false as const, reason: "exists" as const };
  const id = `mem-${randomBytes(4).toString("hex")}`;
  await sql`
    insert into intel_member (id, display_name, phone, password_hash, role, district_ids)
    values (${id}, ${name}, ${digits}, ${hashPassword(input.password)}, 'pending_volunteer', ${JSON.stringify(districts)})
  `;
  await audit(sql, id, "register", id, "สมัครอาสา สถานะรอการยืนยัน");
  return { ok: true as const, role: "pending_volunteer" as const };
}

async function visibleIncidents(sql: Sql, member: MemberRecord) {
  const rows = await sql<IncidentRow>`select * from intel_incident order by updated_at desc`;
  return rows.filter((row) => incidentInScope(member, row.district_id));
}

export async function overview() {
  const { sql, member, access } = await requireMember();
  if (!access.ok || !member) return denied();
  const incidents = await visibleIncidents(sql, member);
  const open = incidents.filter((row) => !row.merged_into && row.verification !== "rejected");
  const missions = await sql<{ id: string; incident_id: string; status: string; assignee_id: string | null; district_id: string }>`select id, incident_id, status, assignee_id, district_id from intel_mission`;
  const visibleMissions = missions.filter((row) => incidentInScope(member, row.district_id));
  const suggestions = await sql<{ incident_id: string; status: string }>`select incident_id, status from intel_suggestion`;
  const visibleIds = new Set(open.map((row) => row.id));
  const supplies = await sql<{ district_id: string; needed: number; on_hand: number }>`select district_id, needed, on_hand from intel_supply`;
  const assigned = new Set(visibleMissions.filter((row) => row.status !== "cancelled").map((row) => row.incident_id));
  return {
    ok: true as const,
    member: access.member,
    externalAi: false,
    modelLabel: LOCAL_MODEL,
    demoNote: "ตัวเลขมาจากแถวในฐานข้อมูลของระบบ ชุดตั้งต้นเป็นข้อมูลสาธิต ไม่ใช่สถานการณ์น้ำท่วมจริง",
    counts: {
      verifiedActive: open.filter((row) => row.verification === "verified").length,
      awaitingReview: open.filter((row) => row.verification === "unverified").length,
      awaitingAssignment: open.filter((row) => row.verification === "verified" && !assigned.has(row.id)).length,
      activeMissions: visibleMissions.filter((row) => row.status === "assigned" || row.status === "in_progress").length,
      awaitingOutcome: visibleMissions.filter((row) => row.status === "awaiting_verification").length,
      shortages: supplies.filter((row) => incidentInScope(member, row.district_id) && row.needed > row.on_hand).length,
      needsInfo: open.filter((row) => row.verification === "needs_more_information").length,
      outdated: open.filter((row) => row.outdated).length,
      suggestionsPending: suggestions.filter((row) => row.status === "pending_review" && visibleIds.has(row.incident_id)).length,
    },
  };
}

export async function listIncidents() {
  const { sql, member, access } = await requireMember();
  if (!access.ok || !member) return { ok: false as const, reason: "unauthenticated" as const, items: [] };
  const rows = await visibleIncidents(sql, member);
  return { ok: true as const, items: rows.filter((row) => !row.merged_into).map((row) => presentIncident(member, row)) };
}

export async function readIncident(id: string) {
  const { sql, member, access } = await requireMember();
  if (!access.ok || !member) return denied();
  const rows = await sql<IncidentRow>`select * from intel_incident where id = ${id}`;
  const row = rows[0];
  if (!row || !incidentInScope(member, row.district_id)) return { ok: false as const, reason: "not_found" as const };
  const suggestions = await sql`
    select id, category, summary, urgency, reason, missing_info, duplicate_of, status, model_label, created_at
    from intel_suggestion where incident_id = ${id} order by created_at desc
  `;
  const missions = await sql`
    select id, title, status, assignee_id, supplies_requested, supplies_allocated, supplies_delivered, field_note, updated_at
    from intel_mission where incident_id = ${id} order by updated_at desc
  `;
  const history = canReadAudit(member.role)
    ? await sql`select id, action, detail, at from intel_audit where target = ${id} order by at desc`
    : [];
  const siblings = (await visibleIncidents(sql, member)).filter(
    (item) => item.id !== id && !item.merged_into && item.district_id === row.district_id && item.category === row.category,
  );
  return {
    ok: true as const,
    incident: presentIncident(member, row),
    suggestions: suggestions.map((item) => ({
      id: String(item.id),
      category: String(item.category),
      summary: String(item.summary),
      urgency: String(item.urgency),
      reason: String(item.reason),
      missingInfo: String(item.missing_info),
      duplicateOf: item.duplicate_of ? String(item.duplicate_of) : null,
      status: String(item.status),
      modelLabel: String(item.model_label),
      createdAt: stamp(item.created_at as string),
    })),
    missions: missions.map((item) => ({
      id: String(item.id),
      title: String(item.title),
      status: String(item.status),
      assigneeId: item.assignee_id ? String(item.assignee_id) : null,
      suppliesRequested: String(item.supplies_requested),
      suppliesAllocated: String(item.supplies_allocated),
      suppliesDelivered: String(item.supplies_delivered),
      fieldNote: String(item.field_note),
      updatedAt: stamp(item.updated_at as string),
    })),
    history: history.map((item) => ({
      id: String(item.id),
      action: String(item.action),
      detail: String(item.detail),
      at: stamp(item.at as string),
    })),
    duplicates: siblings.map((item) => ({ id: item.id, summary: item.summary, verification: item.verification })),
    canReview: canReview(member.role),
  };
}

export async function reviewIncident(input: {
  id: string;
  action: "verify" | "reject" | "needs_info" | "edit" | "accept_suggestion" | "reject_suggestion" | "merge";
  reason?: string;
  category?: string;
  urgency?: string;
  summary?: string;
  suggestionId?: string;
  intoId?: string;
}) {
  const { sql, member, access } = await requireMember();
  if (!access.ok || !member) return denied();
  if (!canReview(member.role)) return { ok: false as const, reason: "forbidden" as const };
  const rows = await sql<IncidentRow>`select * from intel_incident where id = ${input.id}`;
  const row = rows[0];
  if (!row) return { ok: false as const, reason: "not_found" as const };
  const reason = (input.reason ?? "").trim().slice(0, 300);
  if ((input.action === "reject" || input.action === "reject_suggestion" || input.action === "needs_info") && reason.length < 2) {
    return { ok: false as const, reason: "need_reason" as const };
  }
  if (input.action === "verify") {
    await sql`update intel_incident set verification = 'verified', updated_at = now() where id = ${row.id}`;
    await audit(sql, member.id, "verify", row.id, "ยืนยันรายงาน");
  } else if (input.action === "reject") {
    await sql`update intel_incident set verification = 'rejected', updated_at = now() where id = ${row.id}`;
    await audit(sql, member.id, "reject", row.id, reason);
  } else if (input.action === "needs_info") {
    await sql`update intel_incident set verification = 'needs_more_information', updated_at = now() where id = ${row.id}`;
    await audit(sql, member.id, "needs_info", row.id, reason);
  } else if (input.action === "edit") {
    const category = input.category && isCategory(input.category) ? input.category : row.category;
    const urgency = input.urgency && isUrgency(input.urgency) ? input.urgency : row.urgency;
    const summary = (input.summary ?? row.summary).trim().slice(0, 180) || row.summary;
    await sql`update intel_incident set category = ${category}, urgency = ${urgency}, summary = ${summary}, updated_at = now() where id = ${row.id}`;
    await sql`update intel_suggestion set status = 'edited_by_reviewer' where incident_id = ${row.id} and status = 'pending_review'`;
    await audit(sql, member.id, "edit", row.id, "แก้หมวดหรือความเร่งด่วน");
  } else if (input.action === "accept_suggestion") {
    const sug = await sql<{ id: string; category: string; urgency: string; summary: string }>`
      select id, category, urgency, summary from intel_suggestion
      where incident_id = ${row.id} and status = 'pending_review' order by created_at desc limit 1
    `;
    const top = sug[0];
    if (!top) return { ok: false as const, reason: "not_found" as const };
    await sql`update intel_incident set category = ${top.category}, urgency = ${top.urgency}, summary = ${top.summary}, updated_at = now() where id = ${row.id}`;
    await sql`update intel_suggestion set status = 'accepted' where id = ${top.id}`;
    await audit(sql, member.id, "accept_suggestion", row.id, "รับข้อเสนออัตโนมัติ ยังไม่ถือว่ายืนยันเหตุ");
  } else if (input.action === "reject_suggestion") {
    await sql`update intel_suggestion set status = 'rejected' where incident_id = ${row.id} and status = 'pending_review'`;
    await audit(sql, member.id, "reject_suggestion", row.id, reason);
  } else if (input.action === "merge") {
    const intoId = input.intoId ?? "";
    const target = await sql<{ id: string }>`select id from intel_incident where id = ${intoId}`;
    if (!target[0] || target[0].id === row.id) return { ok: false as const, reason: "not_found" as const };
    await sql`update intel_incident set merged_into = ${intoId}, updated_at = now() where id = ${row.id}`;
    await sql`update intel_suggestion set status = 'accepted' where incident_id = ${row.id} and duplicate_of = ${intoId}`;
    await audit(sql, member.id, "merge", row.id, `รวมเข้ากับ ${intoId} โดยไม่ลบต้นฉบับ`);
  }
  return { ok: true as const };
}

function isCategory(value: string): value is IncidentCategory {
  return ["trapped", "evacuation", "medical", "food", "boat", "shelter", "infrastructure", "road", "vulnerable", "other"].includes(value);
}
function isUrgency(value: string): value is Urgency {
  return ["critical", "high", "medium", "low", "unknown"].includes(value);
}
function isVerification(value: string): value is Verification {
  return ["unverified", "verified", "rejected", "needs_more_information"].includes(value);
}

export async function createMission(incidentId: string) {
  const { sql, member, access } = await requireMember();
  if (!access.ok || !member || !canReview(member.role)) return { ok: false as const, reason: "forbidden" as const };
  const rows = await sql<IncidentRow>`select * from intel_incident where id = ${incidentId}`;
  const row = rows[0];
  if (!row || row.merged_into) return { ok: false as const, reason: "not_found" as const };
  const id = `mis-${randomBytes(3).toString("hex")}`;
  await sql`
    insert into intel_mission (id, incident_id, title, status, district_id)
    values (${id}, ${row.id}, ${row.summary.slice(0, 80)}, 'pending_assignment', ${row.district_id})
  `;
  await audit(sql, member.id, "mission", row.id, `เปิดภารกิจ ${id}`);
  return { ok: true as const, id };
}

export async function updateMission(input: { id: string; status?: string; note?: string; assigneeId?: string; delivered?: string }) {
  const { sql, member, access } = await requireMember();
  if (!access.ok || !member) return denied();
  const rows = await sql<{ id: string; assignee_id: string | null; district_id: string; incident_id: string; status: string }>`
    select id, assignee_id, district_id, incident_id, status from intel_mission where id = ${input.id}
  `;
  const row = rows[0];
  if (!row || !incidentInScope(member, row.district_id)) return { ok: false as const, reason: "not_found" as const };
  if (member.role === "verified_volunteer") {
    if (row.assignee_id !== member.id) return { ok: false as const, reason: "forbidden" as const };
    if (input.assigneeId) return { ok: false as const, reason: "forbidden" as const };
    if (input.status && !volunteerMissionStatus(input.status)) return { ok: false as const, reason: "forbidden" as const };
  }
  if (input.assigneeId && canReview(member.role)) {
    const people = await sql<MemberRow>`select id, display_name, phone, password_hash, role, district_ids from intel_member where id = ${input.assigneeId}`;
    const assignee = people[0] ? asMember(people[0]) : null;
    if (!assignee || assignee.role !== "verified_volunteer" || !assignee.districtIds.includes(row.district_id)) {
      return { ok: false as const, reason: "forbidden" as const };
    }
    await sql`update intel_mission set assignee_id = ${assignee.id}, status = 'assigned', updated_at = now() where id = ${row.id}`;
    await audit(sql, member.id, "assign", row.incident_id, `มอบ ${row.id} ให้ ${assignee.displayName}`);
  }
  if (input.status && isMission(input.status) && (canReview(member.role) || volunteerMissionStatus(input.status))) {
    await sql`update intel_mission set status = ${input.status}, updated_at = now() where id = ${row.id}`;
    await audit(sql, member.id, "mission_status", row.incident_id, `${row.id} -> ${input.status}`);
  }
  if (typeof input.note === "string") {
    const note = input.note.trim().slice(0, 400);
    await sql`update intel_mission set field_note = ${note}, updated_at = now() where id = ${row.id}`;
    await audit(sql, member.id, "field_note", row.incident_id, note || "ล้างบันทึกภาคสนาม");
  }
  if (typeof input.delivered === "string" && canReview(member.role)) {
    await sql`update intel_mission set supplies_delivered = ${input.delivered.trim().slice(0, 160)}, updated_at = now() where id = ${row.id}`;
    await audit(sql, member.id, "delivered", row.incident_id, "บันทึกของที่ส่งแล้ว");
  }
  return { ok: true as const };
}

function isMission(value: string): value is MissionStatus {
  return ["pending_assignment", "assigned", "in_progress", "awaiting_verification", "completed", "cancelled"].includes(value);
}

export async function listMissions() {
  const { sql, member, access } = await requireMember();
  if (!access.ok || !member) return { ok: false as const, reason: "unauthenticated" as const, items: [] };
  const rows = await sql<{
    id: string;
    incident_id: string;
    title: string;
    status: string;
    assignee_id: string | null;
    district_id: string;
    supplies_requested: string;
    supplies_delivered: string;
    field_note: string;
    updated_at: string | Date;
  }>`select id, incident_id, title, status, assignee_id, district_id, supplies_requested, supplies_delivered, field_note, updated_at from intel_mission order by updated_at desc`;
  const items = rows.filter((row) => {
    if (!incidentInScope(member, row.district_id)) return false;
    if (member.role === "verified_volunteer") return row.assignee_id === member.id;
    return true;
  });
  return {
    ok: true as const,
    canAssign: canReview(member.role),
    items: items.map((row) => ({
      id: row.id,
      incidentId: row.incident_id,
      title: row.title,
      status: row.status,
      assigneeId: row.assignee_id,
      districtId: row.district_id,
      suppliesRequested: row.supplies_requested,
      suppliesDelivered: row.supplies_delivered,
      fieldNote: row.field_note,
      updatedAt: stamp(row.updated_at),
    })),
  };
}

export async function listSupplies() {
  const { sql, member, access } = await requireMember();
  if (!access.ok || !member) return { ok: false as const, reason: "unauthenticated" as const, items: [] };
  const rows = await sql<{ id: string; name: string; district_id: string; needed: number; on_hand: number; is_demo: boolean }>`
    select id, name, district_id, needed, on_hand, is_demo from intel_supply order by name
  `;
  return {
    ok: true as const,
    canEdit: canReview(member.role),
    items: rows
      .filter((row) => incidentInScope(member, row.district_id))
      .map((row) => ({
        id: row.id,
        name: row.name,
        districtId: row.district_id,
        districtName: districtOf(row.district_id).name,
        needed: Number(row.needed),
        onHand: Number(row.on_hand),
        isDemo: row.is_demo,
        short: Number(row.needed) > Number(row.on_hand),
      })),
  };
}

export async function adjustSupply(id: string, onHand: number) {
  const { sql, member, access } = await requireMember();
  if (!access.ok || !member || !canReview(member.role)) return { ok: false as const, reason: "forbidden" as const };
  const amount = Math.max(0, Math.min(100000, Math.round(onHand)));
  const rows = await sql<{ id: string }>`select id from intel_supply where id = ${id}`;
  if (!rows[0]) return { ok: false as const, reason: "not_found" as const };
  await sql`update intel_supply set on_hand = ${amount} where id = ${id}`;
  await audit(sql, member.id, "supply", id, `คงเหลือ ${amount}`);
  return { ok: true as const };
}

export async function briefing(filter: { districtId?: string; category?: string; verification?: string }) {
  const { sql, member, access } = await requireMember();
  if (!access.ok || !member) return denied();
  let rows = (await visibleIncidents(sql, member)).filter((row) => !row.merged_into);
  if (filter.districtId) rows = rows.filter((row) => row.district_id === filter.districtId);
  if (filter.category) rows = rows.filter((row) => row.category === filter.category);
  if (filter.verification && isVerification(filter.verification)) rows = rows.filter((row) => row.verification === filter.verification);
  const verified = rows.filter((row) => row.verification === "verified");
  const urgent = rows.filter((row) => row.verification !== "rejected" && (row.urgency === "critical" || row.urgency === "high"));
  const unverified = rows.filter((row) => row.verification === "unverified" || row.verification === "needs_more_information" || row.outdated);
  const supplies = await listSupplies();
  const shortages = supplies.ok ? supplies.items.filter((item) => item.short) : [];
  const covered = new Set(rows.map((row) => row.district_id));
  return {
    ok: true as const,
    externalAi: false,
    modelLabel: LOCAL_MODEL,
    generatedAt: new Date().toISOString(),
    verified: verified.map((row) => ({ id: row.id, text: `${districtOf(row.district_id).name}: ${row.summary}`, updatedAt: stamp(row.updated_at) })),
    urgent: urgent.map((row) => ({ id: row.id, text: `${row.urgency} · ${row.summary}`, updatedAt: stamp(row.updated_at), verification: row.verification })),
    unverified: unverified.map((row) => ({ id: row.id, text: row.summary, updatedAt: stamp(row.updated_at), verification: row.verification })),
    shortages: shortages.map((item) => ({ id: item.id, text: `${item.districtName} ${item.name} คงเหลือ ${item.onHand} จากที่ต้องการ ${item.needed}`, isDemo: item.isDemo })),
    gap: "อำเภอที่ไม่มีรายงานในชุดนี้ไม่ได้แปลว่าปลอดภัย แปลว่ายังไม่มีข้อมูลที่ยืนยัน",
    uncovered: DISTRICTS.filter((item) => member.role === "admin" && !covered.has(item.id)).map((item) => item.name),
  };
}

export async function listMembers() {
  const { sql, member, access } = await requireMember();
  if (!access.ok || !member) return { ok: false as const, reason: "unauthenticated" as const, items: [] };
  if (!canManageMembers(member.role)) {
    return {
      ok: true as const,
      canManage: false,
      items: [
        {
          id: member.id,
          displayName: member.displayName,
          phone: null,
          role: member.role,
          districtIds: member.districtIds,
        },
      ],
    };
  }
  const rows = await sql<MemberRow>`select id, display_name, phone, password_hash, role, district_ids from intel_member order by created_at`;
  return {
    ok: true as const,
    canManage: true,
    items: rows.map((row) => {
      const parsed = asMember(row);
      return {
        id: row.id,
        displayName: row.display_name,
        phone: row.phone,
        role: parsed?.role ?? "public_user",
        districtIds: parsed?.districtIds ?? [],
      };
    }),
  };
}

export async function setMemberRole(input: { id: string; role: "pending_volunteer" | "verified_volunteer"; districtIds?: string[] }) {
  const { sql, member, access } = await requireMember();
  if (!access.ok || !member || !canManageMembers(member.role)) return { ok: false as const, reason: "forbidden" as const };
  if (input.id === member.id) return { ok: false as const, reason: "forbidden" as const };
  const districts = (input.districtIds ?? []).filter((id) => DISTRICTS.some((item) => item.id === id));
  const rows = await sql<{ id: string; role: string }>`select id, role from intel_member where id = ${input.id}`;
  const row = rows[0];
  if (!row || row.role === "admin") return { ok: false as const, reason: "not_found" as const };
  await sql`
    update intel_member
    set role = ${input.role},
        district_ids = ${JSON.stringify(districts.length ? districts : JSON.parse("[]"))},
        updated_at = now()
    where id = ${input.id}
  `;
  if (districts.length) {
    await sql`update intel_member set district_ids = ${JSON.stringify(districts)} where id = ${input.id}`;
  }
  await audit(sql, member.id, "role", input.id, input.role === "verified_volunteer" ? "ยืนยันอาสา" : "ถอนหรือปฏิเสธการยืนยัน");
  return { ok: true as const };
}

export async function listAudit() {
  const { sql, member, access } = await requireMember();
  if (!access.ok || !member || !canReadAudit(member.role)) return { ok: false as const, reason: "forbidden" as const, items: [] };
  const rows = await sql<{ id: string; actor_id: string | null; action: string; target: string; detail: string; at: string | Date }>`
    select id, actor_id, action, target, detail, at from intel_audit order by at desc limit 80
  `;
  return {
    ok: true as const,
    items: rows.map((row) => ({
      id: row.id,
      actorId: row.actor_id,
      action: row.action,
      target: row.target,
      detail: row.detail,
      at: stamp(row.at),
    })),
  };
}

export async function ingestPublicReport(input: {
  districtId: string;
  placeLabel: string;
  text: string;
  people?: number | null;
  phone?: string;
  category?: string;
  lng?: number;
  lat?: number;
}) {
  if (limited("ingest")) return { ok: false as const, reason: "rate" as const };
  const district = districtById(input.districtId);
  const text = input.text.trim().slice(0, 1000);
  const place = input.placeLabel.trim().slice(0, 120);
  if (!district || text.length < 2 || place.length < 2) return { ok: false as const, reason: "invalid" as const };
  const sql = await ready();
  const draft = classifyReport(text, input.people ?? null);
  const category = input.category && isCategory(input.category) ? input.category : draft.category;
  const id = `inc-${randomBytes(4).toString("hex")}`;
  const precise = input.lng != null && input.lat != null;
  await sql`
    insert into intel_incident (
      id, category, summary, original_text, district_id, place_label, people, urgency, verification,
      lng, lat, precision, phone, is_demo
    ) values (
      ${id}, ${category}, ${text.slice(0, 80)}, ${text}, ${district.id}, ${place}, ${input.people ?? null},
      ${draft.urgency}, 'unverified', ${precise ? input.lng : district.lng}, ${precise ? input.lat : district.lat},
      ${precise ? "precise" : "tambon"}, ${input.phone?.replace(/\D/g, "").slice(0, 10) || null}, false
    )
  `;
  const siblings = await sql<{ id: string }>`
    select id from intel_incident
    where district_id = ${district.id} and category = ${category} and id <> ${id} and merged_into is null
    order by created_at desc limit 1
  `;
  await sql`
    insert into intel_suggestion (id, incident_id, category, summary, urgency, reason, missing_info, duplicate_of, status, model_label)
    values (
      ${`sug-${randomBytes(3).toString("hex")}`}, ${id}, ${draft.category}, ${draft.summary}, ${draft.urgency},
      ${draft.reason}, ${draft.missingInfo}, ${siblings[0]?.id ?? null}, 'pending_review', ${LOCAL_MODEL}
    )
  `;
  await audit(sql, "public", "ingest", id, "รายงานจากหน้าสาธารณะ รอคนตรวจ");
  return { ok: true as const, id };
}

export async function verifiedAssignees(districtId: string) {
  const { sql, member, access } = await requireMember();
  if (!access.ok || !member || !canReview(member.role)) return { ok: false as const, items: [] };
  const rows = await sql<MemberRow>`select id, display_name, phone, password_hash, role, district_ids from intel_member where role = 'verified_volunteer'`;
  return {
    ok: true as const,
    items: rows
      .map((row) => asMember(row))
      .filter((item): item is MemberRecord => !!item && item.districtIds.includes(districtId))
      .map((item) => ({ id: item.id, displayName: item.displayName })),
  };
}
