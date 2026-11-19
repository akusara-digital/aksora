import { describe, it, expect, vi } from "vitest";
import { actionIssueAgent } from "@/lib/ai-issue-agent";
import * as aiService from "@/lib/ai-service";

describe("actionIssueAgent", () => {
  it("fast-bypasses bare greetings without calling LLM", async () => {
    const callLLMSpy = vi.spyOn(aiService, "callLLM");
    const res = await actionIssueAgent(
      { prompt: "halo", project: "E-Commerce" },
      { provider: "google", model: "gemini-2.0-flash", apiKey: "test" }
    );
    expect(res.hasTicketData).toBe(false);
    expect(res.ticket).toBeNull();
    expect(res.assistantReply).toContain("Halo!");
    expect(callLLMSpy).not.toHaveBeenCalled();
    callLLMSpy.mockRestore();
  });

  it("handles valid bug report from LLM response correctly", async () => {
    const mockLlmResponse = {
      content: JSON.stringify({
        has_ticket_data: true,
        chat_title: "Checkout QRIS Issue",
        assistant_reply: "I drafted the bug report for Checkout.",
        project: "E-Commerce",
        module: "Checkout",
        bugType: "Functional",
        title: "[Checkout] - Tombol Bayar Sekarang tidak merespons setelah memilih metode QRIS",
        preconditions: "User has cart items",
        stepsToReproduce: "1. Go to checkout\n2. Select QRIS\n3. Click Pay Now",
        expectedResult: "QR code modal displays",
        actualResult: "Button remains unresponsive and console logs 500 error",
        severity: "high",
        priority: "P1",
        evidence: "https://example.com/log.png",
      }),
      provider: "google" as const,
      model: "gemini-2.0-flash",
      usage: { promptTokens: 100, completionTokens: 80, totalTokens: 180 },
    };

    const callLLMSpy = vi.spyOn(aiService, "callLLM").mockResolvedValue(mockLlmResponse as unknown as aiService.CallLLMResult);

    const res = await actionIssueAgent(
      {
        prompt: "Di checkout pas milih QRIS tombol bayar ga jalan ada error 500",
        project: "E-Commerce",
        preset: "standard",
      },
      { provider: "google", model: "gemini-2.0-flash", apiKey: "test" }
    );

    expect(res.hasTicketData).toBe(true);
    expect(res.ticket).not.toBeNull();
    expect(res.ticket?.title).toBe("[Checkout] - Tombol Bayar Sekarang tidak merespons setelah memilih metode QRIS");
    expect(res.ticket?.module).toBe("Checkout");
    expect(res.ticket?.bugType).toBe("Functional");
    expect(res.ticket?.severity).toBe("high");
    expect(res.ticket?.priority).toBe("P1");
    expect(res.ticket?.stepsToReproduce).toContain("1. Go to checkout");

    callLLMSpy.mockRestore();
  });

  it("normalizes unknown severity and bugType to safe fallbacks", async () => {
    const mockLlmResponse = {
      content: JSON.stringify({
        has_ticket_data: true,
        chat_title: "Broken layout",
        assistant_reply: "Drafted bug",
        project: "General",
        module: "UI",
        bugType: "Cosmetic", // Not standard in Aksora -> should map safely or fallback
        title: "[UI] - Button misaligned",
        preconditions: "None",
        stepsToReproduce: "1. Open page",
        expectedResult: "Aligned properly",
        actualResult: "Misaligned",
        severity: "catastrophic", // Invalid severity -> fallback to medium
        priority: "URGENT", // Invalid priority -> fallback to P2
      }),
      provider: "google" as const,
      model: "gemini-2.0-flash",
      usage: { promptTokens: 50, completionTokens: 50, totalTokens: 100 },
    };

    const callLLMSpy = vi.spyOn(aiService, "callLLM").mockResolvedValue(mockLlmResponse as unknown as aiService.CallLLMResult);

    const res = await actionIssueAgent(
      { prompt: "button misaligned", project: "General" },
      { provider: "google", model: "gemini-2.0-flash", apiKey: "test" }
    );

    expect(res.hasTicketData).toBe(true);
    expect(res.ticket?.severity).toBe("medium");
    expect(res.ticket?.priority).toBe("P2");
    expect(res.ticket?.bugType).toBe("Functional");

    callLLMSpy.mockRestore();
  });
});
