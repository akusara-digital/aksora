/**
 * Utility functions for formatting and authoring test step scenarios with sequential numbering.
 */

/**
 * Format any multiline text into clean sequential numbered steps:
 * 1. Step one
 * 2. Step two
 * 3. Step three
 */
export function formatStepScenario(text: string): string {
  if (!text || !text.trim()) return "";
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return "";

  return lines
    .map((line, idx) => {
      // Remove any existing numbering or bullet formats like "1.", "1)", "- ", "* ", "Step 1:"
      const cleaned = line.replace(/^(\d+[\.\)\-:]|\*|\-|•|Step\s+\d+:?)\s*/i, "").trim();
      return `${idx + 1}. ${cleaned}`;
    })
    .join("\n");
}

/**
 * Parse step text into an array of individual step strings without the number prefix,
 * preserving clean step contents.
 */
export function parseStepList(text: string): string[] {
  if (!text || !text.trim()) return [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.map((line, idx) => {
    const cleaned = line.replace(/^(\d+[\.\)\-:]|\*|\-|•|Step\s+\d+:?)\s*/i, "").trim();
    return cleaned || `Step ${idx + 1}`;
  });
}

/**
 * Smart keyboard handler for step scenario textareas:
 * When pressing Enter on a numbered line like "1. Do something",
 * automatically prepends the next number "2. " on the new line.
 * If pressing Enter on an empty numbered line (e.g. "2. "), clears the numbering.
 */
export function handleStepKeyDown(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  value: string,
  onChange: (nextValue: string) => void,
) {
  if (e.key !== "Enter" || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) {
    return;
  }

  const target = e.currentTarget;
  const cursor = target.selectionStart;
  const beforeCursor = value.slice(0, cursor);
  const afterCursor = value.slice(cursor);

  // Find current line text before cursor
  const lastNewlineIndex = beforeCursor.lastIndexOf("\n");
  const currentLine = lastNewlineIndex === -1 ? beforeCursor : beforeCursor.slice(lastNewlineIndex + 1);

  // Match line starting with number: "1. ", "12. "
  const match = currentLine.match(/^(\d+)\.\s*(.*)$/);
  if (!match) return;

  e.preventDefault();
  const currentNum = parseInt(match[1], 10);
  const content = match[2];

  // If user hits Enter on empty number line (e.g. "3. " with no text), clear the line
  if (!content.trim()) {
    const lineStartIndex = lastNewlineIndex === -1 ? 0 : lastNewlineIndex + 1;
    const newBefore = value.slice(0, lineStartIndex);
    onChange(newBefore + afterCursor);
    setTimeout(() => {
      target.selectionStart = lineStartIndex;
      target.selectionEnd = lineStartIndex;
    }, 0);
    return;
  }

  // Insert next numbered line
  const nextPrefix = `\n${currentNum + 1}. `;
  const nextValue = beforeCursor + nextPrefix + afterCursor;
  const nextCursorPos = cursor + nextPrefix.length;

  onChange(nextValue);
  setTimeout(() => {
    target.selectionStart = nextCursorPos;
    target.selectionEnd = nextCursorPos;
  }, 0);
}
