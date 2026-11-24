import { describe, expect, it } from "vitest";
import { formatStepScenario, parseStepList } from "@/lib/test-step-utils";

describe("test-step-utils", () => {
  it("formats unnumbered multiline text into sequential numbered steps", () => {
    const raw = "Open landing page\nClick CTA button\nVerify modal opens";
    const formatted = formatStepScenario(raw);
    expect(formatted).toBe(
      "1. Open landing page\n2. Click CTA button\n3. Verify modal opens"
    );
  });

  it("normalizes inconsistent bullet points and existing numbers", () => {
    const raw = "- Step A\n* Step B\n3. Step C\nStep 4: Step D";
    const formatted = formatStepScenario(raw);
    expect(formatted).toBe(
      "1. Step A\n2. Step B\n3. Step C\n4. Step D"
    );
  });

  it("parses steps into clean array", () => {
    const raw = "1. Open app\n2. Login";
    expect(parseStepList(raw)).toEqual(["Open app", "Login"]);
  });

  it("handles empty or blank input safely", () => {
    expect(formatStepScenario("")).toBe("");
    expect(formatStepScenario("   \n  \n")).toBe("");
    expect(parseStepList("")).toEqual([]);
  });
});
