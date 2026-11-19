import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  dbGet: vi.fn(),
  dbRun: vi.fn(),
  getAccessScope: vi.fn(),
  clearTestManagementCache: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/db", () => ({
  db: {
    get: mocks.dbGet,
    run: mocks.dbRun,
  },
}));

vi.mock("@/lib/data-helpers", () => ({
  getAccessScope: mocks.getAccessScope,
}));

vi.mock("@/lib/test-management-data", () => ({
  clearTestManagementCache: mocks.clearTestManagementCache,
}));

import { POST } from "../route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAccessScope.mockReturnValue({
    isAdmin: false,
    andWhere: ' AND "workspaceId" = ?',
    params: [1],
  });
});

describe("POST /api/test-plans/[id]/suites", () => {
  it("rejects unauthorized callers", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const res = await POST(
      new Request("http://localhost/api/test-plans/10/suites", {
        method: "POST",
        body: JSON.stringify({ suiteIds: [1, 2] }),
      }),
      { params: Promise.resolve({ id: "10" }) },
    );

    expect(res.status).toBe(401);
  });

  it("returns 404 when test plan not found", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, email: "qa@example.com" });
    mocks.dbGet.mockResolvedValueOnce(null);

    const res = await POST(
      new Request("http://localhost/api/test-plans/999/suites", {
        method: "POST",
        body: JSON.stringify({ suiteIds: [1, 2] }),
      }),
      { params: Promise.resolve({ id: "999" }) },
    );

    expect(res.status).toBe(404);
  });

  it("successfully updates test plan suites and clears cache", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, email: "qa@example.com" });
    mocks.dbGet.mockResolvedValueOnce({ id: 10, publicToken: "plan-tok", title: "Release Plan" });
    mocks.dbRun.mockResolvedValue({ changes: 2 });

    const res = await POST(
      new Request("http://localhost/api/test-plans/10/suites", {
        method: "POST",
        body: JSON.stringify({ suiteIds: [101, 102] }),
      }),
      { params: Promise.resolve({ id: "10" }) },
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      success: true,
      planId: 10,
      linkedSuitesCount: 2,
      linkedCasesCount: 0,
    });
    expect(mocks.dbRun).toHaveBeenCalledTimes(3);
    expect(mocks.clearTestManagementCache).toHaveBeenCalledTimes(1);
  });

  it("persists test case checklist scope when caseIds are supplied", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, email: "qa@example.com" });
    mocks.dbGet.mockResolvedValueOnce({ id: 10, publicToken: "plan-tok", title: "Release Plan" });
    mocks.dbRun.mockResolvedValue({ changes: 1 });

    const res = await POST(
      new Request("http://localhost/api/test-plans/10/suites", {
        method: "POST",
        body: JSON.stringify({ suiteIds: [101], caseIds: [201, 202, 203] }),
      }),
      { params: Promise.resolve({ id: "10" }) },
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      success: true,
      planId: 10,
      linkedSuitesCount: 1,
      linkedCasesCount: 3,
    });
    expect(mocks.dbRun).toHaveBeenCalledTimes(3);
    expect(mocks.dbRun).toHaveBeenLastCalledWith(
      expect.stringContaining('UPDATE "TestPlan" SET "scope" = ?'),
      [JSON.stringify({ suiteIds: [101], caseIds: [201, 202, 203] }), 10, 1],
    );
  });

  it("handles unlinking all suites when suiteIds is empty", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, email: "qa@example.com" });
    mocks.dbGet.mockResolvedValueOnce({ id: 10, publicToken: "plan-tok", title: "Release Plan" });
    mocks.dbRun.mockResolvedValue({ changes: 1 });

    const res = await POST(
      new Request("http://localhost/api/test-plans/10/suites", {
        method: "POST",
        body: JSON.stringify({ suiteIds: [] }),
      }),
      { params: Promise.resolve({ id: "10" }) },
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.linkedSuitesCount).toBe(0);
    expect(mocks.dbRun).toHaveBeenCalledTimes(1);
    expect(mocks.clearTestManagementCache).toHaveBeenCalledTimes(1);
  });
});
