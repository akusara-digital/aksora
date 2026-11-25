import type { TestCaseRow } from "@/components/test-management/test-case-detail-helpers";

/**
 * Parse a CSV string into headers and rows.
 * Handles quoted fields (including escaped quotes "").
 */
export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = splitCSVLines(text);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0]);
  const rows: string[][] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    rows.push(parseCSVLine(line));
  }

  return { headers, rows };
}

function splitCSVLines(text: string): string[] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      lines.push(current);
      current = "";
    } else {
      current += ch;
    }
  }

  if (current.trim()) lines.push(current);
  return lines;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

const HEADER_MAP: Record<string, keyof TestCaseRow> = {
  "tc id": "tcId",
  "tcid": "tcId",
  "test case id": "tcId",
  "id scenario": "tcId",
  "id": "tcId",
  "case name": "caseName",
  "casename": "caseName",
  "test case name": "caseName",
  "test scenario": "caseName",
  "scenario": "caseName",
  "title": "caseName",
  "type case": "typeCase",
  "typecase": "typeCase",
  "case type": "typeCase",
  "type": "typeCase",
  "pre-condition": "preCondition",
  "precondition": "preCondition",
  "pre condition": "preCondition",
  "test step": "testStep",
  "teststep": "testStep",
  "step scenario": "testStep",
  "steps": "testStep",
  "expected result": "expectedResult",
  "expectedresult": "expectedResult",
  "expected": "expectedResult",
  "actual result": "actualResult",
  "actualresult": "actualResult",
  "actual": "actualResult",
  "status": "status",
  "priority": "priority",
};

const VALID_TYPE_CASE = ["Positive", "Negative"];
const VALID_STATUS = ["Pending", "Passed", "Failed", "Blocked"];
const VALID_PRIORITY = ["Critical", "High", "Medium", "Low"];

export interface InvalidRow {
  row: number;
  errors: string[];
}

export interface MapResult {
  valid: TestCaseRow[];
  invalid: InvalidRow[];
}

export function mapCSVToTestCases(
  headers: string[],
  rows: string[][],
  suiteId: string
): MapResult {
  const columnMap = resolveColumnMap(headers);
  const valid: TestCaseRow[] = [];
  const invalid: InvalidRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const errors: string[] = [];

    const rawTcId = getField(row, columnMap, "tcId");
    const caseName = getField(row, columnMap, "caseName");
    const rawTypeCase = capitalizeFirst(getField(row, columnMap, "typeCase"));
    const preCondition = getField(row, columnMap, "preCondition");
    const testStep = getField(row, columnMap, "testStep");
    const expectedResult = getField(row, columnMap, "expectedResult");
    const actualResult = getField(row, columnMap, "actualResult");
    const rawStatus = capitalizeFirst(getField(row, columnMap, "status"));
    const rawPriority = capitalizeFirst(getField(row, columnMap, "priority"));

    const tcId = rawTcId || `TC-${String(i + 1).padStart(3, "0")}`;
    const typeCase = rawTypeCase || "Positive";
    const status = rawStatus || "Pending";
    const priority = rawPriority || "Medium";

    if (!caseName) errors.push("Case Name is required");
    if (rawTypeCase && !VALID_TYPE_CASE.includes(typeCase)) {
      errors.push(`Type Case must be Positive or Negative, got "${typeCase}"`);
    }
    if (rawStatus && !VALID_STATUS.includes(status)) {
      errors.push(`Status must be Pending/Passed/Failed/Blocked, got "${status}"`);
    }
    if (rawPriority && !VALID_PRIORITY.includes(priority)) {
      errors.push(`Priority must be Critical/High/Medium/Low, got "${priority}"`);
    }

    if (errors.length > 0) {
      invalid.push({ row: i + 1, errors });
    } else {
      valid.push({
        testSuiteId: suiteId,
        tcId,
        caseName,
        typeCase,
        preCondition: preCondition || "",
        testStep: testStep || "",
        expectedResult: expectedResult || "",
        actualResult: actualResult || "",
        status,
        evidence: "",
        priority,
      });
    }
  }

  return { valid, invalid };
}

function resolveColumnMap(headers: string[]): Map<keyof TestCaseRow, number> {
  const map = new Map<keyof TestCaseRow, number>();
  for (let i = 0; i < headers.length; i++) {
    const normalized = headers[i].toLowerCase().trim();
    const field = HEADER_MAP[normalized];
    if (field) map.set(field, i);
  }
  return map;
}

function getField(row: string[], columnMap: Map<keyof TestCaseRow, number>, key: keyof TestCaseRow): string {
  const idx = columnMap.get(key);
  if (idx === undefined || idx >= row.length) return "";
  return (row[idx] ?? "").trim();
}

function capitalizeFirst(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
