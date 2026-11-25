import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createSessionToken: vi.fn(),
  sessionCookieName: vi.fn(() => "aksora_token"),
  acceptInvite: vi.fn(),
  dbGet: vi.fn(),
  dbRun: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  createSessionToken: mocks.createSessionToken,
  sessionCookieName: mocks.sessionCookieName,
  sessionCookieOptions: vi.fn(() => ({
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 604800,
  })),
  SESSION_DURATION: 604800,
}));

vi.mock("@/lib/invites", () => ({
  acceptInvite: mocks.acceptInvite,
}));

vi.mock("@/lib/db", () => ({
  db: {
    get: mocks.dbGet,
    run: mocks.dbRun,
  },
}));

import { POST } from "@/app/api/workspaces/join/route";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.sessionCookieName.mockReturnValue("aksora_token");
  mocks.getCurrentUser.mockResolvedValue({ id: 10, email: "tester@akusara.dev", name: "Tester" });
  mocks.createSessionToken.mockResolvedValue("mocked-session-token");
});

describe("POST /api/workspaces/join", () => {
  it("returns 401 when unauthenticated", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    const req = new NextRequest("http://localhost/api/workspaces/join", {
      method: "POST",
      body: JSON.stringify({ token: "tok123" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when token is missing", async () => {
    const req = new NextRequest("http://localhost/api/workspaces/join", {
      method: "POST",
      body: JSON.stringify({ token: "   " }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invite token or link is required.");
  });

  it("successfully parses full invite URL and accepts invite", async () => {
    mocks.acceptInvite.mockResolvedValueOnce({ ok: true, company: "Beta QA", role: "qa" });
    mocks.dbGet.mockResolvedValueOnce({ id: 99, name: "Beta QA", slug: "beta-qa", uuid: "uuid-99" });

    const req = new NextRequest("http://localhost/api/workspaces/join", {
      method: "POST",
      body: JSON.stringify({ token: "https://aksora.app/invite/token-abc1234?extra=1" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.workspace.name).toBe("Beta QA");
    expect(json.workspace.uuid).toBe("uuid-99");
    expect(mocks.acceptInvite).toHaveBeenCalledWith("token-abc1234", "tester@akusara.dev");
  });

  it("returns 400 when acceptInvite fails", async () => {
    mocks.acceptInvite.mockResolvedValueOnce({ error: "Invite expired." });

    const req = new NextRequest("http://localhost/api/workspaces/join", {
      method: "POST",
      body: JSON.stringify({ token: "expired-token" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invite expired.");
  });
});
