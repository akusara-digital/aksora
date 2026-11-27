import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), "utf8");

describe("Aksora Vercel cost & Fluid Compute optimizations", () => {
  it("web-vitals skips good metrics in production to prevent invocation spam", () => {
    const src = read("components", "layout", "web-vitals.tsx");
    expect(src).toContain('if (metric.rating === "good") return;');
  });

  it("useAssignmentNotifications uses bounded exponential backoff and respects hidden tabs", () => {
    const src = read("hooks", "use-assignment-notifications.ts");
    expect(src).toContain("MAX_IDLE_RECONNECTS");
    expect(src).toContain("document.hidden");
    expect(src).toContain("Math.pow(2, attemptsRef.current)");
  });

  it("DashboardRealtime does not reset backoff on onopen and bounds reconnects", () => {
    const src = read("components", "dashboard", "dashboard-realtime.tsx");
    const onOpenStart = src.indexOf("es.onopen = () =>");
    const onOpenEnd = src.indexOf("};", onOpenStart);
    const onOpenBlock = src.slice(onOpenStart, onOpenEnd);
    expect(onOpenBlock).not.toContain("attemptRef.current = 0");
    expect(src).toContain("const MAX_ATTEMPTS = 6;");
  });

  it("SSE routes close cleanly at 50s before Vercel 60s maxDuration", () => {
    expect(read("app", "api", "dashboard", "events", "route.ts")).toContain("const AUTO_CLOSE_MS = 50_000;");
    expect(read("app", "api", "notifications", "stream", "route.ts")).toContain("50 * 1000");
    expect(read("app", "api", "admin", "notifications", "stream", "route.ts")).toContain("50 * 1000");
  });

  it("collaboration API avoids DELETE writes on GET and throttles POST cleanup", () => {
    const route = read("app", "api", "collaboration", "route.ts");
    const getStart = route.indexOf("export async function GET");
    const deleteStart = route.indexOf("export async function DELETE");
    const getBlock = route.slice(getStart, deleteStart);
    expect(getBlock).not.toContain('DELETE FROM "CollaborationPresence"');
    expect(getBlock).toContain('"updatedAt" >=');
    expect(route).toContain("PRUNE_INTERVAL_MS");
  });

  it("read-only endpoints emit appropriate Cache-Control headers", () => {
    expect(read("app", "api", "ai", "models", "route.ts")).toContain("public, s-maxage=3600");
    expect(read("app", "api", "announcements", "route.ts")).toContain("private, max-age=120");
  });

  it("presence API throttles stale row pruning and robots disallows private app paths", () => {
    const presence = read("app", "api", "dashboard", "presence", "route.ts");
    expect(presence).toContain("PRUNE_INTERVAL_MS");
    const robots = read("app", "robots.ts");
    expect(robots).toContain("/notes");
    expect(robots).toContain("/settings");
  });

  it("auth/me offloads base64 avatars to cached avatar endpoint", () => {
    const me = read("app", "api", "auth", "me", "route.ts");
    expect(me).toContain("/api/auth/avatar/");
    const avatarRoute = read("app", "api", "auth", "avatar", "[userId]", "route.ts");
    expect(avatarRoute).toContain("public, max-age=86400, s-maxage=86400");
  });
});
