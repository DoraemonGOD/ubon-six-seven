import type { IncidentCategory, Urgency } from "@/lib/intel/policy";

export const LOCAL_MODEL = "local-keyword-rules";

const RULES: { category: IncidentCategory; words: string[]; urgency: Urgency }[] = [
  { category: "trapped", words: ["ติดอยู่", "ขึ้นหลังคา", "น้ำสูง", "ช่วยออก"], urgency: "critical" },
  { category: "medical", words: ["ป่วย", "ยา", "โรงพยาบาล", "เลือด", "หายใจ"], urgency: "critical" },
  { category: "vulnerable", words: ["ผู้สูงอายุ", "เด็กเล็ก", "ผู้พิการ", "ติดเตียง"], urgency: "high" },
  { category: "evacuation", words: ["อพยพ", "ย้ายออก"], urgency: "high" },
  { category: "boat", words: ["เรือ", "พาย"], urgency: "high" },
  { category: "food", words: ["อาหาร", "น้ำดื่ม", "ของกิน"], urgency: "medium" },
  { category: "shelter", words: ["ที่พัก", "ศูนย์พัก"], urgency: "medium" },
  { category: "road", words: ["ถนน", "สัญจร"], urgency: "medium" },
  { category: "infrastructure", words: ["ไฟดับ", "ไฟฟ้า", "ประปา"], urgency: "medium" },
];

export type SuggestionDraft = {
  category: IncidentCategory;
  summary: string;
  urgency: Urgency;
  reason: string;
  missingInfo: string;
  modelLabel: string;
};

export function classifyReport(text: string, people: number | null): SuggestionDraft {
  const source = text.trim();
  const hit = RULES.find((rule) => rule.words.some((word) => source.includes(word)));
  const peopleMatch = source.match(/(\d+)\s*คน/);
  const knownPeople = people ?? (peopleMatch ? Number(peopleMatch[1]) : null);
  const missing: string[] = [];
  if (!hit) missing.push("ยังจับหมวดจากถ้อยคำไม่ได้ ต้องให้คนตรวจ");
  if (knownPeople == null) missing.push("ไม่ได้ระบุจำนวนคน");
  if (source.length < 12) missing.push("รายละเอียดสั้นเกินไป");
  const category = hit?.category ?? "other";
  const urgency = hit?.urgency ?? "unknown";
  const matched = hit?.words.filter((word) => source.includes(word)) ?? [];
  return {
    category,
    summary: source.slice(0, 80) || "ไม่มีข้อความ",
    urgency,
    reason: hit
      ? `พบคำว่า "${matched.join(", ")}" จึงเสนอหมวดนี้ เป็นข้อเสนอให้คนตรวจ ไม่ใช่การยืนยันเหตุ`
      : "ไม่พบคำที่เข้ากฎ จึงยังไม่จัดหมวด เป็นข้อเสนอให้คนตรวจ ไม่ใช่การยืนยันเหตุ",
    missingInfo: missing.join(" · "),
    modelLabel: LOCAL_MODEL,
  };
}
