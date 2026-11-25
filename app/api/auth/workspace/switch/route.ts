import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, getCurrentUser, sessionCookieName, sessionCookieOptions, SESSION_DURATION } from "@/lib/auth";
import { getWorkspaceMembershipsForUser } from "@/lib/workspace-memberships";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { workspaceId?: number; workspaceUuid?: string; ws?: string } | null;
  const wsUuid = body?.workspaceUuid || body?.ws;
  let workspaceId = Number(body?.workspaceId || 0);

  if (!workspaceId && !wsUuid) {
    return NextResponse.json({ error: "Workspace identifier is required." }, { status: 400 });
  }

  const memberships = await getWorkspaceMembershipsForUser(user.id);
  let membership = workspaceId ? memberships.find((item) => Number(item.workspaceId) === workspaceId) : undefined;
  if (!membership && wsUuid) {
    membership = memberships.find((item) => item.uuid === wsUuid || item.slug === wsUuid);
    if (membership) workspaceId = Number(membership.workspaceId);
  }
  if (!membership) {
    const { db } = await import("@/lib/db");
    const targetWs = await db.get<{ id: number; uuid?: string }>(
      'SELECT "id", "uuid" FROM "Workspace" WHERE "id" = CAST(? AS INTEGER) OR "uuid" = ? OR "slug" = ? LIMIT 1',
      [workspaceId || -1, wsUuid || "", wsUuid || ""],
    );
    if (targetWs) {
      return NextResponse.json({ error: "You are not a member of this workspace." }, { status: 403 });
    }
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  try {
    const { db } = await import("@/lib/db");
    await db.run(
      'UPDATE "User" SET "activeWorkspaceId" = CAST(? AS INTEGER), "company" = ? WHERE "id" = CAST(? AS INTEGER)',
      [workspaceId, membership.name, user.id],
    );
  } catch { /* non-critical */ }

  const response = NextResponse.json({
    ok: true,
    workspaceId,
    workspaceUuid: membership.uuid,
    role: membership.role,
    workspace: membership.name,
  });
  response.cookies.set(
    sessionCookieName(),
    await createSessionToken(user.email, {
      id: user.id,
      uuid: user.uuid,
      name: user.name,
      role: membership.role,
      company: membership.name,
      activeWorkspaceId: workspaceId,
      workspaceUuid: membership.uuid,
    }, SESSION_DURATION),
    sessionCookieOptions(),
  );
  return response;
}
