// Volunteer points. Earned from the shared job records, so nothing extra has
// to be stored: every job taken and every job finished counts once.
import type { Assignment, Certificate } from "./model.ts";

export const POINTS = {
  /** Taking a job (not counted if the coordinator moved it to someone else). */
  take: 10,
  /** Finishing a job. */
  finish: 30,
} as const;

/** Price of a volunteer certificate. Free for now; raise it later. */
export const CERT_COST = 0;

export type PointLine = { at: string; requestId: string; label: string; points: number };

export function pointsFor(assignments: Assignment[], certificates: Certificate[], volunteerId: string | null) {
  const lines: PointLine[] = [];
  if (!volunteerId) return { earned: 0, spent: 0, balance: 0, taken: 0, finished: 0, lines };
  let taken = 0;
  let finished = 0;
  for (const job of assignments) {
    if (job.volunteerId !== volunteerId || job.status === "released") continue;
    taken += 1;
    lines.push({ at: job.updatedAt, requestId: job.requestId, label: "รับงาน", points: POINTS.take });
    if (job.status === "done") {
      finished += 1;
      lines.push({ at: job.updatedAt, requestId: job.requestId, label: "ทำงานสำเร็จ", points: POINTS.finish });
    }
  }
  const earned = taken * POINTS.take + finished * POINTS.finish;
  const spent = certificates.filter((c) => c.volunteerId === volunteerId && c.issuedBy === "self").reduce((n, c) => n + c.cost, 0);
  lines.sort((a, b) => b.at.localeCompare(a.at));
  return { earned, spent, balance: earned - spent, taken, finished, lines };
}
