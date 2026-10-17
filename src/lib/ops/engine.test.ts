import assert from "node:assert/strict";
import { test } from "node:test";
import * as engine from "./engine.ts";
import type { SharedData } from "./engine.ts";

let n = 0;
const ctx: engine.Ctx = { now: "2026-10-16T00:00:00.000Z", uid: (p) => `${p}-${(n += 1)}` };

function base(): SharedData {
  return {
    requests: [],
    events: [],
    reports: [],
    volunteers: [
      {
        id: "vol-a",
        name: "A",
        phone: "0800000001",
        kind: "volunteer",
        skills: ["boat"],
        districtIds: ["mueang"],
        vehicle: "boat",
        window: "",
        jobs: ["boat"],
        approval: "verified",
      },
      {
        id: "vol-p",
        name: "P",
        phone: "0800000002",
        kind: "volunteer",
        skills: ["boat"],
        districtIds: ["mueang"],
        vehicle: "none",
        window: "",
        jobs: ["boat"],
        approval: "pending",
      },
    ],
    assignments: [],
    shelters: [],
    supplies: [],
    certificates: [],
  };
}

const input: engine.SubmitRequestInput = {
  type: "food",
  priority: "high",
  districtId: "mueang",
  placeLabel: " ชุมชนหาดสวนยา ",
  people: 4,
  detail: "ต้องการน้ำดื่ม",
  phone: "081-555-0000",
};

test("submitRequest adds the request and a create event", () => {
  const d = engine.submitRequest(base(), "UBN-2026-00200", input, ctx);
  assert.equal(d.requests.length, 1);
  assert.equal(d.requests[0].placeLabel, "ชุมชนหาดสวนยา");
  assert.equal(d.requests[0].phone, "0815550000");
  assert.equal(d.events[0].kind, "create");
});

test("unknown district is ignored", () => {
  const before = base();
  assert.equal(engine.submitRequest(before, "X", { ...input, districtId: "nowhere" }, ctx), before);
});

test("pending volunteers cannot be assigned", () => {
  const d = engine.submitRequest(base(), "UBN-2026-00201", input, ctx);
  const after = engine.assign(d, "UBN-2026-00201", "vol-p", ctx);
  assert.equal(after, d);
});

test("assign then progress to done resolves the request", () => {
  let d = engine.submitRequest(base(), "UBN-2026-00202", input, ctx);
  d = engine.assign(d, "UBN-2026-00202", "vol-a", ctx);
  assert.equal(d.requests[0].status, "assigned");
  assert.ok(engine.isAssignee(d, "UBN-2026-00202", "vol-a"));
  d = engine.progress(d, "UBN-2026-00202", "done", ctx);
  assert.equal(d.requests[0].status, "resolved");
  assert.equal(d.assignments[0].status, "done");
});

test("reassigning releases the previous assignment", () => {
  let d = engine.submitRequest(base(), "UBN-2026-00203", input, ctx);
  d = { ...d, volunteers: d.volunteers.map((v) => ({ ...v, approval: "verified" as const })) };
  d = engine.assign(d, "UBN-2026-00203", "vol-a", ctx);
  d = engine.assign(d, "UBN-2026-00203", "vol-p", ctx);
  assert.equal(engine.isAssignee(d, "UBN-2026-00203", "vol-a"), false);
  assert.ok(engine.isAssignee(d, "UBN-2026-00203", "vol-p"));
});

test("duplicate phone cannot register twice", () => {
  const r = engine.registerVolunteer(
    base(),
    { name: "ซ้ำ", phone: "0800000001", kind: "volunteer", skills: ["boat"], districtIds: ["mueang"], vehicle: "none", window: "" },
    ctx,
  );
  assert.equal(r.id, "");
});
