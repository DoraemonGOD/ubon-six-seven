import { createServerFn } from "@tanstack/react-start";
import type { OpsAction } from "./ops.server";

export const getOpsView = createServerFn({ method: "GET" }).handler(async () => {
  const { readView } = await import("./ops.server");
  return readView();
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
