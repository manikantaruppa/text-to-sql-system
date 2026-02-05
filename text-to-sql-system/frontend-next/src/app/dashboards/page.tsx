import { ShellLayout } from "@/components/shell-layout";
import { DashboardBoard } from "@/components/dashboard-board";

export default function DashboardsPage() {
  return (
    <ShellLayout
      headerLeft={<div className="text-sm text-zinc-300">Saved Dashboards</div>}
      headerRight={<div className="chip">Live filters enabled</div>}
    >
      <DashboardBoard />
    </ShellLayout>
  );
}
