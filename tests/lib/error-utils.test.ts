import { describe, it, expect } from "vitest";
import { humanizeErrorMessage, formatProviderErrorResponse } from "@/lib/error-utils";

describe("humanizeErrorMessage", () => {
  it("converts Cloudflare error 1016 HTML dumps to human-friendly message", () => {
    const rawCloudflareHtml = `
      <!DOCTYPE html>
      <div id="what-happened-section" class="w-1/2 md:w-full">
        <h2>What happened?</h2>
        <p>You've requested a page on a website (images-rica-projects-foo.trycloudflare.com) that is on the Cloudflare network. Cloudflare is currently unable to resolve your requested domain (images-rica-projects-foo.trycloudflare.com).</p>
        <p>Please see error-1016 for more details.</p>
      </div>
    `;

    const result = humanizeErrorMessage(rawCloudflareHtml);
    expect(result).toBe(
      "AI endpoint is unreachable. The Cloudflare tunnel or remote server appears to be offline. Please verify your URL in Settings."
    );
  });

  it("converts generic HTML error pages to clean summary instead of raw markup", () => {
    const html = `<html><head><title>502 Bad Gateway</title></head><body><center>nginx</center></body></html>`;
    const result = humanizeErrorMessage(html);
    expect(result).toBe(
      "AI gateway is temporarily unavailable (Bad Gateway). Please check the server status or try again shortly."
    );
  });

  it("handles Cloudflare 521/522/524 errors cleanly", () => {
    expect(humanizeErrorMessage("Error 521 Web server is down")).toContain("server is down");
    expect(humanizeErrorMessage("Error 522 Connection timed out")).toContain("timed out");
  });

  it("handles auth and quota errors gracefully", () => {
    expect(humanizeErrorMessage("Incorrect API key provided: sk-***")).toContain(
      "AI authentication failed"
    );
    expect(humanizeErrorMessage("You exceeded your current quota, please check your plan")).toContain(
      "AI quota exceeded"
    );
  });

  it("strips HTML tags and caps excessively long plain text messages", () => {
    const longMsg = "<b>Warning:</b> " + "A".repeat(300);
    const result = humanizeErrorMessage(longMsg);
    expect(result).not.toContain("<b>");
    expect(result.length).toBeLessThanOrEqual(200);
    expect(result.endsWith("...")).toBe(true);
  });

  it("returns fallback for null or empty input", () => {
    expect(humanizeErrorMessage(null, "Default error")).toBe("Default error");
    expect(humanizeErrorMessage("", "Default error")).toBe("Default error");
  });
});

describe("formatProviderErrorResponse", () => {
  it("extracts message from standard JSON error payloads", () => {
    const json = JSON.stringify({
      error: {
        message: "Model 'gpt-4o' does not exist or you do not have access to it.",
      },
    });
    const result = formatProviderErrorResponse("OpenAI", 404, "Not Found", json);
    expect(result).toBe("Model 'gpt-4o' does not exist or you do not have access to it.");
  });

  it("handles Cloudflare HTML error response from 9Router public tunnel", () => {
    const html = `<title>Error 1016</title><div>Cloudflare is currently unable to resolve your requested domain (images-rica-projects-foo.trycloudflare.com)</div>`;
    const result = formatProviderErrorResponse("9Router", 530, "Origin DNS Error", html);
    expect(result).toBe(
      "AI endpoint is unreachable. The Cloudflare tunnel or remote server appears to be offline. Please verify your URL in Settings."
    );
  });
});
