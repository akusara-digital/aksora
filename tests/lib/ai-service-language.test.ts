import { describe, it, expect, vi, afterEach } from "vitest";
import { callLLM, LANGUAGE_MATCH_DIRECTIVE } from "@/lib/ai-service";

describe("callLLM universal language matching", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("injects LANGUAGE_MATCH_DIRECTIVE into OpenAI-compatible system prompt", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "ok" } }],
        usage: { total_tokens: 10 },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await callLLM({
      provider: "openai",
      apiKey: "test-key",
      model: "gpt-4o-mini",
      systemPrompt: "You are a QA Lead.",
      userPrompt: "Buat bug report untuk tombol login",
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toContain("You are a QA Lead.");
    expect(body.messages[0].content).toContain(LANGUAGE_MATCH_DIRECTIVE);
  });

  it("injects LANGUAGE_MATCH_DIRECTIVE even when no systemPrompt is passed", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "ok" }] } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await callLLM({
      provider: "google",
      apiKey: "test-key",
      model: "gemini-2.0-flash",
      systemPrompt: "",
      userPrompt: "Generate test cases for checkout",
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const sentText = body.contents[0].parts[0].text as string;
    expect(sentText).toContain(LANGUAGE_MATCH_DIRECTIVE);
    expect(sentText).toContain("Generate test cases for checkout");
  });
});
