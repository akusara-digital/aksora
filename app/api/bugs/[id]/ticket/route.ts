import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope, logActivity } from "@/lib/data-helpers";
import { normalizeRole } from "@/lib/roles";
import { createTicket, getTracker, type TicketBug } from "@/lib/issue-trackers";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  trackerId: z.coerce.number().int().positive().optional(),
  runUrl: z.string().url().optional(),
  environment: z.string().optional(),
  scope: z.string().optional(),
  assignee: z.string().optional(),
  assigneeName: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (normalizeRole(user.role) === "guest") return NextResponse.json({ error: "Guests have read-only access." }, { status: 403 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });

  const scope = getAccessScope(user);
  const bugId = Number((await params).id);
  if (!Number.isInteger(bugId)) return NextResponse.json({ error: "Bug not found." }, { status: 404 });

  const bug = await db.get<TicketBug & { company: string; workspaceId: number | null; externalTicket?: string }>(
    `SELECT "id", "company", "workspaceId", "publicToken", "title", "project", "module", "severity", "priority", "preconditions",
            "stepsToReproduce", "expectedResult", "actualResult", "externalTicket"
     FROM "Bug" WHERE "id" = ? AND "deletedAt" IS NULL${scope.andWhere}`,
    [bugId, ...scope.params],
  );
  if (!bug) return NextResponse.json({ error: "Bug not found." }, { status: 404 });

  let tracker;
  if (parsed.data.trackerId) {
    tracker = await getTracker(parsed.data.trackerId, ` AND "workspaceId" = ?`, [bug.workspaceId ?? -1]);
  } else {
    // Fall back to active enabled Jira tracker for the bug's workspace
    tracker = await db.get<import("@/lib/issue-trackers").TrackerRow>(
      `SELECT * FROM "IssueTracker" WHERE "workspaceId" = ? AND "kind" = 'jira' AND "enabled" = 1 AND "deletedAt" IS NULL ORDER BY "id" ASC LIMIT 1`,
      [bug.workspaceId ?? -1],
    );
  }
  if (!tracker || !tracker.enabled) return NextResponse.json({ error: "No enabled Jira tracker found in this workspace." }, { status: 404 });

  try {
    const ticket = await createTicket(tracker, bug, {
      runUrl: parsed.data.runUrl,
      environment: parsed.data.environment,
      scope: parsed.data.scope,
      assignee: parsed.data.assignee,
      assigneeName: parsed.data.assigneeName,
    });
    const externalTicket = ticket.url || ticket.key;
    await db.run(`UPDATE "Bug" SET "externalTicket" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`, [externalTicket, bug.id]);
    await logActivity(
      bug.company,
      "Bug",
      String(bug.id),
      "Ticket created",
      `Created ${tracker.kind} ticket ${ticket.key} via "${tracker.name}"`,
      user.name,
      bug.publicToken,
      bug.workspaceId,
    );
    return NextResponse.json({ data: { ...ticket, externalTicket } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create ticket." }, { status: 502 });
  }
}
