import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { IntelFrame } from "@/components/intel-frame";
import { AppShell } from "@/components/shell";
import { getIntelAccess } from "@/lib/intel/fns";

export const Route = createFileRoute("/intel")({
  beforeLoad: async () => {
    const access = await getIntelAccess();
    if (!access.ok) {
      throw redirect({ to: "/intel-denied", search: { reason: access.reason } });
    }
    return { member: access.member };
  },
  component: IntelLayout,
});

function IntelLayout() {
  const { member } = Route.useRouteContext();
  return (
    <AppShell>
      <IntelFrame member={member}>
        <Outlet />
      </IntelFrame>
    </AppShell>
  );
}
