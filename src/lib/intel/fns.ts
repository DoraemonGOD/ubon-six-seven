import { createServerFn } from "@tanstack/react-start";

export const getIntelAccess = createServerFn({ method: "GET" }).handler(async () => {
  const { readAccess } = await import("./session.server");
  return readAccess();
});

export const intelLoginAdmin = createServerFn({ method: "POST" })
  .validator((data: { code: string }) => ({ code: String(data?.code ?? "").slice(0, 80) }))
  .handler(async ({ data }) => {
    const { loginAdmin } = await import("./session.server");
    return loginAdmin(data.code);
  });

export const intelLoginVolunteer = createServerFn({ method: "POST" })
  .validator((data: { phone: string; password: string }) => ({
    phone: String(data?.phone ?? "").slice(0, 20),
    password: String(data?.password ?? "").slice(0, 80),
  }))
  .handler(async ({ data }) => {
    const { loginVolunteer } = await import("./session.server");
    return loginVolunteer(data.phone, data.password);
  });

export const intelLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { logoutIntel } = await import("./session.server");
  return logoutIntel();
});

export const intelRegister = createServerFn({ method: "POST" })
  .validator((data: { name: string; phone: string; password: string; districtIds: string[] }) => ({
    name: String(data?.name ?? ""),
    phone: String(data?.phone ?? ""),
    password: String(data?.password ?? ""),
    districtIds: Array.isArray(data?.districtIds) ? data.districtIds.map(String).slice(0, 8) : [],
  }))
  .handler(async ({ data }) => {
    const { registerVolunteerAccount } = await import("./session.server");
    return registerVolunteerAccount(data);
  });

export const getIntelOverview = createServerFn({ method: "GET" }).handler(async () => {
  const { overview } = await import("./session.server");
  return overview();
});

export const getIntelIncidents = createServerFn({ method: "GET" }).handler(async () => {
  const { listIncidents } = await import("./session.server");
  return listIncidents();
});

export const getIntelIncident = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => ({ id: String(data?.id ?? "").slice(0, 40) }))
  .handler(async ({ data }) => {
    const { readIncident } = await import("./session.server");
    return readIncident(data.id);
  });

export const reviewIntelIncident = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id: string;
      action: "verify" | "reject" | "needs_info" | "edit" | "accept_suggestion" | "reject_suggestion" | "merge";
      reason?: string;
      category?: string;
      urgency?: string;
      summary?: string;
      intoId?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { reviewIncident } = await import("./session.server");
    return reviewIncident(data);
  });

export const createIntelMission = createServerFn({ method: "POST" })
  .validator((data: { incidentId: string }) => ({ incidentId: String(data?.incidentId ?? "").slice(0, 40) }))
  .handler(async ({ data }) => {
    const { createMission } = await import("./session.server");
    return createMission(data.incidentId);
  });

export const updateIntelMission = createServerFn({ method: "POST" })
  .validator((data: { id: string; status?: string; note?: string; assigneeId?: string; delivered?: string }) => ({
    id: String(data?.id ?? "").slice(0, 40),
    status: data?.status,
    note: data?.note,
    assigneeId: data?.assigneeId,
    delivered: data?.delivered,
  }))
  .handler(async ({ data }) => {
    const { updateMission } = await import("./session.server");
    return updateMission(data);
  });

export const getIntelMissions = createServerFn({ method: "GET" }).handler(async () => {
  const { listMissions } = await import("./session.server");
  return listMissions();
});

export const getIntelSupplies = createServerFn({ method: "GET" }).handler(async () => {
  const { listSupplies } = await import("./session.server");
  return listSupplies();
});

export const getIntelBriefing = createServerFn({ method: "POST" })
  .validator((data: { districtId?: string; category?: string; verification?: string }) => ({
    districtId: data?.districtId || undefined,
    category: data?.category || undefined,
    verification: data?.verification || undefined,
  }))
  .handler(async ({ data }) => {
    const { briefing } = await import("./session.server");
    return briefing(data);
  });

export const getIntelMembers = createServerFn({ method: "GET" }).handler(async () => {
  const { listMembers } = await import("./session.server");
  return listMembers();
});

export const setIntelMemberRole = createServerFn({ method: "POST" })
  .validator((data: { id: string; role: "pending_volunteer" | "verified_volunteer"; districtIds?: string[] }) => ({
    id: String(data?.id ?? "").slice(0, 40),
    role: data?.role === "verified_volunteer" ? ("verified_volunteer" as const) : ("pending_volunteer" as const),
    districtIds: Array.isArray(data?.districtIds) ? data.districtIds.map(String) : [],
  }))
  .handler(async ({ data }) => {
    const { setMemberRole } = await import("./session.server");
    return setMemberRole(data);
  });

export const getIntelAudit = createServerFn({ method: "GET" }).handler(async () => {
  const { listAudit } = await import("./session.server");
  return listAudit();
});

export const ingestPublicReport = createServerFn({ method: "POST" })
  .validator(
    (data: {
      districtId: string;
      placeLabel: string;
      text: string;
      people?: number | null;
      phone?: string;
      category?: string;
      lng?: number;
      lat?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { ingestPublicReport: ingest } = await import("./session.server");
    return ingest(data);
  });

export const getIntelAssignees = createServerFn({ method: "POST" })
  .validator((data: { districtId: string }) => ({ districtId: String(data?.districtId ?? "") }))
  .handler(async ({ data }) => {
    const { verifiedAssignees } = await import("./session.server");
    return verifiedAssignees(data.districtId);
  });
