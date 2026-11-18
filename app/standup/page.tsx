import { Suspense } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { MicrophoneStage } from "@phosphor-icons/react/dist/ssr";
import { StandupClient } from "./standup-client";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default function StandupPage() {
  return (
    <PageShell
      icon={<MicrophoneStage size={22} weight="bold" />}
      title="Daily Standup"
      description="Track daily team progress — yesterday, today, and blockers linked directly to active tasks."
      crumbs={[{ label: "Tasks", href: "/tasks" }, { label: "Daily Standup" }]}
    >
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <StandupClient />
      </Suspense>
    </PageShell>
  );
}
