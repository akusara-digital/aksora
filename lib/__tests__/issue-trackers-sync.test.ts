import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/vault-crypto", () => ({
  decryptSecret: () => "mock_secret_token",
  encryptSecret: () => "encrypted_token",
}));

import {
  mapJiraStatusToBugStatus,
  fetchTicketStatus,
  type TrackerRow,
} from "@/lib/issue-trackers";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("issue-trackers sync & status mapping", () => {
  describe("mapJiraStatusToBugStatus", () => {
    it("maps 'Done' or 'Resolved' or 'Closed' to 'closed'", () => {
      expect(mapJiraStatusToBugStatus("Done")).toBe("closed");
      expect(mapJiraStatusToBugStatus("Resolved")).toBe("closed");
      expect(mapJiraStatusToBugStatus("Closed")).toBe("closed");
      expect(mapJiraStatusToBugStatus("Complete", "done")).toBe("closed");
    });

    it("maps 'Rejected' or 'Won't Fix' to 'rejected'", () => {
      expect(mapJiraStatusToBugStatus("Rejected")).toBe("rejected");
      expect(mapJiraStatusToBugStatus("Won't Fix")).toBe("rejected");
    });

    it("maps 'In Progress' or 'In Dev' to 'in_progress'", () => {
      expect(mapJiraStatusToBugStatus("In Progress")).toBe("in_progress");
      expect(mapJiraStatusToBugStatus("In Dev")).toBe("in_progress");
      expect(mapJiraStatusToBugStatus("Custom Step", "indeterminate")).toBe("in_progress");
    });

    it("maps 'Ready for QA' or 'Retest' to 'ready_to_retest'", () => {
      expect(mapJiraStatusToBugStatus("Ready for QA")).toBe("ready_to_retest");
      expect(mapJiraStatusToBugStatus("Retest")).toBe("ready_to_retest");
      expect(mapJiraStatusToBugStatus("Verify")).toBe("ready_to_retest");
    });

    it("maps 'Testing' or 'Need to Test' to 'need_to_test'", () => {
      expect(mapJiraStatusToBugStatus("Need to Test")).toBe("need_to_test");
      expect(mapJiraStatusToBugStatus("Testing")).toBe("need_to_test");
    });

    it("defaults other statuses to 'open'", () => {
      expect(mapJiraStatusToBugStatus("To Do")).toBe("open");
      expect(mapJiraStatusToBugStatus("Backlog")).toBe("open");
      expect(mapJiraStatusToBugStatus("Open")).toBe("open");
    });
  });

  describe("fetchTicketStatus with Jira", () => {
    const jiraTracker: TrackerRow = {
      id: 1,
      workspaceId: 10,
      kind: "jira",
      name: "Jira Cloud",
      config: JSON.stringify({ host: "https://myteam.atlassian.net", email: "qa@myteam.com", projectKey: "BUG", issueType: "Bug" }),
      secretEncrypted: "enc",
      enabled: 1,
    };

    it("fetches Jira status and maps status correctly", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            key: "BUG-170",
            fields: {
              status: {
                name: "In Progress",
                statusCategory: { key: "indeterminate", name: "In Progress" },
              },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

      const result = await fetchTicketStatus(jiraTracker, "https://myteam.atlassian.net/browse/BUG-170");

      expect(result).toEqual({
        key: "BUG-170",
        statusName: "In Progress",
        categoryKey: "indeterminate",
        mappedStatus: "in_progress",
      });
    });

    it("fetches Jira status for resolved issue", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            key: "BUG-171",
            fields: {
              status: {
                name: "Closed",
                statusCategory: { key: "done", name: "Done" },
              },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

      const result = await fetchTicketStatus(jiraTracker, "BUG-171");

      expect(result).toEqual({
        key: "BUG-171",
        statusName: "Closed",
        categoryKey: "done",
        mappedStatus: "closed",
      });
    });
  });
});
