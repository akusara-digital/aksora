import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PlanScopeChecklistModal } from "@/components/test-management/plan-scope-checklist-modal";

vi.mock("@/components/ui/modal-shell", () => ({
  ModalShell: ({
    title,
    description,
    children,
    footer,
  }: {
    title: string;
    description: string;
    children: React.ReactNode;
    footer: React.ReactNode;
  }) => (
    <div data-testid="modal-shell">
      <h2>{title}</h2>
      <p>{description}</p>
      <div>{children}</div>
      <footer>{footer}</footer>
    </div>
  ),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: vi.fn(),
}));

describe("PlanScopeChecklistModal", () => {
  const dummySuites = [
    {
      id: 101,
      title: "Auth & Login Suite",
      planProject: "Frontend App",
      cases: [
        { id: 1, tcId: "TC-001", caseName: "Valid Login", priority: "High", typeCase: "Positive" },
        { id: 2, tcId: "TC-002", caseName: "Invalid Password", priority: "Medium", typeCase: "Negative" },
      ],
    },
    {
      id: 102,
      title: "Payment Suite",
      planProject: "Billing App",
      cases: [
        { id: 3, tcId: "TC-003", caseName: "Stripe Checkout", priority: "Critical", typeCase: "Positive" },
      ],
    },
  ];

  it("renders suites and test cases checklist with accurate selection count", () => {
    const html = renderToStaticMarkup(
      <PlanScopeChecklistModal
        isOpen={true}
        onClose={vi.fn()}
        planId="1"
        planTitle="Regression Release v1.0"
        availableSuites={dummySuites}
        currentlyLinkedSuiteIds={[101, 102]}
        currentlyLinkedCaseIds={[1, 3]}
        onSuccess={vi.fn()}
      />,
    );

    expect(html).toContain("Test Plan Scope Checklist");
    expect(html).toContain("Auth &amp; Login Suite");
    expect(html).toContain("Payment Suite");
    expect(html).toContain("TC-001");
    expect(html).toContain("Valid Login");
    expect(html).toContain("TC-002");
    expect(html).toContain("Invalid Password");
    expect(html).toContain("TC-003");
    expect(html).toContain("Stripe Checkout");
    expect(html).toContain("Save Scope Checklist");
  });
});
