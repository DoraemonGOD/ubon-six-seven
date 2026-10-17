import { createServerFn } from "@tanstack/react-start";
import type { OpsAction } from "./ops.server";

export const getOpsView = createServerFn({ method: "GET" })
  .validator((data: { since?: string } | undefined) => ({
    since: typeof data?.since === "string" ? data.since.slice(0, 300) : undefined,
  }))
  .handler(async ({ data }) => {
    const { readView } = await import("./ops.server");
    return readView(data.since);
  });

export const runOpsAction = createServerFn({ method: "POST" })
  .validator((data: OpsAction) => {
    if (!data || typeof data !== "object" || typeof (data as { type?: unknown }).type !== "string") {
      throw new Error("invalid action");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const { runAction } = await import("./ops.server");
    return runAction(data);
  });

/** One photo on demand (lists only carry `hasPhoto`). */
export const getOpsPhoto = createServerFn({ method: "GET" })
  .validator((data: { kind: "request" | "report"; id: string }) => {
    if (!data || (data.kind !== "request" && data.kind !== "report") || typeof data.id !== "string") {
      throw new Error("invalid photo request");
    }
    return { kind: data.kind, id: data.id.slice(0, 40) };
  })
  .handler(async ({ data }) => {
    const { readPhoto } = await import("./ops.server");
    return { photo: await readPhoto(data.kind, data.id) };
  });
