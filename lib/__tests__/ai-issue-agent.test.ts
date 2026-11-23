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

  it("structures bugs with Description, Expected Result, Actual Result, Acceptance Criteria, and preserves BugSnap evidence URL", async () => {
    const mockLlmResponse = {
      content: JSON.stringify({
        has_ticket_data: true,
        chat_title: "Image Studio Brief Lost",
        assistant_reply: "Drafted bug for Image Studio.",
        project: "VanApp",
        module: "Image Studio",
        bugType: "Functional",
        title: "[Image Studio] - Brief hilang dari form setelah proses generate gambar",
        description: "Brief yang sudah diisi pengguna di Image Studio hilang dari form, sehingga pengguna harus mengisi ulang brief dan proses kerja terhambat. Dampak ini berpotensi menyebabkan kehilangan input dan menurunkan kepercayaan pengguna terhadap fitur.",
        expectedResult: "Brief yang sudah diisi tetap tersimpan dan tampil di form Image Studio setelah proses generate berjalan atau selesai.",
        actualResult: "Brief hilang dari form Image Studio dan kolom brief kembali kosong.",
        acceptanceCriteria: "☐ Setelah pengguna mengisi brief lalu menjalankan generate, isi brief tetap identik dengan input awal ketika proses selesai, gagal, atau dibatalkan.\n☐ Setelah halaman Image Studio di-refresh atau pengguna berpindah tab lalu kembali, brief yang telah disimpan tampil kembali tanpa perlu diisi ulang.",
        severity: "high",
        priority: "P1",
      }),
      provider: "google" as const,
      model: "gemini-2.0-flash",
      usage: { promptTokens: 120, completionTokens: 100, totalTokens: 220 },
    };

    const callLLMSpy = vi.spyOn(aiService, "callLLM").mockResolvedValue(mockLlmResponse as unknown as aiService.CallLLMResult);

    const promptText = "https://bugsnap.akusaraproject.my.id/v/4028ab27-4282-4c36-8229-082cfffca9b9\n\nbrief hilang setelah generate gambar di image studio";
    const res = await actionIssueAgent(
      { prompt: promptText, project: "VanApp" },
      { provider: "google", model: "gemini-2.0-flash", apiKey: "test" }
    );

    expect(res.hasTicketData).toBe(true);
    expect(res.ticket?.title).toBe("[Image Studio] - Brief hilang dari form setelah proses generate gambar");
    expect(res.ticket?.module).toBe("Image Studio");
    expect(res.ticket?.expectedResult).toBe("Brief yang sudah diisi tetap tersimpan dan tampil di form Image Studio setelah proses generate berjalan atau selesai.");
    expect(res.ticket?.actualResult).toBe("Brief hilang dari form Image Studio dan kolom brief kembali kosong.");
    expect(res.ticket?.stepsToReproduce).toContain("Description:\nBrief yang sudah diisi pengguna di Image Studio hilang dari form");
    expect(res.ticket?.stepsToReproduce).toContain("Acceptance Criteria:\n☐ Setelah pengguna mengisi brief");
    expect(res.ticket?.stepsToReproduce).not.toContain("Steps to Reproduce");
    expect(res.ticket?.stepsToReproduce).not.toContain("1. Navigate to");
    expect(res.ticket?.evidence).toBe("https://bugsnap.akusaraproject.my.id/v/4028ab27-4282-4c36-8229-082cfffca9b9");

    callLLMSpy.mockRestore();
  });
});
