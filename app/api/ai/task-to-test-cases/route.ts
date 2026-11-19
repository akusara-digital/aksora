import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { callLLM, DEFAULT_AI_MODELS, type SupportedProvider } from "@/lib/ai-service";
import { parseJsonSafe } from "@/lib/ai-qa-actions";
import { formatStepScenario } from "@/lib/test-step-utils";

export const dynamic = "force-dynamic";

interface TaskToCasesPayload {
  title: string;
  feature?: string;
  description?: string;
  acceptanceCriteria?: string;
  project?: string;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      task: TaskToCasesPayload;
      ai?: {
        provider?: string;
        model?: string;
        apiKey?: string;
        publicUrl?: string;
      };
    };

    const task = body?.task;
    if (!task || !task.title?.trim()) {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 });
    }

    const ai = body.ai || {};
    const provider = (ai.provider || "google").toLowerCase().trim();
    const model = ai.model || DEFAULT_AI_MODELS[provider as SupportedProvider]?.[0] || "gemini-2.0-flash";
    const apiKey = ai.apiKey || "";
    const publicBaseUrl = ai.publicUrl || "";

    const systemPrompt = `You are an elite QA Lead and Acceptance Test Architect.
Analyze the provided user story / task requirements, feature description, and acceptance criteria.
Generate 3 to 5 high-quality, practical test cases that rigorously verify the feature.
Include:
1. Positive Happy Path verifying primary acceptance criteria
2. Negative test case (e.g. invalid inputs, missing fields, unauthorized attempts)
3. Edge case or boundary condition (e.g. max characters, empty states, network timeouts, duplicate submissions)

Respond ONLY with valid JSON in this exact structure with no extra text or markdown fences:
{
  "testCases": [
    {
      "caseName": "Clear descriptive title starting with action (e.g., Verify successful task creation with valid inputs)",
      "preCondition": "Prerequisites needed before test",
      "testStep": "1. Navigate to ...\\n2. Fill in ...\\n3. Click ...",
      "expectedResult": "Expected observable outcome",
      "typeCase": "Positive", // Positive | Negative
      "priority": "High" // Critical | High | Medium | Low
    }
  ]
}`;

    const userPrompt = `Task Title: ${task.title}
${task.feature ? `Feature Area: ${task.feature}\n` : ""}${task.project ? `Project: ${task.project}\n` : ""}${task.description ? `Description:\n${task.description}\n` : ""}${task.acceptanceCriteria ? `Acceptance Criteria:\n${task.acceptanceCriteria}\n` : ""}`;

    const res = await callLLM({
      provider,
      model,
      apiKey,
      publicBaseUrl,
      systemPrompt,
      userPrompt,
      jsonMode: true,
      maxTokens: 2500,
      usage: {
        feature: "task_to_test_cases",
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
      caseName: tc.caseName || `Verify ${task.title} - Scenario #${idx + 1}`,
      preCondition: tc.preCondition || "Application is running and user is authenticated",
      testStep: formatStepScenario(tc.testStep || "1. Perform action specified in acceptance criteria\n2. Observe result"),
      expectedResult: tc.expectedResult || "System behaves according to acceptance criteria",
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
