import assert from "node:assert/strict";
import test from "node:test";
import { canReadAudit, canReview, decideAccess, incidentInScope, projectLocation, volunteerMissionStatus } from "./policy.ts";
import { classifyReport } from "./suggest.ts";

test("public and pending volunteers cannot enter intelligence", () => {
  assert.equal(decideAccess(null).ok, false);
  assert.equal(decideAccess({ id: "a", displayName: "รอ", role: "pending_volunteer", districtIds: ["mueang"] }).ok, false);
  assert.equal(decideAccess({ id: "b", displayName: "คน", role: "public_user", districtIds: [] }).ok, false);
});

test("verified volunteer is scoped and cannot review or read phones via role", () => {
  const access = decideAccess({ id: "v", displayName: "อาสา", role: "verified_volunteer", districtIds: ["mueang"] });
  assert.equal(access.ok, true);
  assert.equal(incidentInScope({ id: "v", displayName: "อาสา", role: "verified_volunteer", districtIds: ["mueang"] }, "warin"), false);
  assert.equal(canReview("verified_volunteer"), false);
  assert.equal(canReadAudit("verified_volunteer"), false);
  assert.equal(volunteerMissionStatus("completed"), false);
  assert.equal(volunteerMissionStatus("in_progress"), true);
});

test("precise household points are masked for volunteers", () => {
  const point = projectLocation(
    { id: "v", displayName: "อาสา", role: "verified_volunteer", districtIds: ["mueang"] },
    { precision: "precise", lng: 104.1, lat: 15.1, districtLng: 104.8, districtLat: 15.2 },
  );
  assert.equal(point.masked, true);
  assert.equal(point.lng, 104.8);
});

test("classifier proposes and does not confirm", () => {
  const draft = classifyReport("มีผู้สูงอายุติดอยู่บนบ้าน น้ำสูง", null);
  assert.equal(draft.category, "trapped");
  assert.match(draft.reason, /ไม่ใช่การยืนยัน/);
  assert.equal(draft.modelLabel, "local-keyword-rules");
});
