import { Suspense } from "react";
import { ActivityLogPage } from "@/components/activity/activity-log-page";
import { AppLoader } from "@/components/shared/app-loader";

export const dynamic = "force-dynamic";

export default function ActivityLog() {
  return (
    <Suspense fallback={<AppLoader message="Loading activity log..." />}>
      <ActivityLogPage />
    </Suspense>
  );
}
