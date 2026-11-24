import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth-core";

const publicPaths = [
  "/login",
  "/register",
  "/reset-password",
  "/api/auth/login",
  "/api/auth/google",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/me",
  "/api/health",
  "/api/vitals",
  "/api/public/v1",
  "/api/public/run-signoff/",
  // Machine endpoints: every route below authenticates with an API key (or session) itself.
  "/api/runner/",
  "/api/recordings",
  "/api/extension/",
  "/api/openapi.json",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/manifest.webmanifest",
  "/sw.js",
  "/_next",
  "/opengraph-image",
  "/invite/",
  "/report/",
  "/test-plans/",
  "/test-suites/",
  "/test-cases/detail/",
  "/features",
  "/pricing",
  "/about",
  "/blog",
  "/docs",
  "/contact",
  "/privacy",
  "/security",
];

// Rate limiting for API routes (in-memory, per-instance)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 120; // 120 requests per minute per IP

// Stricter rate limit for public auth endpoints (brute-force defense)
const authRateLimitStore = new Map<string, { count: number; resetTime: number }>();
const AUTH_RATE_LIMIT_WINDOW = 60_000; // 1 minute
const AUTH_RATE_LIMIT_MAX = 20; // 20 requests per minute per IP
let lastCleanup = Date.now();

// Secure client IP extraction: prefer x-real-ip, fall back to the LAST x-forwarded-for entry.
// The first entry is client-controlled and spoofable; Vercel and edge proxies append to the end.
function getClientIp(request: NextRequest): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const parts = forwardedFor.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();

  // Cleanup stale entries every 5 minutes
  if (now - lastCleanup > 5 * 60_000) {
    for (const [key, val] of rateLimitStore) {
      if (now > val.resetTime) rateLimitStore.delete(key);
    }
    for (const [key, val] of authRateLimitStore) {
      if (now > val.resetTime) authRateLimitStore.delete(key);
    }
    lastCleanup = now;
  }

  const record = rateLimitStore.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  record.count++;
  return record.count <= RATE_LIMIT_MAX;
}

function checkAuthRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = authRateLimitStore.get(ip);
  if (!record || now > record.resetTime) {
    authRateLimitStore.set(ip, { count: 1, resetTime: now + AUTH_RATE_LIMIT_WINDOW });
    return true;
  }

  record.count++;
  return record.count <= AUTH_RATE_LIMIT_MAX;
}

function detectLocale(header: string | null): "en" | "id" {
  if (!header) return "en";
  const first = header.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("id") ? "id" : "en";
}

function withLocale(request: NextRequest, response: NextResponse): NextResponse {
  if (!request.cookies.get("locale")) {
    response.cookies.set("locale", detectLocale(request.headers.get("accept-language")), {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Exact match for root landing page
  if (pathname === "/") {
    return withLocale(request, NextResponse.next());
  }

  // Rate limiting for ALL API routes (enforced before publicPaths bypass)
  if (pathname.startsWith("/api")) {
    const ip = getClientIp(request);

    if (pathname.startsWith("/api/auth/")) {
      if (!checkAuthRateLimit(ip)) {
        return NextResponse.json(
          { error: "Too many authentication attempts. Please try again later." },
          { status: 429, headers: { "Retry-After": "60" } },
        );
      }
    }

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }
  }

  if (
    publicPaths.some((path) => pathname === path || pathname.startsWith(path)) &&
    !pathname.startsWith("/test-plans/projects/")
  ) {
    return pathname.startsWith("/api") ? NextResponse.next() : withLocale(request, NextResponse.next());
  }

  const token =
    request.cookies.get("aksora_token")?.value ||
    request.cookies.get("aksora_session")?.value;
  if (await verifySessionToken(token)) {
    return withLocale(request, NextResponse.next());
  }

  // For API routes, return 401 instead of redirect
  if (pathname.startsWith("/api")) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)"],
};
