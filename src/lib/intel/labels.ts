export const CATEGORY_LABEL: Record<string, string> = {
  trapped: "คนติดน้ำ",
  evacuation: "อพยพ",
  medical: "การแพทย์",
  food: "อาหารและน้ำ",
  boat: "เรือและขนส่ง",
  shelter: "ที่พักชั่วคราว",
  infrastructure: "ไฟและโครงสร้าง",
  road: "ถนนและทางเข้า",
  vulnerable: "กลุ่มเปราะบาง",
  other: "อื่น ๆ",
};

export const URGENCY_LABEL: Record<string, string> = {
  critical: "วิกฤต",
  high: "สูง",
  medium: "ปานกลาง",
  low: "ต่ำ",
  unknown: "ยังไม่ชี้",
};

export const VERIFY_LABEL: Record<string, string> = {
  unverified: "ยังไม่ยืนยัน",
  verified: "ยืนยันแล้ว",
  rejected: "ปฏิเสธ",
  needs_more_information: "ขอข้อมูลเพิ่ม",
};

export const MISSION_LABEL: Record<string, string> = {
  pending_assignment: "รอคนรับ",
  assigned: "มอบแล้ว",
  in_progress: "กำลังทำ",
  awaiting_verification: "รอตรวจผล",
  completed: "จบแล้ว",
  cancelled: "ยกเลิก",
};

export const ROLE_LABEL: Record<string, string> = {
  admin: "ผู้ดูแล",
  verified_volunteer: "อาสาที่ยืนยันแล้ว",
  pending_volunteer: "รอการยืนยัน",
  public_user: "ประชาชน",
};
