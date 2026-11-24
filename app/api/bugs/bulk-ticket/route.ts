import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope, logActivity } from "@/lib/data-helpers";
import { normalizeRole } from "@/lib/roles";
import { createTicket, type TicketBug, type TrackerRow } from "@/lib/issue-trackers";

export const dynamic = "force-dynamic";

const bulkSchema = z.object({
  bugIds: z.array(z.coerce.number().int().positive()).min(1),
  environment: z.string().optional(),
  scope: z.string().optional(),
  assignee: z.string().optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (normalizeRole(user.role) === "guest") return NextResponse.json({ error: "Guests have read-only access." }, { status: 403 });

  const parsed = bulkSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });

  const scope = getAccessScope(user);
  const { bugIds, environment, scope: bugScope, assignee } = parsed.data;

  const bugs = await db.query<TicketBug & { company: string; workspaceId: number | null; externalTicket?: string }>(
    `SELECT "id", "company", "workspaceId", "publicToken", "title", "project", "module", "severity", "priority", "preconditions",
            "stepsToReproduce", "expectedResult", "actualResult", "externalTicket"
     FROM "Bug" WHERE "id" IN (${bugIds.map(() => "?").join(",")}) AND "deletedAt" IS NULL${scope.andWhere}`,
    [...bugIds, ...scope.params],
  );

  if (bugs.length === 0) return NextResponse.json({ error: "No bugs found." }, { status: 404 });

  const workspaceId = bugs[0].workspaceId ?? -1;
  const tracker = await db.get<TrackerRow>(
    `SELECT * FROM "IssueTracker" WHERE "workspaceId" = ? AND "kind" = 'jira' AND "enabled" = 1 AND "deletedAt" IS NULL ORDER BY "id" ASC LIMIT 1`,
    [workspaceId],
  );
  if (!tracker || !tracker.enabled) return NextResponse.json({ error: "No enabled Jira tracker found in this workspace." }, { status: 404 });

  const results: Array<{ id: number; key?: string; externalTicket?: string; success: boolean; error?: string }> = [];

  for (const bug of bugs) {
    try {
      const ticket = await createTicket(tracker, bug, {
        environment,
        scope: bugScope,
        assignee,
      });
      const externalTicket = ticket.url || ticket.key;
      await db.run(`UPDATE "Bug" SET "externalTicket" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`, [externalTicket, bug.id]);
      await logActivity(
        bug.company,
        "Bug",
        String(bug.id),
        "Ticket created",
        `Created ${tracker.kind} ticket ${ticket.key} via "${tracker.name}" (Bulk)`,
        user.name,
        bug.publicToken,
        bug.workspaceId,
      );
      results.push({ id: bug.id, key: ticket.key, externalTicket, success: true });
    } catch (err) {
      results.push({ id: bug.id, success: false, error: err instanceof Error ? err.message : "Failed to push" });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  return NextResponse.json({
    data: {
      successCount,
      failedCount: results.length - successCount,
      results,
    },
  });
}
