// Server side of the shared coordination data. Every page used to keep its own
// copy in localStorage; now this module is the single source of truth and
// decides, per signed-in role, what each browser is allowed to see and change.
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { deleteCookie, getCookie, getRequestHeader, setCookie } from "@tanstack/react-start/server";
import { dbSource, getSql, type Sql } from "@/lib/db";
import { createDemoRecords } from "@/lib/demo";
import {
  loginAdmin as intelLoginAdmin,
  loginVolunteer as intelLoginVolunteer,
  logoutIntel,
  registerVolunteerAccount as intelRegister,
  syncVolunteerRole,
} from "@/lib/intel/session.server";
import {
  PRIORITY_LABEL,
  SKILL_LABEL,
  STATUS_LABEL,
  TYPE_LABEL,
  VEHICLE_LABEL,
  VERIFY_LABEL,
  districtById,
  type HelpRequest,
  type Role,
  type Source,
} from "@/lib/model";
import * as engine from "./engine";
import type { SharedData } from "./engine";

const COOKIE = "ufc_ops";
const SESSION_HOURS = 24 * 7;
const KINDS = ["request", "event", "report", "volunteer", "assignment"] as const;
type Kind = (typeof KINDS)[number];
const KEY: Record<Kind, keyof SharedData> = {
  request: "requests",
  event: "events",
  report: "reports",
  volunteer: "volunteers",
  assignment: "assignments",
};

export type Me = { role: Role; volunteerId: string | null };

export type OpsView = SharedData & {
  me: Me;
  ownedRequestIds: string[];
  demoAdminCode: string | null;
  /** "database" = shared Postgres; "temporary" = per-instance in-memory fallback. */
  storage: "database" | "temporary";
  /** True when running on a host (Vercel) where the temporary store is a misconfiguration. */
  hosted: boolean;
  /** Fingerprint of the stored data + session; polls send it back to skip unchanged downloads. */
  stamp: string;
};

const HOSTED = typeof process !== "undefined" && Boolean(process.env.VERCEL || process.env.NODE_ENV === "production");
if (HOSTED && dbSource === "pglite") {
  console.error(
    "[ops] DATABASE_URL is not set — data lives in temporary memory on each server instance and is NOT shared. Set DATABASE_URL and redeploy.",
  );
}

type SessionRow = {
  token_hash: string;
  role: string;
  volunteer_id: string | null;
  owned_request_ids: string;
};

type Session = {
  tokenHash: string;
  role: "citizen" | "coordinator" | "volunteer";
  volunteerId: string | null;
  owned: string[];
};

