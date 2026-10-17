// Pure rules for the shared coordination data (requests, events, reports,
// volunteers, assignments). The server runs these against the database copy,
// so every device sees the same result. No I/O here.
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  VERIFY_LABEL,
  districtById,
  isSensitive,
  type Assignment,
  type FieldReport,
  type GeoPoint,
  type GeoVia,
  type HelpRequest,
  type HelpType,
  type Precision,
  type Priority,
  type RequestEvent,
  type RequestStatus,
  type Skill,
  type Source,
  type Vehicle,
  type VerifyStatus,
  type Volunteer,
} from "../model.ts";

export type SharedData = {
  requests: HelpRequest[];
  events: RequestEvent[];
  reports: FieldReport[];
  volunteers: Volunteer[];
  assignments: Assignment[];
};

export type SubmitRequestInput = {
  type: HelpType;
  priority: Priority;
  districtId: string;
  placeLabel: string;
  people: number;
  detail: string;
  phone: string;
  lng?: number;
  lat?: number;
  accuracy?: number;
  via?: GeoVia;
  photo?: string;
};

export type SubmitReportInput = {
  districtId: string;
  placeLabel: string;
  summary: string;
  lng?: number;
  lat?: number;
  accuracy?: number;
  via?: GeoVia;
  photo?: string;
};

export type RegisterInput = {
  name: string;
  phone: string;
  kind: "volunteer" | "student";
  skills: Skill[];
  districtIds: string[];
  vehicle: Vehicle;
  window: string;
};

export type Ctx = { now: string; uid: (prefix: string) => string };

export function jitter(id: string, lng: number, lat: number) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const dx = ((hash % 100) / 100 - 0.5) * 0.03;
  const dy = (((hash >> 8) % 100) / 100 - 0.5) * 0.03;
  return { lng: lng + dx, lat: lat + dy };
}

function event(ctx: Ctx, requestId: string, kind: RequestEvent["kind"], message: string, internal?: boolean): RequestEvent {
  return { id: ctx.uid("ev"), requestId, at: ctx.now, kind, message, ...(internal ? { internal: true } : {}) };
}

export function submitRequest(d: SharedData, id: string, input: SubmitRequestInput, ctx: Ctx): SharedData {
  const district = districtById(input.districtId);
  if (!district) return d;
  const sensitive = isSensitive(input.type);
  const precision: Precision = sensitive ? "tambon" : "approx";
  const given = input.lng != null && input.lat != null;
  // The public map gets a blurred point (about 300 m); the exact one stays private.
  const blur = (v: number) => Math.round(v / 0.003) * 0.003;
  const point =
    !sensitive && given ? { lng: blur(input.lng!), lat: blur(input.lat!) } : jitter(id, district.lng, district.lat);
  const exact: GeoPoint | undefined = given
    ? { lng: input.lng!, lat: input.lat!, accuracy: input.accuracy, via: input.via ?? "map" }
    : undefined;
  const place = input.placeLabel.trim();
  const detail = input.detail.trim();
  const req: HelpRequest = {
    id,
    type: input.type,
    priority: input.priority,
    status: "submitted",
    verify: "pending",
    source: "citizen",
    districtId: input.districtId,
    placeLabel: place,
    people: input.people,
    detail,
    publicDetail: sensitive ? `${place} · จุดสาธารณะอยู่ระดับอำเภอ รายละเอียดเพิ่มมีเฉพาะผู้ประสาน` : detail,
    phone: input.phone.replace(/\D/g, ""),
    lng: point.lng,
    lat: point.lat,
    precision,
    exact,
    photo: input.photo,
    createdAt: ctx.now,
    updatedAt: ctx.now,
  };
  return {
    ...d,
    requests: [req, ...d.requests],
    events: [event(ctx, id, "create", "ส่งคำร้องแล้ว รอผู้ประสานตรวจ"), ...d.events],
  };
}

export function submitReport(d: SharedData, input: SubmitReportInput, source: Source, ctx: Ctx) {
  const district = districtById(input.districtId);
  if (!district) return { data: d, id: "" };
  const id = ctx.uid("rpt");
  const point =
    input.lng != null && input.lat != null ? { lng: input.lng, lat: input.lat } : jitter(id, district.lng, district.lat);
  const report: FieldReport = {
    id,
    districtId: input.districtId,
    placeLabel: input.placeLabel.trim(),
    summary: input.summary.trim(),
    source,
    verify: "pending",
    lng: point.lng,
    lat: point.lat,
    ...(input.lng != null && input.lat != null ? { via: input.via ?? "map", accuracy: input.accuracy } : {}),
    photo: input.photo,
    createdAt: ctx.now,
    updatedAt: ctx.now,
  };
  return { data: { ...d, reports: [report, ...d.reports] }, id };
}

export function registerVolunteer(d: SharedData, input: RegisterInput, ctx: Ctx) {
  const phone = input.phone.replace(/\D/g, "");
  if (d.volunteers.some((item) => item.phone === phone)) return { data: d, id: "" };
  const id = ctx.uid("vol");
  const vol: Volunteer = {
    id,
    name: input.name.trim(),
    phone,
    kind: input.kind,
    skills: input.skills,
    districtIds: input.districtIds,
    vehicle: input.vehicle,
    window: input.window.trim() || "ไม่ได้ระบุ",
    jobs: input.skills,
    approval: "pending",
  };
  return { data: { ...d, volunteers: [...d.volunteers, vol] }, id };
}

/** Turn down a sign-up: the record goes away; the person can apply again. */
export function rejectVolunteer(d: SharedData, id: string): SharedData {
  return { ...d, volunteers: d.volunteers.filter((item) => !(item.id === id && item.approval === "pending")) };
}

