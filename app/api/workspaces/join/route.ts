import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, getCurrentUser, sessionCookieName, sessionCookieOptions, SESSION_DURATION } from "@/lib/auth";
import { acceptInvite } from "@/lib/invites";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const rawToken = String(body?.token || "").trim();

  // Support either raw token string or full invite URL (e.g. https://domain.com/invite/token)
  const cleanToken = rawToken
    .replace(/^.*\/invite\//, "")
    .split(/[?#]/)[0]
    .trim();

  if (!cleanToken) {
    return NextResponse.json({ error: "Invite token or link is required." }, { status: 400 });
  }

  const result = await acceptInvite(cleanToken, user.email);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const workspace = await db.get<{ id: number; name: string; slug: string; uuid?: string }>(
    'SELECT "id", "name", "slug", "uuid" FROM "Workspace" WHERE "name" = ? LIMIT 1',
    [result.company],
  );

  if (workspace?.id) {
    try {
      await db.run(
        'UPDATE "User" SET "activeWorkspaceId" = CAST(? AS INTEGER), "company" = ? WHERE "id" = CAST(? AS INTEGER)',
        [workspace.id, result.company, user.id],
      );
    } catch {
      /* non-critical */
    }
  }

  const response = NextResponse.json({
    ok: true,
    workspace: {
      id: workspace?.id,
      name: result.company,
      uuid: workspace?.uuid,
      role: result.role,
    },
  });

  if (workspace) {
    response.cookies.set(
      sessionCookieName(),
      await createSessionToken(user.email, {
        id: user.id,
        name: user.name,
        role: result.role,
        company: workspace.name,
        activeWorkspaceId: workspace.id,
        workspaceUuid: workspace.uuid,
      }, SESSION_DURATION),
      sessionCookieOptions(),
    );
  }

  return response;
}
