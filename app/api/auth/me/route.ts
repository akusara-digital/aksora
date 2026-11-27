import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { authEnabled, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkspaceMembershipsForUser } from "@/lib/workspace-memberships";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      {
        authEnabled: authEnabled(),
        authenticated: false,
        user: null,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }

  // Fetch avatar from DB (not stored in session token to keep it small)
  let avatar = "";
  try {
    const row = await db.get<{ avatar: string | null }>(
      'SELECT "avatar" FROM "User" WHERE "id" = CAST(? AS INTEGER)',
      [user.id]
    );
    const rawAvatar = row?.avatar || "";
    if (rawAvatar.startsWith("data:image/")) {
      const v = crypto.createHash("sha256").update(rawAvatar).digest("hex").slice(0, 8);
      avatar = `/api/auth/avatar/${user.id}?v=${v}`;
    } else {
      avatar = rawAvatar;
    }
  } catch { /* avatar column may not exist yet */ }

  const memberships = user.id ? await getWorkspaceMembershipsForUser(user.id) : [];

  const response = NextResponse.json(
    {
      authEnabled: authEnabled(),
      authenticated: true,
      user: { ...user, avatar, memberships },
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );

  // Self-healing: automatically refresh cookie with hydrated active workspace & company
  try {
    const { createSessionToken, sessionCookieName, sessionCookieOptions, SESSION_DURATION } = await import("@/lib/auth-core");
    const token = await createSessionToken(user.email, {
      id: user.id,
      name: user.name,
      role: user.role,
      company: user.company,
      activeWorkspaceId: user.activeWorkspaceId,
      locale: user.locale,
    }, SESSION_DURATION);
    response.cookies.set(sessionCookieName(), token, sessionCookieOptions());
  } catch {
    /* non-blocking session refresh */
  }

  return response;
}
