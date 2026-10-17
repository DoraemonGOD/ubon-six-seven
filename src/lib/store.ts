// Client view of the shared coordination data.
//
// The data itself lives on the server (see src/lib/ops). This store keeps the
// latest copy the server sent for this browser, polls for changes so other
// devices' updates show up, and sends every change to the server, which checks
// the signed-in role before applying it.
import { create } from "zustand";
import { SHELTERS, SUPPLIES } from "@/lib/model";
import type {
  Assignment,
  FieldReport,
  HelpRequest,
  Priority,
  RequestEvent,
  RequestStatus,
  Role,
  Shelter,
  SupplyNeed,
  Certificate,
  VerifyStatus,
  Volunteer,
} from "@/lib/model";
import type { RegisterInput, SubmitReportInput, SubmitRequestInput } from "@/lib/ops/engine";
import { getOpsView, runOpsAction } from "@/lib/ops/fns";
import type { OpsAction, OpsResult, OpsView } from "@/lib/ops/ops.server";

type Data = {
  ready: boolean;
  requests: HelpRequest[];
  events: RequestEvent[];
  reports: FieldReport[];
  volunteers: Volunteer[];
  assignments: Assignment[];
  shelters: Shelter[];
  supplies: SupplyNeed[];
  certificates: Certificate[];
  role: Role;
  activeVolunteerId: string | null;
  myRequestIds: string[];
  demoAdminCode: string | null;
  storage: "database" | "temporary";
  hosted: boolean;
};

/** Something new a coordinator should look at right away. */
export type OpsAlert =
  | { key: string; kind: "request"; request: HelpRequest }
  | { key: string; kind: "volunteer"; volunteer: Volunteer };

type Alerts = {
  alerts: OpsAlert[];
  /** Ids already seen by this browser; null until the first view arrives. */
  seen: { requests: Set<string>; volunteers: Set<string> } | null;
  dismissAlert: (key: string) => void;
  dismissAll: () => void;
};

export type RegisterResult = { id: string; reason?: string };

type Store = Data & Alerts & {
  refresh: () => Promise<void>;
  submitRequest: (input: SubmitRequestInput) => Promise<string>;
  submitReport: (input: SubmitReportInput) => Promise<string>;
  registerVolunteer: (input: RegisterInput & { password: string }) => Promise<RegisterResult>;
  loginVolunteer: (phone: string, password: string) => Promise<"ok" | "pending" | "denied">;
  loginAdmin: (code: string) => Promise<boolean>;
  logout: () => Promise<void>;
  unlockRequest: (id: string, tail: string) => Promise<boolean>;
  approveVolunteer: (id: string) => Promise<boolean>;
  rejectVolunteer: (id: string) => Promise<boolean>;
  setPriority: (id: string, priority: Priority) => Promise<void>;
  setStatus: (id: string, status: RequestStatus) => Promise<void>;
  setRequestVerify: (id: string, verify: VerifyStatus) => Promise<void>;
  setReportVerify: (id: string, verify: VerifyStatus) => Promise<void>;
  assign: (requestId: string, volunteerId: string) => Promise<void>;
  addNote: (requestId: string, message: string) => Promise<void>;
  progress: (requestId: string, next: "in_progress" | "done") => Promise<void>;
  claimReport: (reportId: string) => Promise<void>;
  confirmReport: (reportId: string) => Promise<void>;
  resetDemo: () => Promise<boolean>;
  saveShelter: (shelter: Partial<Shelter>) => Promise<boolean>;
  deleteShelter: (id: string) => Promise<boolean>;
  saveSupply: (supply: Partial<SupplyNeed>) => Promise<boolean>;
  deleteSupply: (id: string) => Promise<boolean>;
  /** Returns the certificate id, or a reason it could not be issued. */
  redeemCertificate: (name: string) => Promise<{ id?: string; reason?: string }>;
  issueCertificate: (volunteerId: string, name?: string) => Promise<{ id?: string; reason?: string }>;
};

function fromView(view: OpsView): Partial<Data> {
  return {
    ready: true,
    requests: view.requests,
    events: view.events,
    reports: view.reports,
    volunteers: view.volunteers,
    assignments: view.assignments,
    shelters: view.shelters,
    supplies: view.supplies,
    certificates: view.certificates,
    role: view.me.role,
    activeVolunteerId: view.me.volunteerId,
    myRequestIds: view.ownedRequestIds,
    demoAdminCode: view.demoAdminCode,
    storage: view.storage,
    hosted: view.hosted,
  };
}

/** Compare a fresh view with what this browser has seen; new items become alerts for coordinators. */
function withAlerts(prev: Store, view: OpsView): Partial<Store> {
  const base = fromView(view);
  const reqIds = new Set(view.requests.map((r) => r.id));
  const volIds = new Set(view.volunteers.map((v) => v.id));
  const seen = { requests: reqIds, volunteers: volIds };
  if (!prev.seen || view.me.role !== "coordinator") {
    return { ...base, seen, alerts: view.me.role === "coordinator" ? prev.alerts : [] };
  }
  const fresh: OpsAlert[] = [];
  for (const request of view.requests) {
    if (!prev.seen.requests.has(request.id)) fresh.push({ key: `r:${request.id}`, kind: "request", request });
  }
  for (const volunteer of view.volunteers) {
    if (!prev.seen.volunteers.has(volunteer.id) && volunteer.approval === "pending") {
      fresh.push({ key: `v:${volunteer.id}`, kind: "volunteer", volunteer });
    }
  }
  if (!fresh.length) return { ...base, seen };
  const known = new Set(prev.alerts.map((a) => a.key));
  return { ...base, seen, alerts: [...fresh.filter((a) => !known.has(a.key)), ...prev.alerts].slice(0, 20) };
}

