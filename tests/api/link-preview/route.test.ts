import { describe, expect, it } from "vitest";
import { extractTitle } from "@/app/api/link-preview/route";

describe("extractTitle", () => {
  it("prefers og:title over the <title> tag", () => {
    const html = `<head><title>Fallback</title><meta property="og:title" content="BugSnap Capture" /></head>`;
    expect(extractTitle(html)).toBe("BugSnap Capture");
  });

  it("falls back to <title> when there is no og:title", () => {
    const html = `<head><title>My Page Title</title></head>`;
    expect(extractTitle(html)).toBe("My Page Title");
  });

  it("returns an empty string when neither tag is present", () => {
    expect(extractTitle("<head></head>")).toBe("");
  });

  it("trims whitespace from the extracted title", () => {
    const html = `<title>  Spaced Title  </title>`;
    expect(extractTitle(html)).toBe("Spaced Title");
  });
});
