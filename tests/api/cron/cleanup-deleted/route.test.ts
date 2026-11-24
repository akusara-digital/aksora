/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dbGet: vi.fn(),
  dbQuery: vi.fn(),
  dbRun: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { get: mocks.dbGet, query: mocks.dbQuery, run: mocks.dbRun },
}));

vi.mock("@/lib/auth", () => ({
  verifySharedSecret: (provided: string, expected: string) => provided === expected,
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/roles", () => ({
  isManagementAdmin: (role: string) => role === "admin" || role === "superadmin",
}));

import { GET } from "@/app/api/cron/cleanup-deleted/route";
import type { NextRequest } from "next/server";

function req(authHeader?: string) {
  return {
    headers: {
      get: (k: string) => (k === "authorization" ? authHeader || null : null),
    },
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.resetAllMocks();
  process.env.CRON_SECRET = "test-secret";
  mocks.dbQuery.mockResolvedValue([]);
  mocks.dbRun.mockResolvedValue(undefined);
  mocks.dbGet.mockResolvedValue({ formatted: "12 MB" });
  mocks.getCurrentUser.mockResolvedValue(null);
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("cleanup-deleted cron", () => {
  it("rejects unauthorized callers without cron secret or admin session", async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it("authorizes when valid CRON_SECRET is provided", async () => {
    const res = await GET(req("Bearer test-secret"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.currentDbSize).toBe("12 MB");
    expect(json.deletedCounts.Task).toBe(0);
    expect(mocks.dbRun).toHaveBeenCalled();
  });

  it("authorizes when authenticated as a management admin", async () => {
    mocks.getCurrentUser.mockResolvedValue({ role: "admin", company: "TestCo" });
    const res = await GET(req());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
