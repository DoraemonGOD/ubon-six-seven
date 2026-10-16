export const INTEL_ROLES = ["public_user", "pending_volunteer", "verified_volunteer", "admin"] as const;
export type IntelRole = (typeof INTEL_ROLES)[number];

export const CATEGORIES = [
  "trapped",
  "evacuation",
  "medical",
  "food",
  "boat",
  "shelter",
  "infrastructure",
  "road",
  "vulnerable",
  "other",
] as const;
export type IncidentCategory = (typeof CATEGORIES)[number];

export const URGENCIES = ["critical", "high", "medium", "low", "unknown"] as const;
export type Urgency = (typeof URGENCIES)[number];

export const VERIFICATIONS = ["unverified", "verified", "rejected", "needs_more_information"] as const;
export type Verification = (typeof VERIFICATIONS)[number];

export const SUGGESTION_STATUSES = [
  "pending_review",
  "accepted",
  "edited_by_reviewer",
  "rejected",
  "needs_more_information",
] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

export const MISSION_STATUSES = [
  "pending_assignment",
  "assigned",
  "in_progress",
  "awaiting_verification",
  "completed",
  "cancelled",
] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

export type MemberView = {
  id: string;
  displayName: string;
  role: "admin" | "verified_volunteer";
  districtIds: string[];
};

export type AccessDecision =
  | { ok: true; member: MemberView }
  | { ok: false; reason: "unauthenticated" | "pending" };

export type MemberRecord = {
  id: string;
  displayName: string;
  role: IntelRole;
  districtIds: string[];
};

export function decideAccess(member: MemberRecord | null): AccessDecision {
  if (!member) return { ok: false, reason: "unauthenticated" };
  if (member.role === "admin" || member.role === "verified_volunteer") {
    return {
      ok: true,
      member: { id: member.id, displayName: member.displayName, role: member.role, districtIds: member.districtIds },
    };
  }
  return { ok: false, reason: "pending" };
}

export function canReview(role: IntelRole) {
  return role === "admin";
}

export function canManageMembers(role: IntelRole) {
  return role === "admin";
}

export function canReadAudit(role: IntelRole) {
  return role === "admin";
}

export function canSeePhone(role: IntelRole) {
  return role === "admin";
}

export function incidentInScope(member: MemberRecord, districtId: string) {
  if (member.role === "admin") return true;
  if (member.role !== "verified_volunteer") return false;
  return member.districtIds.includes(districtId);
}

export function projectLocation(
  member: MemberRecord,
  incident: { precision: string; lng: number | null; lat: number | null; districtLng: number; districtLat: number },
) {
  if (incident.precision === "precise" && member.role !== "admin") {
    return { lng: incident.districtLng, lat: incident.districtLat, precision: "tambon" as const, masked: true };
  }
  return {
    lng: incident.lng,
    lat: incident.lat,
    precision: incident.precision,
    masked: false,
  };
}

export function volunteerMissionStatus(next: string) {
  return next === "in_progress" || next === "awaiting_verification";
}
