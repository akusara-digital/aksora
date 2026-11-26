import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";
import { db } from "@/lib/db";
import { fetchJiraMembers, getTracker, type TrackerRow } from "@/lib/issue-trackers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scope = getAccessScope(user);
  if (!scope.workspaceId) return NextResponse.json({ data: [] });

  const { searchParams } = new URL(request.url);
  const trackerIdParam = searchParams.get("trackerId");

  let tracker: TrackerRow | undefined = undefined;
  if (trackerIdParam && Number.isInteger(Number(trackerIdParam))) {
    tracker = await getTracker(Number(trackerIdParam), ` AND "workspaceId" = ?`, [scope.workspaceId]);
  }

  if (!tracker) {
    tracker = await db.get<TrackerRow>(
      `SELECT * FROM "IssueTracker" WHERE "workspaceId" = ? AND "kind" = 'jira' AND "enabled" = 1 AND "deletedAt" IS NULL ORDER BY "id" ASC LIMIT 1`,
      [scope.workspaceId],
    );
  }

  if (!tracker || !tracker.enabled) {
    return NextResponse.json({
      data: [],
      connected: false,
      error: "Jira integration is not configured or disabled in this workspace.",
    });
  }

  try {
    const members = await fetchJiraMembers(tracker);
    return NextResponse.json({
      data: members,
      connected: true,
      trackerName: tracker.name,
      trackerId: tracker.id,
    });
  } catch (err) {
    console.warn("[issue-trackers] Failed to fetch Jira members:", err);
    return NextResponse.json({
      data: [],
      connected: false,
      error: err instanceof Error ? err.message : "Failed to connect to Jira API.",
    });
  }
}
