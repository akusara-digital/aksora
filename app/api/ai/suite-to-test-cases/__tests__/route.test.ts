import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "../route";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/ai-service", () => ({
  callLLM: vi.fn(),
  DEFAULT_AI_MODELS: {
    google: ["gemini-2.0-flash"],
  },
}));

import { getCurrentUser } from "@/lib/auth";
import { callLLM } from "@/lib/ai-service";

describe("Suite to Test Cases API (/api/ai/suite-to-test-cases)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const req = new Request("http://localhost/api/ai/suite-to-test-cases", {
      method: "POST",
      body: JSON.stringify({ suite: { title: "Auth Flow" } }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  const mockUser = {
    id: 1,
    email: "qa@example.com",
    activeWorkspaceId: "ws-123",
  } as unknown as Awaited<ReturnType<typeof getCurrentUser>>;

  it("returns 400 when suite title is missing", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

    const req = new Request("http://localhost/api/ai/suite-to-test-cases", {
      method: "POST",
      body: JSON.stringify({ suite: {} }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("generates test cases successfully when valid suite is provided", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(callLLM).mockResolvedValue({
      content: JSON.stringify({
        testCases: [
          {
            caseName: "Verify valid email login",
            preCondition: "User account exists",
            testStep: "1. Enter valid email and password\n2. Click Sign In",
            expectedResult: "User successfully navigated to dashboard",
            typeCase: "Positive",
            priority: "High",
          },
          {
            caseName: "Verify invalid password login attempt",
            preCondition: "User account exists",
            testStep: "1. Enter valid email and invalid password\n2. Click Sign In",
            expectedResult: "Inline error message appears",
            typeCase: "Negative",
            priority: "Medium",
          },
        ],
      }),
      provider: "google",
      model: "gemini-2.0-flash",
      totalTokens: 250,
    });

    const req = new Request("http://localhost/api/ai/suite-to-test-cases", {
      method: "POST",
      body: JSON.stringify({
        suite: {
          title: "Authentication & Login Flow",
          notes: "Covers email/pass login, error validation, and lockout",
          count: 2,
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.testCases).toHaveLength(2);
    expect(json.data.testCases[0].caseName).toBe("Verify valid email login");
    expect(json.data.testCases[0].typeCase).toBe("Positive");
    expect(json.data.testCases[1].typeCase).toBe("Negative");
  });
});
