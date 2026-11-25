import { describe, expect, it } from "vitest";
import { mapCSVToTestCases } from "@/components/test-management/csv-parser";

describe("mapCSVToTestCases", () => {
  it("successfully parses CSV rows with only essential case name", () => {
    const headers = ["Test Scenario"];
    const rows = [
      ["Verify user can login with valid email and password"],
      ["Verify error banner on invalid credentials"],
    ];

    const result = mapCSVToTestCases(headers, rows, "suite-10");

    expect(result.invalid).toHaveLength(0);
    expect(result.valid).toHaveLength(2);
    expect(result.valid[0]).toMatchObject({
      testSuiteId: "suite-10",
      tcId: "TC-001",
      caseName: "Verify user can login with valid email and password",
      typeCase: "Positive",
      status: "Pending",
      priority: "Medium",
      testStep: "",
      expectedResult: "",
      preCondition: "",
    });
    expect(result.valid[1]).toMatchObject({
      testSuiteId: "suite-10",
      tcId: "TC-002",
      caseName: "Verify error banner on invalid credentials",
      typeCase: "Positive",
      status: "Pending",
      priority: "Medium",
    });
  });

  it("preserves optional fields when provided and validates invalid status", () => {
    const headers = ["ID Scenario", "Test Scenario", "Case Type", "Priority", "Status"];
    const rows = [
      ["TC-101", "Valid scenario", "Negative", "High", "Passed"],
      ["TC-102", "", "Positive", "Medium", "Pending"], // missing caseName
      ["TC-103", "Bad status scenario", "Positive", "Medium", "UnknownStatus"], // invalid status
    ];

    const result = mapCSVToTestCases(headers, rows, "suite-10");

    expect(result.valid).toHaveLength(1);
    expect(result.valid[0]).toMatchObject({
      tcId: "TC-101",
      caseName: "Valid scenario",
      typeCase: "Negative",
      priority: "High",
      status: "Passed",
    });

    expect(result.invalid).toHaveLength(2);
    expect(result.invalid[0].errors).toContain("Case Name is required");
    expect(result.invalid[1].errors[0]).toContain("Status must be Pending/Passed/Failed/Blocked");
  });
});
