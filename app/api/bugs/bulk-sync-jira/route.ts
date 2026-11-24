import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope, logActivity } from "@/lib/data-helpers";
import { normalizeRole } from "@/lib/roles";
import { fetchTicketStatus, type TrackerRow } from "@/lib/issue-trackers";

export const dynamic = "force-dynamic";

const bulkSyncSchema = z.object({
  bugIds: z.array(z.coerce.number().int().positive()).optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (normalizeRole(user.role) === "guest") return NextResponse.json({ error: "Guests have read-only access." }, { status: 403 });

  const parsed = bulkSyncSchema.safeParse(await request.json().catch(() => ({})));
  const bugIds = parsed.success ? parsed.data.bugIds : undefined;

  const scope = getAccessScope(user);
  let query = `SELECT "id", "company", "workspaceId", "publicToken", "title", "status", "externalTicket"
               FROM "Bug" WHERE "deletedAt" IS NULL AND "externalTicket" IS NOT NULL AND "externalTicket" != ''${scope.andWhere}`;
  const params: unknown[] = [...scope.params];

  if (bugIds && bugIds.length > 0) {
    query += ` AND "id" IN (${bugIds.map(() => "?").join(",")})`;
    params.push(...bugIds);
  }

  const bugs = await db.query<{
    id: number;
    company: string;
    workspaceId: number | null;
    publicToken: string;
    title: string;
    status: string;
    externalTicket: string;
  }>(query, params);

  if (bugs.length === 0) {
    return NextResponse.json({ data: { syncedCount: 0, updatedCount: 0, results: [] } });
  }

  const workspaceId = bugs[0].workspaceId ?? -1;
  const tracker = await db.get<TrackerRow>(
    `SELECT * FROM "IssueTracker" WHERE "workspaceId" = ? AND "kind" = 'jira' AND "enabled" = 1 AND "deletedAt" IS NULL ORDER BY "id" ASC LIMIT 1`,
    [workspaceId],
  );
  if (!tracker || !tracker.enabled) {
    return NextResponse.json({ error: "No enabled Jira tracker found in this workspace." }, { status: 404 });
  }

  const results: Array<{ id: number; key: string; statusName?: string; previousStatus: string; newStatus: string; updated: boolean; error?: string }> = [];

  for (const bug of bugs) {
    try {
      const res = await fetchTicketStatus(tracker, bug.externalTicket);
      const prevStatus = bug.status;
      const newStatus = res.mappedStatus;
      const updated = prevStatus !== newStatus;

      if (updated) {
        await db.run(`UPDATE "Bug" SET "status" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`, [newStatus, bug.id]);
        await logActivity(
          bug.company,
          "Bug",
          String(bug.id),
          "Ticket status synced",
          `Synced Jira status "${res.statusName}" (changed status from "${prevStatus}" to "${newStatus}") [Bulk]`,
          user.name,
          bug.publicToken,
          bug.workspaceId,
        );
      }
      results.push({ id: bug.id, key: res.key, statusName: res.statusName, previousStatus: prevStatus, newStatus, updated });
    } catch (err) {
      results.push({
        id: bug.id,
        key: bug.externalTicket,
        previousStatus: bug.status,
        newStatus: bug.status,
        updated: false,
        error: err instanceof Error ? err.message : "Failed to sync",
      });
    }
  }

  const updatedCount = results.filter((r) => r.updated).length;
  return NextResponse.json({
    data: {
      syncedCount: results.filter((r) => !r.error).length,
      updatedCount,
      results,
    },
  });
}
