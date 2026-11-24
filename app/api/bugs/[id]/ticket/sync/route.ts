import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope, logActivity } from "@/lib/data-helpers";
import { normalizeRole } from "@/lib/roles";
import { fetchTicketStatus, type TrackerRow } from "@/lib/issue-trackers";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (normalizeRole(user.role) === "guest") return NextResponse.json({ error: "Guests have read-only access." }, { status: 403 });

  const scope = getAccessScope(user);
  const bugId = Number((await params).id);
  if (!Number.isInteger(bugId)) return NextResponse.json({ error: "Bug not found." }, { status: 404 });

  const bug = await db.get<{
    id: number;
    company: string;
    workspaceId: number | null;
    publicToken: string;
    title: string;
    status: string;
    externalTicket?: string;
  }>(
    `SELECT "id", "company", "workspaceId", "publicToken", "title", "status", "externalTicket"
     FROM "Bug" WHERE "id" = ? AND "deletedAt" IS NULL${scope.andWhere}`,
    [bugId, ...scope.params],
  );
  if (!bug) return NextResponse.json({ error: "Bug not found." }, { status: 404 });
  if (!bug.externalTicket || !bug.externalTicket.trim()) {
    return NextResponse.json({ error: "Bug has no linked Jira ticket." }, { status: 400 });
  }

  const tracker = await db.get<TrackerRow>(
    `SELECT * FROM "IssueTracker" WHERE "workspaceId" = ? AND "kind" = 'jira' AND "enabled" = 1 AND "deletedAt" IS NULL ORDER BY "id" ASC LIMIT 1`,
    [bug.workspaceId ?? -1],
  );
  if (!tracker || !tracker.enabled) {
    return NextResponse.json({ error: "No enabled Jira tracker found in this workspace." }, { status: 404 });
  }

  try {
    const result = await fetchTicketStatus(tracker, bug.externalTicket);
    const prevStatus = bug.status;
    const newStatus = result.mappedStatus;

    if (prevStatus !== newStatus) {
      await db.run(
        `UPDATE "Bug" SET "status" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`,
        [newStatus, bug.id],
      );
      await logActivity(
        bug.company,
        "Bug",
        String(bug.id),
        "Ticket status synced",
        `Synced Jira status "${result.statusName}" (changed status from "${prevStatus}" to "${newStatus}")`,
        user.name,
        bug.publicToken,
        bug.workspaceId,
      );
    }

    return NextResponse.json({
      data: {
        key: result.key,
        statusName: result.statusName,
        previousStatus: prevStatus,
        newStatus,
        changed: prevStatus !== newStatus,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to sync ticket status." }, { status: 502 });
  }
}
