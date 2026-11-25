import { beforeEach, describe, expect, it, vi } from "vitest";
import { createModuleRecord } from "@/lib/data";

const mocks = vi.hoisted(() => ({
  db: {
    run: vi.fn(),
    get: vi.fn(),
    query: vi.fn(),
    exec: vi.fn(),
  },
  getCurrentUser: vi.fn(),
  logActivity: vi.fn(),
  syncSearchTokens: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/data-helpers", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/lib/data-helpers");
  return {
    ...actual,
    logActivity: mocks.logActivity,
  };
});

vi.mock("@/lib/search-index", () => ({
  shouldIndexModule: vi.fn(() => false),
  syncSearchTokens: mocks.syncSearchTokens,
}));

describe("Auto-create test suite on test case creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: 1,
      name: "Wahyu Admin",
      email: "wahyu@example.com",
      role: "admin",
      company: "Akusara",
      workspaceId: 10,
    });
  });

  it("automatically creates a TestSuite if testSuiteId is missing or invalid", async () => {
    // When querying for existing suite with id 0 or non-existent, return null
    mocks.db.get.mockImplementation(async (sql: string) => {
      if (sql.includes('"publicToken" = ?') && sql.includes('"TestSuite"')) {
        return { id: 777, title: "Checkout Test Suite" };
      }
      if (sql.includes('SELECT "id", "title" FROM "TestSuite"')) {
        return null; // suite doesn't exist
      }
      if (sql.includes('SELECT "id" FROM "TestCase"')) {
        return { id: 999 };
      }
      return null;
    });

    mocks.db.run.mockResolvedValue({ changes: 1 });

    const result = await createModuleRecord("test-cases", {
      caseName: "User clicks checkout with coupon",
      tcId: "TC-001",
      typeCase: "Positive",
      testStep: "1. Add item\n2. Click checkout",
      expectedResult: "Discount applied",
      project: "Checkout",
      // testSuiteId is deliberately omitted / not provided
    });

    expect(result).toBeDefined();

    // Verify that INSERT INTO "TestSuite" was called
    const suiteInsertCall = mocks.db.run.mock.calls.find((call) =>
      typeof call[0] === "string" && call[0].includes('INSERT INTO "TestSuite"'),
    );
    expect(suiteInsertCall).toBeDefined();
    expect(suiteInsertCall![1]).toContain("Checkout Test Suite");

    // Verify that INSERT INTO "TestCase" was called with the new suite id
    const caseInsertCall = mocks.db.run.mock.calls.find((call) =>
      typeof call[0] === "string" && call[0].includes('INSERT INTO "TestCase"'),
    );
    expect(caseInsertCall).toBeDefined();
    expect(caseInsertCall![1]).toContain("777");
  });
});