export function approveVolunteer(d: SharedData, id: string): SharedData {
  return {
    ...d,
    volunteers: d.volunteers.map((item) =>
      item.id === id && item.approval === "pending" ? { ...item, approval: "verified" } : item,
    ),
  };
}

export function setPriority(d: SharedData, id: string, priority: Priority, ctx: Ctx): SharedData {
  if (!d.requests.some((r) => r.id === id)) return d;
  return {
    ...d,
    requests: d.requests.map((req) => (req.id === id ? { ...req, priority, updatedAt: ctx.now } : req)),
    events: [event(ctx, id, "priority", `ปรับความเร่งด่วนเป็น ${PRIORITY_LABEL[priority]}`), ...d.events],
  };
}

export function setStatus(d: SharedData, id: string, status: RequestStatus, ctx: Ctx): SharedData {
  if (!d.requests.some((r) => r.id === id)) return d;
  const at = ctx.now;
  return {
    ...d,
    requests: d.requests.map((req) => (req.id === id ? { ...req, status, updatedAt: at } : req)),
    assignments: d.assignments.map((item) => {
      if (item.requestId !== id || item.status === "released" || item.status === "done") return item;
      if (status === "in_progress") return { ...item, status: "in_progress", updatedAt: at };
      if (status === "resolved") return { ...item, status: "done", updatedAt: at };
      if (status === "unreachable" || status === "duplicate") return { ...item, status: "released", updatedAt: at };
      return item;
    }),
    events: [event(ctx, id, "status", `สถานะเป็น ${STATUS_LABEL[status]}`), ...d.events],
  };
}

export function setRequestVerify(d: SharedData, id: string, verify: VerifyStatus, ctx: Ctx): SharedData {
  if (!d.requests.some((r) => r.id === id)) return d;
  return {
    ...d,
    requests: d.requests.map((req) => {
      if (req.id !== id) return req;
      const status = verify === "verified" && req.status === "submitted" ? "verified" : req.status;
      return { ...req, verify, status, updatedAt: ctx.now };
    }),
    events: [event(ctx, id, "verify", `สถานะตรวจเป็น ${VERIFY_LABEL[verify]}`), ...d.events],
  };
}

export function setReportVerify(d: SharedData, id: string, verify: VerifyStatus, ctx: Ctx): SharedData {
  return {
    ...d,
    reports: d.reports.map((report) => (report.id === id ? { ...report, verify, updatedAt: ctx.now } : report)),
  };
}

export function assign(d: SharedData, requestId: string, volunteerId: string, ctx: Ctx): SharedData {
  const vol = d.volunteers.find((item) => item.id === volunteerId);
  if (!vol || vol.approval === "pending" || !d.requests.some((r) => r.id === requestId)) return d;
  const at = ctx.now;
  const assignment: Assignment = { id: ctx.uid("as"), requestId, volunteerId, status: "assigned", updatedAt: at };
  return {
    ...d,
    requests: d.requests.map((req) =>
      req.id === requestId ? { ...req, assigneeId: volunteerId, status: "assigned", updatedAt: at } : req,
    ),
    assignments: [
      assignment,
      ...d.assignments.map((item) =>
        item.requestId === requestId && item.status !== "done" && item.status !== "released"
          ? { ...item, status: "released" as const, updatedAt: at }
          : item,
      ),
    ],
    events: [
      event(ctx, requestId, "assign", `มอบให้ ${vol.name}`),
      event(ctx, requestId, "status", "สถานะเป็น มอบทีมแล้ว"),
      ...d.events,
    ],
  };
}

export function addNote(d: SharedData, requestId: string, message: string, ctx: Ctx): SharedData {
  const text = message.trim().slice(0, 1000);
  if (!text || !d.requests.some((r) => r.id === requestId)) return d;
  return { ...d, events: [event(ctx, requestId, "note", text, true), ...d.events] };
}

export function progress(d: SharedData, requestId: string, next: "in_progress" | "done", ctx: Ctx): SharedData {
  if (!d.requests.some((r) => r.id === requestId)) return d;
  const status: RequestStatus = next === "done" ? "resolved" : "in_progress";
  return {
    ...d,
    requests: d.requests.map((req) => (req.id === requestId ? { ...req, status, updatedAt: ctx.now } : req)),
    assignments: d.assignments.map((item) =>
      item.requestId === requestId && item.status !== "released" && item.status !== "done"
        ? { ...item, status: next === "done" ? "done" : "in_progress", updatedAt: ctx.now }
        : item,
    ),
    events: [event(ctx, requestId, "status", `สถานะเป็น ${STATUS_LABEL[status]}`), ...d.events],
  };
}

export function claimReport(d: SharedData, reportId: string, volunteerId: string, ctx: Ctx): SharedData {
  return {
    ...d,
    reports: d.reports.map((report) =>
      report.id === reportId ? { ...report, checkerId: volunteerId, updatedAt: ctx.now } : report,
    ),
  };
}

export function confirmReport(d: SharedData, reportId: string, ctx: Ctx): SharedData {
  return {
    ...d,
    reports: d.reports.map((report) =>
      report.id === reportId
        ? { ...report, verify: report.verify === "pending" ? "community" : report.verify, updatedAt: ctx.now }
        : report,
    ),
  };
}

/** Is this volunteer the active assignee of the request? */
export function isAssignee(d: SharedData, requestId: string, volunteerId: string | null) {
  if (!volunteerId) return false;
  return d.assignments.some(
    (item) =>
      item.requestId === requestId &&
      item.volunteerId === volunteerId &&
      item.status !== "released",
  );
}
