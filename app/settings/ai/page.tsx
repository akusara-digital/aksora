import { PageShell } from "@/components/layout/page-shell";
import { getCurrentUser } from "@/lib/auth";
import { Robot } from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { AISettingsClient } from "@/components/settings/ai-settings-client";

export const dynamic = "force-dynamic";

export default async function AISettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const crumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Settings", href: "/settings" },
    { label: "AI & Models" },
  ];

  return (
    <PageShell
      icon={<Robot size={22} weight="bold" />}
      title="AI & Models"
      description="Configure AI providers and credentials for automated testing, defect triage, and agent workflows."
      crumbs={crumbs}
    >
      <AISettingsClient />
    </PageShell>
  );
}
