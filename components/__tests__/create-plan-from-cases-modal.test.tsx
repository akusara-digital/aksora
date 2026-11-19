import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CreatePlanFromCasesModal } from "@/components/test-management/create-plan-from-cases-modal";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/components/ui/modal-shell", () => ({
  ModalShell: ({
    title,
    description,
    children,
  }: {
    title: string;
    description: string;
    children: React.ReactNode;
  }) => (
    <div data-testid="modal-shell">
      <h2>{title}</h2>
      <p>{description}</p>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: vi.fn(),
}));

describe("CreatePlanFromCasesModal", () => {
  const dummyCases = [
    {
      id: 1,
      tcId: "TC-001",
      caseName: "Login Flow Test",
      typeCase: "Positive",
      preCondition: "User registered",
      testStep: "Submit form",
      expectedResult: "Success",
      actualResult: "",
      status: "Passed",
      priority: "High",
      suiteTitle: "Authentication",
      suiteToken: "auth-suite",
      suiteStatus: "active",
      planTitle: null,
      planProject: "Web App",
      testSuiteId: 10,
    },
    {
      id: 2,
      tcId: "TC-002",
      caseName: "Payment Flow Test",
      typeCase: "Positive",
      preCondition: "Item in cart",
      testStep: "Submit payment",
      expectedResult: "Order created",
      actualResult: "",
      status: "Pending",
      priority: "Critical",
      suiteTitle: "Checkout",
      suiteToken: "checkout-suite",
      suiteStatus: "active",
      planTitle: null,
      planProject: "Web App",
      testSuiteId: 20,
    },
  ];

  it("renders plan creation fields and test case checklist", () => {
    const html = renderToStaticMarkup(
      <CreatePlanFromCasesModal
        isOpen={true}
        onClose={vi.fn()}
        selectedCases={dummyCases}
        projectOptions={["Web App", "Mobile App"]}
      />,
    );

    expect(html).toContain("Create Test Plan from Checklist");
    expect(html).toContain("Test Plan Name");
    expect(html).toContain("Project Name");
    expect(html).toContain("Authentication");
    expect(html).toContain("Checkout");
    expect(html).toContain("Login Flow Test");
    expect(html).toContain("Payment Flow Test");
    expect(html).toContain("Create Test Plan &amp; Assign Scope");
  });
});
