// Client view of the shared coordination data.
//
// The data itself lives on the server (see src/lib/ops). This store keeps the
// latest copy the server sent for this browser, polls for changes so other
// devices' updates show up, and sends every change to the server, which checks
// the signed-in role before applying it.
import { create } from "zustand";
import type {
  Assignment,
  FieldReport,
  HelpRequest,
  Priority,
  RequestEvent,
  RequestStatus,
  Role,
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
  role: Role;
  activeVolunteerId: string | null;
  myRequestIds: string[];
  demoAdminCode: string | null;
};

type Store = Data & {
  refresh: () => Promise<void>;
  submitRequest: (input: SubmitRequestInput) => Promise<string>;
  submitReport: (input: SubmitReportInput) => Promise<string>;
  registerVolunteer: (input: RegisterInput & { password: string }) => Promise<string>;
  loginVolunteer: (phone: string, password: string) => Promise<"ok" | "pending" | "denied">;
  loginAdmin: (code: string) => Promise<boolean>;
  logout: () => Promise<void>;
  unlockRequest: (id: string, tail: string) => Promise<boolean>;
  approveVolunteer: (id: string) => Promise<boolean>;
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
};

function fromView(view: OpsView): Partial<Data> {
  return {
    ready: true,
    requests: view.requests,
    events: view.events,
    reports: view.reports,
    volunteers: view.volunteers,
    assignments: view.assignments,
    role: view.me.role,
    activeVolunteerId: view.me.volunteerId,
    myRequestIds: view.ownedRequestIds,
    demoAdminCode: view.demoAdminCode,
  };
}

export const useFloodStore = create<Store>()((set) => {
  async function send(action: OpsAction): Promise<OpsResult | null> {
    try {
      const result = await runOpsAction({ data: action });
      set(fromView(result.view));
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
    role: "citizen",
    activeVolunteerId: null,
    myRequestIds: [],
    demoAdminCode: null,

    refresh: async () => {
      try {
        set(fromView(await getOpsView()));
      } catch (err) {
        console.error("[ops] refresh failed", err);
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
      return r?.ok ? (r.value ?? "") : "";
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
  };
});

/** Keep this browser in step with the server: load now, then poll while visible. */
export function startOpsSync(intervalMs = 5000) {
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
