import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, getCurrentUser, sessionCookieName, sessionCookieOptions, SESSION_DURATION } from "@/lib/auth";
import { getWorkspaceMembershipsForUser } from "@/lib/workspace-memberships";

// Only ever redirect to a same-origin relative path — "to" is attacker-
// controlled query input, and an absolute URL (https://evil.example) would
// otherwise override the base passed to new URL(to, request.url) entirely
// (WHATWG URL parsing ignores the base when the first argument is absolute).
function safeRedirectPath(to: string): string {
  if (to.startsWith("/") && !to.startsWith("//") && !to.startsWith("/\\")) return to;
  return "/dashboard";
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const workspaceName = String(request.nextUrl.searchParams.get("workspaceName") || "").trim();
  const to = safeRedirectPath(String(request.nextUrl.searchParams.get("to") || "/dashboard").trim() || "/dashboard");
  if (!workspaceName) {
    return NextResponse.redirect(new URL(to, request.url));
  }

  const memberships = await getWorkspaceMembershipsForUser(user.id);
  const membership = memberships.find((item) => item.name === workspaceName);
  if (!membership) {
    return NextResponse.redirect(new URL("/settings/workspaces", request.url));
  }

  const response = NextResponse.redirect(new URL(to, request.url));
  response.cookies.set(
    sessionCookieName(),
    await createSessionToken(user.email, {
      id: user.id,
      uuid: user.uuid,
      name: user.name,
      role: membership.role,
      company: membership.name,
      activeWorkspaceId: membership.workspaceId,
      workspaceUuid: membership.uuid,
    }, SESSION_DURATION),
    sessionCookieOptions(),
  );
  return response;
}