// ---------------------------------------------------------------- helpers

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(password, salt, 32).toString("hex")}`;
}

function verifyPassword(password: string, stored: string) {
  const [kind, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const next = scryptSync(password, salt, 32);
  const prev = Buffer.from(hash, "hex");
  return prev.length === next.length && timingSafeEqual(prev, next);
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function uid(prefix: string) {
  return `${prefix}-${randomBytes(4).toString("hex")}`;
}

function ctx(): engine.Ctx {
  return { now: new Date().toISOString(), uid };
}

const attempts = new Map<string, { n: number; at: number }>();
function limited(key: string, max = 10) {
  const now = Date.now();
  const slot = attempts.get(key);
  if (!slot || now - slot.at > 10 * 60 * 1000) {
    attempts.set(key, { n: 1, at: now });
    return false;
  }
  slot.n += 1;
  return slot.n > max;
}

function clientKey() {
  return getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

/** Only show the demo admin code when no real one has been configured. */
export function demoAdminCode() {
  return process.env.ADMIN_CODE?.trim() ? null : "ubon-admin";
}

// ---------------------------------------------------------------- storage

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
  const won = await sql<{ key: string }>`
    insert into ufc_meta (key, value) values ('seeded', ${new Date().toISOString()})
    on conflict (key) do nothing
    returning key
  `;
  if (won.length === 0) return;
  const demo = createDemoRecords();
  for (const vol of demo.volunteers) {
    if (vol.password) {
      await sql`
        insert into ufc_volunteer_secret (volunteer_id, password_hash)
        values (${vol.id}, ${hashPassword(vol.password)})
        on conflict (volunteer_id) do nothing
      `;
    }
  }
  const clean: SharedData = {
    ...demo,
    volunteers: demo.volunteers.map(({ password: _drop, ...vol }) => vol),
  };
  await save(sql, emptyData(), clean);
  const max = demo.requests.reduce((n, req) => {
    const m = req.id.match(/UBN-2026-(\d+)/);
    return m ? Math.max(n, Number(m[1])) : n;
  }, 0);
  await sql`select setval('ufc_request_seq', ${Math.max(max + 1, 200)}, false)`;
}

function emptyData(): SharedData {
  return { requests: [], events: [], reports: [], volunteers: [], assignments: [] };
}

async function load(sql: Sql): Promise<SharedData> {
  const rows = await sql<{ kind: Kind; data: unknown }>`
    select kind,
      case when data ? 'photo' then (data - 'photo') || '{"hasPhoto":true}'::jsonb else data end as data
    from ufc_record order by created_at asc, id asc
  `;
  const out = emptyData();
  for (const row of rows) {
    const value = typeof row.data === "string" ? JSON.parse(row.data) : row.data;
    (out[KEY[row.kind]] as unknown[]).push(value);
  }
  // Newest first, like the original in-browser lists. Reverse before the
  // stable sort so records written in the same instant keep newest-on-top.
  const desc = (a?: string, b?: string) => (b ?? "").localeCompare(a ?? "");
  out.requests.reverse().sort((a, b) => desc(a.createdAt, b.createdAt));
  out.events.reverse().sort((a, b) => desc(a.at, b.at));
  out.reports.reverse().sort((a, b) => desc(a.createdAt, b.createdAt));
  out.assignments.reverse().sort((a, b) => desc(a.updatedAt, b.updatedAt));
  return out;
}

/** Write only the records that changed between `before` and `after`. */
async function save(sql: Sql, before: SharedData, after: SharedData) {
  for (const kind of KINDS) {
    const key = KEY[kind];
    const old = new Map<string, string>();
    for (const item of before[key] as { id: string }[]) old.set(item.id, JSON.stringify(item));
    // Lists are newest-first except volunteers; insert oldest first so
    // created_at order matches the list order.
    const list = after[key] as { id: string }[];
    const items = kind === "volunteer" ? list : [...list].reverse();
    for (const item of items) {
      const json = JSON.stringify(item);
      if (old.get(item.id) === json) continue;
      await sql`
        insert into ufc_record (kind, id, data, updated_at)
        values (${kind}, ${item.id}, ${json}::jsonb, clock_timestamp())
        on conflict (kind, id) do update set
          data = case
            when excluded.data ? 'photo' or not (ufc_record.data ? 'photo') then excluded.data
            else excluded.data || jsonb_build_object('photo', ufc_record.data -> 'photo')
          end,
          updated_at = excluded.updated_at
      `;
    }
  }
}

// ---------------------------------------------------------------- sessions

function writeCookie(token: string) {
  const proto = getRequestHeader("x-forwarded-proto")?.split(",")[0]?.trim();
  setCookie(COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: proto === "https",
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

function parseOwned(text: string) {
  try {
    const value = JSON.parse(text) as unknown;
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

async function readSession(sql: Sql): Promise<Session | null> {
  const token = getCookie(COOKIE);
  if (!token) return null;
  const rows = await sql<SessionRow>`
    select token_hash, role, volunteer_id, owned_request_ids from ufc_session
    where token_hash = ${tokenHash(token)} and expires_at > now()
  `;
  const row = rows[0];
  if (!row) return null;
  const role = row.role === "coordinator" || row.role === "volunteer" ? row.role : "citizen";
  return { tokenHash: row.token_hash, role, volunteerId: row.volunteer_id, owned: parseOwned(row.owned_request_ids) };
}

async function writeSession(sql: Sql, current: Session | null, next: Omit<Session, "tokenHash">) {
  const expires = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000).toISOString();
  const owned = JSON.stringify(next.owned.slice(0, 50));
  if (current) {
    await sql`
      update ufc_session set role = ${next.role}, volunteer_id = ${next.volunteerId},
        owned_request_ids = ${owned}, expires_at = ${expires}
      where token_hash = ${current.tokenHash}
    `;
    return;
  }
  const token = randomBytes(32).toString("hex");
  await sql`
    insert into ufc_session (token_hash, role, volunteer_id, owned_request_ids, expires_at)
    values (${tokenHash(token)}, ${next.role}, ${next.volunteerId}, ${owned}, ${expires})
  `;
  writeCookie(token);
}

function effective(session: Session | null, data: SharedData): Me {
  if (!session) return { role: "citizen", volunteerId: null };
  if (session.role === "coordinator") return { role: "coordinator", volunteerId: null };
  if (session.role === "volunteer" && session.volunteerId) {
    const vol = data.volunteers.find((item) => item.id === session.volunteerId);
    if (!vol) return { role: "citizen", volunteerId: null };
    if (vol.approval === "pending") return { role: "citizen", volunteerId: vol.id };
    return { role: vol.kind === "student" ? "student" : "volunteer", volunteerId: vol.id };
  }
  return { role: "citizen", volunteerId: null };
}

function isVerifiedVolunteer(me: Me) {
  return (me.role === "volunteer" || me.role === "student") && Boolean(me.volunteerId);
}

// ---------------------------------------------------------------- view

/** Photos are big: lists only say one exists; the picture is fetched on demand. */
function stripPhoto<T extends { photo?: string; hasPhoto?: boolean }>(item: T): T {
  if (!item.photo) return item;
  const { photo: _photo, ...rest } = item;
  return { ...rest, hasPhoto: true } as T;
}

function canSeeRequest(data: SharedData, me: Me, owned: string[], req: HelpRequest) {
  return (
    me.role === "coordinator" ||
    owned.includes(req.id) ||
    (isVerifiedVolunteer(me) && engine.isAssignee(data, req.id, me.volunteerId))
  );
}

function project(data: SharedData, me: Me, owned: string[]): SharedData {
  const volunteers = data.volunteers.map(({ password: _drop, ...vol }) =>
    me.role === "coordinator" || vol.id === me.volunteerId ? vol : { ...vol, phone: "" },
  );
  const reports = data.reports.map(stripPhoto);
  if (me.role === "coordinator") return { ...data, volunteers, reports, requests: data.requests.map(stripPhoto) };
  const mine = (req: HelpRequest) => canSeeRequest(data, me, owned, req);
  const requests = data.requests.map((req) =>
    mine(req)
      ? stripPhoto(req)
      : { ...req, phone: "", detail: req.publicDetail, photo: undefined, hasPhoto: undefined, exact: undefined },
  );
  const visible = new Set(requests.filter(mine).map((req) => req.id));
  const events = data.events.filter((ev) => !ev.internal || visible.has(ev.requestId));
  return { ...data, requests, events, volunteers, reports };
}

/** One photo, checked against the same rules as the rest of the record. */
export async function readPhoto(kind: "request" | "report", id: string): Promise<string | null> {
  const sql = await ready();
  const photoRow = sql<{ photo: string | null }>`
    select data ->> 'photo' as photo from ufc_record where kind = ${kind} and id = ${id}
  `;
  if (kind === "report") return (await photoRow)[0]?.photo ?? null;
  const [rows, data, session] = await Promise.all([photoRow, load(sql), readSession(sql)]);
  const photo = rows[0]?.photo;
  const req = data.requests.find((r) => r.id === id);
  if (!photo || !req) return null;
  const me = effective(session, data);
  return canSeeRequest(data, me, session?.owned ?? [], req) ? photo : null;
}

function view(data: SharedData, session: Session | null, stamp = ""): OpsView {
  const me = effective(session, data);
  const owned = session?.owned ?? [];
  return {
    ...project(data, me, owned),
    me,
    ownedRequestIds: owned,
    demoAdminCode: demoAdminCode(),
    storage: dbSource === "pglite" ? "temporary" : "database",
    hosted: HOSTED,
    stamp,
  };
}

async function dataStamp(sql: Sql) {
  const [row] = await sql<{ s: string }>`
    select coalesce(max(updated_at)::text, '') || '#' || count(*)::text as s from ufc_record
  `;
  return row?.s ?? "";
}

function sessionStamp(session: Session | null) {
  if (!session) return "anon";
  return `${session.tokenHash.slice(0, 12)}:${session.role}:${session.volunteerId ?? ""}:${session.owned.join(",")}`;
}

/**
 * Polls pass the stamp they last saw. One small query (in parallel with the
 * session lookup) tells whether anything changed; if not, nothing is sent.
 */
export async function readView(since?: string): Promise<OpsView | { unchanged: true }> {
  const sql = await ready();
  const [data0, session] = await Promise.all([dataStamp(sql), readSession(sql)]);
  const stamp = `${data0}|${sessionStamp(session)}`;
  if (since && since === stamp) return { unchanged: true };
  const data = await load(sql);
  return view(data, session, stamp);
}

// ---------------------------------------------------------------- actions

export type OpsAction =
  | { type: "submitRequest"; input: engine.SubmitRequestInput }
  | { type: "submitReport"; input: engine.SubmitReportInput }
  | { type: "registerVolunteer"; input: engine.RegisterInput & { password: string } }
  | { type: "loginVolunteer"; phone: string; password: string }
  | { type: "loginAdmin"; code: string }
  | { type: "logout" }
  | { type: "unlockRequest"; id: string; tail: string }
  | { type: "approveVolunteer"; id: string }
  | { type: "rejectVolunteer"; id: string }
  | { type: "setPriority"; id: string; value: string }
  | { type: "setStatus"; id: string; value: string }
  | { type: "setRequestVerify"; id: string; value: string }
  | { type: "setReportVerify"; id: string; value: string }
  | { type: "assign"; requestId: string; volunteerId: string }
  | { type: "addNote"; requestId: string; message: string }
  | { type: "progress"; requestId: string; next: "in_progress" | "done" }
  | { type: "claimReport"; reportId: string }
  | { type: "confirmReport"; reportId: string }
  | { type: "resetDemo" };

export type OpsResult = { ok: boolean; value?: string; reason?: string; view: OpsView };

const text = (value: unknown, max: number) => String(value ?? "").slice(0, max);
const finite = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);
const photoOf = (value: unknown) =>
  typeof value === "string" && value.startsWith("data:image/") && value.length < 1_500_000 ? value : undefined;
const viaOf = (value: unknown) => (value === "gps" || value === "map" || value === "typed" ? value : undefined);
const accuracyOf = (value: unknown) => {
  const n = finite(value);
  return n != null && n >= 0 ? Math.round(Math.min(n, 100_000)) : undefined;
};
/** Only points inside or near Ubon Ratchathani are kept. */
const inUbon = (lng?: number, lat?: number) =>
  lng != null && lat != null && lng > 103.5 && lng < 106.6 && lat > 13.7 && lat < 16.9;

export async function runAction(action: OpsAction): Promise<OpsResult> {
  const sql = await ready();
  const [data, session] = await Promise.all([load(sql), readSession(sql)]);
  const me = effective(session, data);
  const c = ctx();

  const done = async (ok: boolean, next: SharedData, extra: { value?: string; reason?: string } = {}, s = session) => {
    if (next !== data) await save(sql, data, next);
    return { ok, ...extra, view: view(next, s) };
  };
  const deny = (reason = "forbidden") => done(false, data, { reason });
  const coord = me.role === "coordinator";

  switch (action.type) {
    case "submitRequest": {
      const i = action.input ?? ({} as engine.SubmitRequestInput);
      if (!(i.type in TYPE_LABEL) || !(i.priority in PRIORITY_LABEL) || !districtById(i.districtId)) return deny("invalid");
      if (limited(`req:${clientKey()}`, 20)) return deny("rate");
      const photo = photoOf(i.photo);
      const okPoint = inUbon(finite(i.lng), finite(i.lat));
      const [{ n }] = await sql<{ n: number }>`select nextval('ufc_request_seq')::int as n`;
      const id = `UBN-2026-${String(n).padStart(5, "0")}`;
      const next = engine.submitRequest(
        data,
        id,
        {
          type: i.type,
          priority: i.priority,
          districtId: i.districtId,
          placeLabel: text(i.placeLabel, 200),
          people: Math.min(Math.max(1, Math.round(Number(i.people) || 1)), 10000),
          detail: text(i.detail, 2000),
          phone: text(i.phone, 20),
          lng: okPoint ? finite(i.lng) : undefined,
          lat: okPoint ? finite(i.lat) : undefined,
          accuracy: accuracyOf(i.accuracy),
          via: viaOf(i.via),
          photo,
        },
        c,
      );
      const owned = [id, ...(session?.owned ?? [])];
      await writeSession(sql, session, {
        role: session?.role ?? "citizen",
        volunteerId: session?.volunteerId ?? null,
        owned,
      });
      const s = await readSession(sql);
      return done(true, next, { value: id }, s ?? { tokenHash: "", role: "citizen", volunteerId: null, owned });
    }

    case "submitReport": {
      const i = action.input ?? ({} as engine.SubmitReportInput);
      if (!districtById(i.districtId)) return deny("invalid");
      if (limited(`rpt:${clientKey()}`, 30)) return deny("rate");
      const source: Source = me.role === "student" ? "student" : me.role === "volunteer" ? "volunteer" : "citizen";
      const { data: next, id } = engine.submitReport(
        data,
        {
          districtId: i.districtId,
          placeLabel: text(i.placeLabel, 200),
          summary: text(i.summary, 1000),
          lng: inUbon(finite(i.lng), finite(i.lat)) ? finite(i.lng) : undefined,
          lat: inUbon(finite(i.lng), finite(i.lat)) ? finite(i.lat) : undefined,
          accuracy: accuracyOf(i.accuracy),
          via: viaOf(i.via),
          photo: photoOf(i.photo),
        },
        source,
        c,
      );
      return done(Boolean(id), next, { value: id });
    }

    case "registerVolunteer": {
      const i = action.input;
      const phone = text(i?.phone, 20).replace(/\D/g, "");
      const password = text(i?.password, 80);
      const skills = Array.isArray(i?.skills) ? i.skills.filter((s) => s in SKILL_LABEL) : [];
      const districtIds = Array.isArray(i?.districtIds) ? i.districtIds.filter((d) => districtById(d)).slice(0, 12) : [];
      if (text(i?.name, 80).trim().length < 2 || phone.length < 9 || password.length < 4 || !skills.length || !districtIds.length || !(i.vehicle in VEHICLE_LABEL)) {
        return deny("invalid");
      }
      if (limited(`reg:${clientKey()}`, 10)) return deny("rate");
      const { data: next, id } = engine.registerVolunteer(
        data,
        { name: text(i.name, 80), phone, kind: i.kind === "student" ? "student" : "volunteer", skills, districtIds, vehicle: i.vehicle, window: text(i.window, 300) },
        c,
      );
      if (!id) return deny("exists");
      // Same account opens the intel room once an admin verifies it.
      try {
        await intelRegister({ name: text(i.name, 80), phone, password, districtIds });
        await intelLoginVolunteer(phone, password);
      } catch (err) {
        console.error("[ops] intel register failed", err);
      }
      await sql`insert into ufc_volunteer_secret (volunteer_id, password_hash) values (${id}, ${hashPassword(password)})`;
      await writeSession(sql, session, { role: "volunteer", volunteerId: id, owned: session?.owned ?? [] });
      const s = await readSession(sql);
      return done(true, next, { value: id }, s);
    }

    case "loginVolunteer": {
      if (limited(`vol:${clientKey()}`)) return deny("rate");
      const phone = text(action.phone, 20).replace(/\D/g, "");
      const vol = data.volunteers.find((item) => item.phone === phone);
      const rows = vol
        ? await sql<{ password_hash: string }>`select password_hash from ufc_volunteer_secret where volunteer_id = ${vol.id}`
        : [];
      if (!vol || !rows[0] || !verifyPassword(text(action.password, 80), rows[0].password_hash)) return deny("denied");
      await writeSession(sql, session, { role: "volunteer", volunteerId: vol.id, owned: session?.owned ?? [] });
      try {
        await intelLoginVolunteer(phone, text(action.password, 80));
      } catch (err) {
        console.error("[ops] intel login failed", err);
      }
      const s = await readSession(sql);
      return done(vol.approval !== "pending", data, { value: vol.approval === "pending" ? "pending" : "ok" }, s);
    }

    case "loginAdmin": {
      const result = await intelLoginAdmin(text(action.code, 80));
      if (!result.ok) return deny(result.reason);
      await writeSession(sql, session, { role: "coordinator", volunteerId: null, owned: session?.owned ?? [] });
      const s = await readSession(sql);
      return done(true, data, {}, s);
    }

    case "logout": {
      if (session) await sql`delete from ufc_session where token_hash = ${session.tokenHash}`;
      deleteCookie(COOKIE, { path: "/" });
      await logoutIntel();
      return done(true, data, {}, null);
    }

    case "unlockRequest": {
      if (limited(`unlock:${clientKey()}`, 15)) return deny("rate");
      const id = text(action.id, 40).trim().toUpperCase();
      const tail = text(action.tail, 20).replace(/\D/g, "");
      const req = data.requests.find((item) => item.id === id);
      if (!req || tail.length < 4 || !req.phone.endsWith(tail.slice(-4))) return deny("missing");
      await writeSession(sql, session, {
        role: session?.role ?? "citizen",
        volunteerId: session?.volunteerId ?? null,
        owned: [id, ...(session?.owned ?? []).filter((x) => x !== id)],
      });
      const s = await readSession(sql);
      return done(true, data, { value: id }, s);
    }

    case "approveVolunteer": {
      if (!coord) return deny();
      const vol = data.volunteers.find((item) => item.id === text(action.id, 40));
      if (!vol) return deny("missing");
      try {
        await syncVolunteerRole(vol.phone, true, vol.districtIds);
      } catch (err) {
        console.error("[ops] intel sync failed", err);
      }
      return done(true, engine.approveVolunteer(data, vol.id));
    }

    case "rejectVolunteer": {
      if (!coord) return deny();
      const vol = data.volunteers.find((item) => item.id === text(action.id, 40) && item.approval === "pending");
      if (!vol) return deny("missing");
      await sql`delete from ufc_volunteer_secret where volunteer_id = ${vol.id}`;
      // save() only writes rows that changed or were added, so remove this one here.
      await sql`delete from ufc_record where kind = 'volunteer' and id = ${vol.id}`;
      return done(true, engine.rejectVolunteer(data, vol.id));
    }

    case "setPriority":
      if (!coord || !(action.value in PRIORITY_LABEL)) return deny();
      return done(true, engine.setPriority(data, text(action.id, 40), action.value as never, c));

    case "setStatus":
      if (!coord || !(action.value in STATUS_LABEL)) return deny();
      return done(true, engine.setStatus(data, text(action.id, 40), action.value as never, c));

    case "setRequestVerify":
      if (!coord || !(action.value in VERIFY_LABEL)) return deny();
      return done(true, engine.setRequestVerify(data, text(action.id, 40), action.value as never, c));

    case "setReportVerify":
      if (!coord || !(action.value in VERIFY_LABEL)) return deny();
      return done(true, engine.setReportVerify(data, text(action.id, 40), action.value as never, c));

    case "assign": {
      const volunteerId = text(action.volunteerId, 40);
      const self = isVerifiedVolunteer(me) && me.volunteerId === volunteerId;
      if (!coord && !self) return deny();
      return done(true, engine.assign(data, text(action.requestId, 40), volunteerId, c));
    }

    case "addNote":
      if (!coord) return deny();
      return done(true, engine.addNote(data, text(action.requestId, 40), text(action.message, 1000), c));

    case "progress": {
      const requestId = text(action.requestId, 40);
      const mine = isVerifiedVolunteer(me) && engine.isAssignee(data, requestId, me.volunteerId);
      if (!coord && !mine) return deny();
      return done(true, engine.progress(data, requestId, action.next === "done" ? "done" : "in_progress", c));
    }

    case "claimReport":
      if (!isVerifiedVolunteer(me) || !me.volunteerId) return deny();
      return done(true, engine.claimReport(data, text(action.reportId, 40), me.volunteerId, c));

    case "confirmReport":
      if (!coord && !isVerifiedVolunteer(me)) return deny();
      return done(true, engine.confirmReport(data, text(action.reportId, 40), c));

    case "resetDemo": {
      if (!coord) return deny();
      await sql`delete from ufc_record`;
      await sql`delete from ufc_volunteer_secret`;
      await sql`delete from ufc_session where role <> 'coordinator'`;
      await sql`delete from ufc_meta where key = 'seeded'`;
      seeding = seed(sql);
      await seeding;
      return { ok: true, view: view(await load(sql), session) };
    }

    default:
      return deny("unknown");
  }
}
