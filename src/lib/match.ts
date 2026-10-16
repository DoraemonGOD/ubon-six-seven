import {
  PRIORITY_RANK,
  TYPE_SKILLS,
  type FieldReport,
  type HelpRequest,
  type Skill,
  type Volunteer,
  isOpenStatus,
} from "@/lib/model";

export type Suggestion = {
  kind: "request" | "report";
  id: string;
  score: number;
  why: string;
  priorityRank: number;
};

function skillHit(vol: Volunteer, needed: Skill[]) {
  const owned = new Set([...vol.skills, ...vol.jobs]);
  return needed.filter((skill) => owned.has(skill));
}

export function suggestionsFor(
  vol: Volunteer,
  requests: HelpRequest[],
  reports: FieldReport[],
): Suggestion[] {
  const items: Suggestion[] = [];

  for (const req of requests) {
    if (!isOpenStatus(req.status)) continue;
    if (req.assigneeId && req.assigneeId !== vol.id) continue;
    if (req.assigneeId === vol.id) continue;
    if (!vol.districtIds.includes(req.districtId)) continue;
    const overlap = skillHit(vol, TYPE_SKILLS[req.type]);
    let score = 4;
    const why = ["อยู่ในพื้นที่ที่รับได้"];
    if (overlap.length) {
      score += overlap.length * 2;
      why.push("ทักษะตรงกับงาน");
    }
    if ((req.type === "trapped" || req.type === "evacuation") && vol.vehicle === "boat") {
      score += 4;
      why.push("มีเรือ");
    } else if (
      (req.type === "trapped" || req.type === "evacuation") &&
      vol.vehicle === "none"
    ) {
      score -= 2;
      why.push("ไม่มีเรือหรือรถ อาจไปลำบาก");
    }
    if (
      (req.type === "food" || req.type === "transport") &&
      (vol.vehicle === "pickup" || vol.vehicle === "motorbike")
    ) {
      score += 2;
      why.push("มีพาหนะขนของ");
    }
    if (req.type === "medicine" && !overlap.length) score -= 3;
    if (vol.kind === "student" && (req.type === "other" || overlap.includes("survey"))) {
      score += 1;
    }
    if (score <= 0) continue;
    items.push({
      kind: "request",
      id: req.id,
      score,
      why: why.join(" · "),
      priorityRank: PRIORITY_RANK[req.priority],
    });
  }

  if (vol.kind === "student" || vol.skills.includes("survey") || vol.skills.includes("data")) {
    for (const report of reports) {
      if (report.verify === "verified" || report.verify === "outdated") continue;
      if (report.checkerId && report.checkerId !== vol.id) continue;
      if (report.checkerId === vol.id) continue;
      if (!vol.districtIds.includes(report.districtId)) continue;
      items.push({
        kind: "report",
        id: report.id,
        score: 7,
        why: "งานสำรวจและตรวจข้อมูลในพื้นที่ที่รับได้",
        priorityRank: report.verify === "pending" ? 0 : 1,
      });
    }
  }

  return items
    .sort((a, b) => a.priorityRank - b.priorityRank || b.score - a.score)
    .slice(0, 4);
}
