export interface ProjectValidationResult {
  valid: boolean;
  reason: "none_exist" | "not_selected" | null;
  message: string;
}

/**
 * Validates whether a valid project has been selected before proceeding
 * with creating tasks, bugs, test cases, test suites, test plans, or any work item.
 */
export function validateProjectSelection(
  project?: string | null,
  projectOptions?: Array<{ label?: string; value: string }> | string[] | null,
): ProjectValidationResult {
  const hasOptionsArray = Array.isArray(projectOptions);
  const optionsCount = hasOptionsArray ? projectOptions.length : -1;
  const trimmed = String(project || "").trim();

  const isInvalidPlaceholder =
    !trimmed ||
    trimmed.toLowerCase() === "select project" ||
    trimmed.toLowerCase() === "choose project" ||
    trimmed === "__custom__";

  // If no project has been selected yet
  if (isInvalidPlaceholder) {
    if (hasOptionsArray && optionsCount === 0) {
      return {
        valid: false,
        reason: "none_exist",
        message: "No project found. Please create a project first before continuing.",
      };
    }
    return {
      valid: false,
      reason: "not_selected",
      message: "Please select a project before continuing.",
    };
  }

  return {
    valid: true,
    reason: null,
    message: "",
  };
}
