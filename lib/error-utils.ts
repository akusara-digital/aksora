/**
 * Error formatting and sanitization utilities.
 * Ensures user-facing error messages are clean, concise, and human-friendly,
 * preventing raw HTML error dumps (e.g. Cloudflare 5xx/1016 error pages),
 * stack traces, and unparsed server payloads from showing in notifications.
 */

/**
 * Sanitizes and converts raw error messages into concise, human-friendly English copy.
 */
export function humanizeErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred. Please try again."
): string {
  if (!error) return fallback;

  let raw = "";
  if (error instanceof Error) {
    raw = error.message || "";
  } else if (typeof error === "string") {
    raw = error;
  } else if (typeof error === "object" && error !== null) {
    const errObj = error as Record<string, unknown>;
    raw =
      typeof errObj.error === "string"
        ? errObj.error
        : typeof errObj.message === "string"
        ? errObj.message
        : JSON.stringify(error);
  } else {
    raw = String(error);
  }

  raw = raw.trim();
  if (!raw) return fallback;

  // 1. Detect Cloudflare Tunnel / Gateway / DNS errors (e.g. trycloudflare.com, error 1016)
  const lower = raw.toLowerCase();
  if (
    lower.includes("trycloudflare.com") ||
    lower.includes("error-1016") ||
    lower.includes("error 1016") ||
    (lower.includes("cloudflare") && lower.includes("unable to resolve"))
  ) {
    return "AI endpoint is unreachable. The Cloudflare tunnel or remote server appears to be offline. Please verify your URL in Settings.";
  }

  if (lower.includes("521 web server is down") || lower.includes("error 521")) {
    return "The AI server is down or refused the connection. Please verify your host is online.";
  }

  if (
    lower.includes("522 connection timed out") ||
    lower.includes("524 a timeout occurred") ||
    lower.includes("error 522") ||
    lower.includes("error 524")
  ) {
    return "Connection to the AI service timed out. The server took too long to respond. Please try again.";
  }

  if (
    lower.includes("502 bad gateway") ||
    lower.includes("504 gateway timeout") ||
    lower.includes("error 502") ||
    lower.includes("error 504")
  ) {
    return "AI gateway is temporarily unavailable (Bad Gateway). Please check the server status or try again shortly.";
  }

  // 2. Detect raw HTML responses (e.g. <!DOCTYPE html>, <html>, <div>, <p>)
  const isHtml =
    raw.startsWith("<!DOCTYPE") ||
    raw.startsWith("<html") ||
    /<(?:html|body|div|p|h[1-6]|span|section|article|table)\b/i.test(raw);

  if (isHtml) {
    // Attempt extracting <title> content from the HTML document
    const titleMatch = raw.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "";
    if (title && !title.toLowerCase().includes("just a moment")) {
      return `AI service returned an error page: ${title}. Please check your endpoint configuration.`;
    }
    return "The AI service returned an unexpected server error page. Please verify your endpoint URL and internet connection.";
  }

  // 3. Common API and Authentication errors
  if (
    lower.includes("invalid api key") ||
    lower.includes("incorrect api key") ||
    lower.includes("invalid_api_key") ||
    lower.includes("authentication failed") ||
    lower.includes("api key is required")
  ) {
    return "AI authentication failed. Please check or re-enter your API key in Settings.";
  }

  if (
    lower.includes("quota exceeded") ||
    lower.includes("insufficient_quota") ||
    lower.includes("exceeded your current quota") ||
    lower.includes("billing details")
  ) {
    return "AI quota exceeded. Please check your provider account credits or billing.";
  }

  if (lower.includes("rate limit") || lower.includes("too many requests") || lower.includes("429")) {
    return "Too many requests to the AI service. Please wait a moment before trying again.";
  }

  if (
    lower.includes("abort") ||
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    lower.includes("etimedout")
  ) {
    return "AI request timed out. Please check your network connection or try again.";
  }

  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("econnrefused") ||
    lower.includes("enotfound")
  ) {
    return "Cannot connect to the AI service. Please check your internet connection or endpoint URL.";
  }

  // 4. Clean plain text error message
  // Strip any accidental inline HTML tags
  let clean = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  // If the clean message is absurdly long, truncate with ellipsis
  if (clean.length > 200) {
    clean = `${clean.slice(0, 197)}...`;
  }

  return clean || fallback;
}

/**
 * Parses HTTP error response from an AI provider and returns a clean, humanized string.
 */
export function formatProviderErrorResponse(
  provider: string,
  status: number,
  statusText: string,
  rawBody: string
): string {
  const trimmed = (rawBody || "").trim();

  // 1. Try to parse JSON error first
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const errObj = (parsed.error ?? parsed) as Record<string, unknown>;
      const message =
        typeof errObj === "string"
          ? errObj
          : typeof errObj?.message === "string"
          ? errObj.message
          : typeof parsed?.message === "string"
          ? parsed.message
          : typeof parsed?.detail === "string"
          ? parsed.detail
          : "";
      if (message) {
        return humanizeErrorMessage(
          message,
          `${provider} request failed with status ${status}.`
        );
      }
    } catch {
      // Not JSON, continue below
    }
  }

  // 2. Check for HTML error pages (e.g. Cloudflare tunnel 1016, 502 Bad Gateway)
  const isHtml =
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html") ||
    /<(?:html|body|div|p|h[1-6]|span)\b/i.test(trimmed);

  if (isHtml) {
    return humanizeErrorMessage(
      trimmed,
      `${provider} service returned an unexpected server error page (HTTP ${status}).`
    );
  }

  // 3. Plain text response
  if (trimmed) {
    return humanizeErrorMessage(
      trimmed,
      `${provider} request failed with status ${status} (${statusText || "Error"}).`
    );
  }

  return `${provider} request failed with status ${status} (${statusText || "Unknown error"}).`;
}
