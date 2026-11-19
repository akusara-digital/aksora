import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { callLLM, DEFAULT_AI_MODELS, type SupportedProvider } from "@/lib/ai-service";
import { parseJsonSafe } from "@/lib/ai-qa-actions";

export const dynamic = "force-dynamic";

interface SuiteToCasesPayload {
  title: string;
  notes?: string;
  project?: string;
  planTitle?: string;
  focusArea?: string;
  count?: number;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      suite: SuiteToCasesPayload;
      ai?: {
        provider?: string;
        model?: string;
        apiKey?: string;
        publicUrl?: string;
      };
    };

    const suite = body?.suite;
    if (!suite || !suite.title?.trim()) {
      return NextResponse.json({ error: "Suite name is required" }, { status: 400 });
    }

    const ai = body.ai || {};
    const provider = (ai.provider || "google").toLowerCase().trim();
    const model = ai.model || DEFAULT_AI_MODELS[provider as SupportedProvider]?.[0] || "gemini-2.0-flash";
    const apiKey = ai.apiKey || "";
    const publicBaseUrl = ai.publicUrl || "";
    const requestedCount = Math.min(Math.max(Number(suite.count || 5), 1), 8);

    const systemPrompt = `You are a Senior QA Test Lead and Test Architect.
Analyze the provided test suite name, scope notes/goals, linked project, and optional focus area.
Generate ${requestedCount} high-quality, practical, distinct test cases that provide comprehensive coverage for this test suite.
Ensure a balanced mix of:
1. Positive / Happy Path verification (verifying primary suite objectives)
2. Negative test scenarios (validation errors, unauthorized access, incorrect inputs)
3. Edge cases and boundary conditions (empty states, max lengths, concurrent actions, or error states)

Respond ONLY with valid JSON in this exact structure with no extra text or markdown fences:
{
  "testCases": [
    {
      "caseName": "Clear descriptive title starting with action (e.g. Verify login with valid credentials)",
      "preCondition": "Prerequisites needed before starting this test",
      "testStep": "1. Step one\\n2. Step two\\n3. Step three",
      "expectedResult": "Observable expected outcome",
      "typeCase": "Positive", // Positive | Negative
      "priority": "High" // Critical | High | Medium | Low
    }
  ]
}`;

    const userPrompt = `Test Suite Name: ${suite.title.trim()}
${suite.notes?.trim() ? `Scope / Goals:\n${suite.notes.trim()}\n` : ""}${suite.project?.trim() ? `Project: ${suite.project.trim()}\n` : ""}${suite.planTitle?.trim() ? `Linked Test Plan: ${suite.planTitle.trim()}\n` : ""}${suite.focusArea?.trim() ? `Focus Area / Requirements: ${suite.focusArea.trim()}\n` : ""}`;

    const res = await callLLM({
      provider,
      model,
      apiKey,
      publicBaseUrl,
      systemPrompt,
      userPrompt,
      jsonMode: true,
      maxTokens: 3000,
      usage: {
        feature: "suite_to_test_cases",
        workspaceId: user.activeWorkspaceId ?? null,
        userId: user.id,
      },
    });

    const parsed = parseJsonSafe<{
      testCases: Array<{
        caseName: string;
        preCondition?: string;
        testStep?: string;
        expectedResult?: string;
        typeCase?: string;
        priority?: string;
      }>;
    }>(res.content, { testCases: [] });

    const testCases = (Array.isArray(parsed.testCases) ? parsed.testCases : []).map((tc, idx) => ({
      caseName: tc.caseName || `Verify ${suite.title} - Scenario #${idx + 1}`,
      preCondition: tc.preCondition || "Application is deployed and accessible in QA environment",
      testStep: tc.testStep || "1. Navigate to target feature\n2. Perform verification steps\n3. Confirm expected outcome",
      expectedResult: tc.expectedResult || "Expected behavior complies with specification",
      typeCase: tc.typeCase === "Negative" ? "Negative" : "Positive",
      priority: ["Critical", "High", "Medium", "Low"].includes(tc.priority || "")
        ? tc.priority
        : "Medium",
    }));

    return NextResponse.json({
      data: {
        testCases,
        provider,
        model,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate test cases" },
      { status: 500 },
    );
  }
}
