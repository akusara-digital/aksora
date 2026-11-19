import { Briefcase } from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { DashboardViewToggle } from "@/components/dashboard/dashboard-view-toggle";
import { getCurrentUser } from "@/lib/auth";
import { getMyWorkItems, getTodayWorkLogStats } from "@/lib/my-work";
import { MyWorkView } from "@/components/my-work/my-work-view";

export const dynamic = "force-dynamic";

export default async function MyWorkPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userName = String(user.name || "");
  const userEmail = String(user.email || "");

  const [items, stats] = await Promise.all([
    getMyWorkItems(user.id, userName, userEmail),
    getTodayWorkLogStats(user.id, userName, userEmail),
  ]);

  return (
    <PageShell
      icon={<Briefcase size={22} weight="bold" />}
      title="My Work"
      description="Open tasks and bugs assigned to you across all your workspaces."
      actions={<DashboardViewToggle activeView="my-work" />}
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "My Work" },
      ]}
    >
      <MyWorkView
        items={items}
        todayMinutes={stats.totalMinutes}
        userName={userName || userEmail || "User"}
      />
    </PageShell>
  );
}
