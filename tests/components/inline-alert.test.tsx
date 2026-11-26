/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { InlineAlert } from "@/components/ui/inline-alert";

describe("InlineAlert", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a standard message cleanly", () => {
    render(<InlineAlert variant="info" message="This is an informational notice." />);
    expect(screen.getByText("This is an informational notice.")).toBeTruthy();
  });

  it("automatically sanitizes raw HTML error dumps in error alerts", () => {
    const rawHtml = `<html><head><title>502 Bad Gateway</title></head><body><h1>Bad Gateway</h1></body></html>`;
    render(<InlineAlert variant="error" message={rawHtml} />);
    expect(screen.queryByText("Bad Gateway")).toBeNull();
    expect(screen.getByText(/temporarily unavailable \(Bad Gateway\)/i)).toBeTruthy();
  });

  it("automatically parses and humanizes raw JSON error payloads", () => {
    const jsonError = JSON.stringify({ error: "Failed to connect to database." });
    render(<InlineAlert variant="error" message={jsonError} />);
    expect(screen.getByText("Failed to connect to database.")).toBeTruthy();
  });

  it("sanitizes Cloudflare error 1016 dumps", () => {
    const cfHtml = `<p>Cloudflare is currently unable to resolve your requested domain (images-rica-projects-foo.trycloudflare.com). Please see error-1016 for more details.</p>`;
    render(<InlineAlert variant="error" message={cfHtml} />);
    expect(screen.getByText(/AI endpoint is unreachable/i)).toBeTruthy();
  });
});
