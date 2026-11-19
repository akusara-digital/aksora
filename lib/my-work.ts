import { db } from "@/lib/db";
import { getWorkspaceMembershipsForUser } from "@/lib/workspace-memberships";

export type MyWorkItem = {
  type: "Task" | "Bug";
  id: number;
  code: string; // e.g. "TASK-12" or "BUG-4"
  title: string;
  project: string;
  priority: string;
  status: string;
  workspace: string;
  href: string;
  createdAt?: string;
};

export async function getMyWorkItems(userId: number, userName: string, userEmail: string): Promise<MyWorkItem[]> {
  const memberships = await getWorkspaceMembershipsForUser(userId);
  const workspaceIds = memberships.map((item) => item.workspaceId).filter((id): id is number => typeof id === "number" && id > 0);
  if (workspaceIds.length === 0) return [] as MyWorkItem[];

  const assigneeName = String(userName || userEmail || "").trim();

  const taskRows = await db.query<{
    id: number;
    title: string;
    priority: string;
    status: string;
    company: string;
    publicToken: string;
    project: string;
    createdAt?: string;
  }>(
    `SELECT "id", "title", "priority", "status", "company", "publicToken", "project", "createdAt"
     FROM "Task"
     WHERE "deletedAt" IS NULL
       AND ("assignee" = ? OR "assignee" = ?)
       AND "workspaceId" = ANY(?::int[])
     ORDER BY "updatedAt" DESC
     LIMIT 50`,
    [assigneeName, userEmail || assigneeName, workspaceIds],
  );

  const bugRows = await db.query<{
    id: number;
    title: string;
    severity: string;
    status: string;
    company: string;
    publicToken: string;
    project: string;
    createdAt?: string;
  }>(
    `SELECT "id", "title", "severity", "status", "company", "publicToken", "project", "createdAt"
     FROM "Bug"
     WHERE "deletedAt" IS NULL
       AND ("suggestedDev" = ? OR "suggestedDev" = ?)
       AND "workspaceId" = ANY(?::int[])
     ORDER BY "updatedAt" DESC
     LIMIT 50`,
    [assigneeName, userEmail || assigneeName, workspaceIds],
  );

  return [
    ...taskRows.map((row) => ({
      type: "Task" as const,
      id: Number(row.id),
      code: `TASK-${row.id}`,
      title: row.title,
      project: row.project || "General",
      priority: row.priority || "Normal",
      status: row.status || "Todo",
      workspace: row.company,
      href: `/api/auth/workspace/redirect?workspaceName=${encodeURIComponent(row.company)}&to=${encodeURIComponent(`/tasks?view=${row.publicToken || row.id}`)}`,
      createdAt: row.createdAt ? String(row.createdAt) : undefined,
    })),
    ...bugRows.map((row) => ({
      type: "Bug" as const,
      id: Number(row.id),
      code: `BUG-${row.id}`,
      title: row.title,
      project: row.project || "General",
      priority: row.severity || "Normal",
      status: row.status || "Open",
      workspace: row.company,
      href: `/api/auth/workspace/redirect?workspaceName=${encodeURIComponent(row.company)}&to=${encodeURIComponent(`/bugs?view=${row.publicToken || row.id}`)}`,
      createdAt: row.createdAt ? String(row.createdAt) : undefined,
    })),
  ].sort((a, b) => a.workspace.localeCompare(b.workspace) || a.type.localeCompare(b.type));
}

export async function getTodayWorkLogStats(
  userId: number,
  userName: string,
  userEmail: string,
  workspaceIds?: number[],
): Promise<{ totalMinutes: number; entryCount: number }> {
  let targetWorkspaceIds = workspaceIds;
  if (!targetWorkspaceIds || targetWorkspaceIds.length === 0) {
    const memberships = await getWorkspaceMembershipsForUser(userId);
    targetWorkspaceIds = memberships
      .map((item) => item.workspaceId)
      .filter((id): id is number => typeof id === "number" && id > 0);
  }

  if (targetWorkspaceIds.length === 0) {
    return { totalMinutes: 0, entryCount: 0 };
  }

  const assigneeName = String(userName || userEmail || "").trim();
  const todayIso = new Date().toISOString().split("T")[0];

  const rows = await db.query<{ durationMinutes: number | string | null }>(
    `SELECT "durationMinutes"
     FROM "WorkLog"
     WHERE "deletedAt" IS NULL
       AND ("assignee" = ? OR "assignee" = ?)
       AND ("date" = CURRENT_DATE::text OR "date" = ?)
       AND "workspaceId" = ANY(?::int[])`,
    [assigneeName, userEmail || assigneeName, todayIso, targetWorkspaceIds],
  );

  let totalMinutes = 0;
  for (const row of rows) {
    const dur = typeof row.durationMinutes === "number" ? row.durationMinutes : parseInt(String(row.durationMinutes || "0"), 10);
    if (!isNaN(dur) && dur > 0) {
      totalMinutes += dur;
    }
  }

  return {
    totalMinutes,
    entryCount: rows.length,
  };
}
