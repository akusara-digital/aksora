import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { isManagementAdmin, normalizeRole } from "@/lib/roles";
import { getSettingsGroups } from "@/lib/settings-nav";
import { SettingsNav } from "@/components/settings/settings-nav";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return <>{children}</>;
  }

  const role = normalizeRole(user.role);
  const isAdmin = isManagementAdmin(user.role, user.company);
  const canConfigureQa = isAdmin || role === "qa" || role === "fullstack" || role === "ai" || role === "pm";
  const canAccessAi = isAdmin || role === "pm" || role === "ai";
  const groups = getSettingsGroups({ isAdmin, canConfigureQa, canAccessAi });

  return (
    <div className="flex flex-col lg:flex-row lg:items-start lg:gap-6">
      <Suspense fallback={null}>
        <SettingsNav groups={groups} />
      </Suspense>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
