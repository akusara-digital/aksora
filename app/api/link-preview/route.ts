import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { validateOutboundUrl, validateOutboundUrlAsync } from "@/lib/ssrf-guard";

export const dynamic = "force-dynamic";

type PreviewEntry = { title: string; favicon: string | null };

// ponytail: in-memory cache per server instance, no persistence needed for a link preview
const previewCache = new Map<string, PreviewEntry>();
const CACHE_LIMIT = 500;

const FETCH_TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 200_000;

export function extractTitle(html: string): string {
  const ogMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (ogMatch) return ogMatch[1].trim();
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) return titleMatch[1].trim();
  return "";
}

async function fetchFaviconDataUri(hostname: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(hostname)}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > 50_000) return null;
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const rawUrl = (searchParams.get("url") || "").trim();
  if (!rawUrl) return NextResponse.json({ error: "url is required" }, { status: 400 });

  const syncError = validateOutboundUrl(rawUrl);
  if (syncError) return NextResponse.json({ error: syncError }, { status: 400 });

  const cached = previewCache.get(rawUrl);
  if (cached) return NextResponse.json(cached);

  const asyncError = await validateOutboundUrlAsync(rawUrl);
  if (asyncError) return NextResponse.json({ error: asyncError }, { status: 400 });

  let hostname = "";
  try {
    hostname = new URL(rawUrl).hostname;
  } catch {
    return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
  }

  let title = hostname;
  try {
    const res = await fetch(rawUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: "text/html" },
      redirect: "error",
    });
    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("text/html")) {
      const reader = res.body?.getReader();
      if (reader) {
        let received = 0;
        let html = "";
        const decoder = new TextDecoder();
        while (received < MAX_HTML_BYTES) {
          const { done, value } = await reader.read();
          if (done) break;
          received += value.byteLength;
          html += decoder.decode(value, { stream: true });
          if (/<\/title>/i.test(html)) break;
        }
        reader.cancel().catch(() => {});
        const extracted = extractTitle(html);
        if (extracted) title = extracted;
      }
    }
  } catch {
    // Keep hostname as the fallback title.
  }

  const favicon = await fetchFaviconDataUri(hostname);
  const entry: PreviewEntry = { title, favicon };

  if (previewCache.size >= CACHE_LIMIT) {
    const oldestKey = previewCache.keys().next().value;
    if (oldestKey) previewCache.delete(oldestKey);
  }
  previewCache.set(rawUrl, entry);

  return NextResponse.json(entry);
}