export const useFloodStore = create<Store>()((set) => {
  // Last data fingerprint from the server; an action's view clears it so the
  // next poll always fetches a fresh one.
  let stamp = "";
  let polling = false;
  const apply = (view: OpsView) => {
    stamp = view.stamp;
    set((prev) => withAlerts(prev, view));
  };
  async function send(action: OpsAction): Promise<OpsResult | null> {
    try {
      const result = await runOpsAction({ data: action });
      apply(result.view);
      return result;
    } catch (err) {
      console.error("[ops]", err);
      return null;
    }
  }

  return {
    ready: false,
    requests: [],
    events: [],
    reports: [],
    volunteers: [],
    assignments: [],
    // Shown until the first server view arrives, so pages never start empty.
    shelters: SHELTERS,
    supplies: SUPPLIES,
    certificates: [],
    role: "citizen",
    activeVolunteerId: null,
    myRequestIds: [],
    demoAdminCode: null,
    storage: "database",
    hosted: false,
    alerts: [],
    seen: null,
    dismissAlert: (key) => set((prev) => ({ alerts: prev.alerts.filter((a) => a.key !== key) })),
    dismissAll: () => set({ alerts: [] }),

    refresh: async () => {
      // Skip a tick while the previous poll is still on the wire.
      if (polling) return;
      polling = true;
      try {
        const result = await getOpsView({ data: { since: stamp || undefined } });
        if ("unchanged" in result) return;
        apply(result);
      } catch (err) {
        console.error("[ops] refresh failed", err);
      } finally {
        polling = false;
      }
    },
    submitRequest: async (input) => {
      const r = await send({ type: "submitRequest", input });
      return r?.ok ? (r.value ?? "") : "";
    },
    submitReport: async (input) => {
      const r = await send({ type: "submitReport", input });
      return r?.ok ? (r.value ?? "") : "";
    },
    registerVolunteer: async (input) => {
      const r = await send({ type: "registerVolunteer", input });
      if (!r) return { id: "", reason: "network" };
      return r.ok ? { id: r.value ?? "" } : { id: "", reason: r.reason ?? "unknown" };
    },
    loginVolunteer: async (phone, password) => {
      const r = await send({ type: "loginVolunteer", phone, password });
      if (!r || r.reason) return "denied";
      return r.value === "pending" ? "pending" : "ok";
    },
    loginAdmin: async (code) => Boolean((await send({ type: "loginAdmin", code }))?.ok),
    logout: async () => {
      await send({ type: "logout" });
    },
    unlockRequest: async (id, tail) => Boolean((await send({ type: "unlockRequest", id, tail }))?.ok),
    approveVolunteer: async (id) => Boolean((await send({ type: "approveVolunteer", id }))?.ok),
    rejectVolunteer: async (id) => Boolean((await send({ type: "rejectVolunteer", id }))?.ok),
    setPriority: async (id, value) => {
      await send({ type: "setPriority", id, value });
    },
    setStatus: async (id, value) => {
      await send({ type: "setStatus", id, value });
    },
    setRequestVerify: async (id, value) => {
      await send({ type: "setRequestVerify", id, value });
    },
    setReportVerify: async (id, value) => {
      await send({ type: "setReportVerify", id, value });
    },
    assign: async (requestId, volunteerId) => {
      await send({ type: "assign", requestId, volunteerId });
    },
    addNote: async (requestId, message) => {
      await send({ type: "addNote", requestId, message });
    },
    progress: async (requestId, next) => {
      await send({ type: "progress", requestId, next });
    },
    claimReport: async (reportId) => {
      await send({ type: "claimReport", reportId });
    },
    confirmReport: async (reportId) => {
      await send({ type: "confirmReport", reportId });
    },
    resetDemo: async () => Boolean((await send({ type: "resetDemo" }))?.ok),
    saveShelter: async (shelter) => Boolean((await send({ type: "saveShelter", shelter }))?.ok),
    deleteShelter: async (id) => Boolean((await send({ type: "deleteShelter", id }))?.ok),
    saveSupply: async (supply) => Boolean((await send({ type: "saveSupply", supply }))?.ok),
    deleteSupply: async (id) => Boolean((await send({ type: "deleteSupply", id }))?.ok),
    redeemCertificate: async (name) => {
      const r = await send({ type: "redeemCertificate", name });
      if (!r) return { reason: "network" };
      return r.ok ? { id: r.value } : { reason: r.reason ?? "unknown" };
    },
    issueCertificate: async (volunteerId, name) => {
      const r = await send({ type: "issueCertificate", volunteerId, name });
      if (!r) return { reason: "network" };
      return r.ok ? { id: r.value } : { reason: r.reason ?? "unknown" };
    },
  };
});

/** Keep this browser in step with the server: load now, then poll while visible. */
export function startOpsSync(intervalMs = 4000) {
  const { refresh } = useFloodStore.getState();
  void refresh();
  const tick = () => {
    if (document.visibilityState === "visible") void refresh();
  };
  const timer = window.setInterval(tick, intervalMs);
  window.addEventListener("focus", tick);
  document.addEventListener("visibilitychange", tick);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("focus", tick);
    document.removeEventListener("visibilitychange", tick);
  };
}
