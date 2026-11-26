/**
 * Error formatting and sanitization utilities.
 * Ensures all user-facing alert messages and notifications across the application
 * are clean, concise, human-friendly, and free of raw HTML error dumps,
 * stack traces, database internals, and unparsed JSON/API payloads.
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
    if (typeof errObj.error === "string") {
      raw = errObj.error;
    } else if (typeof errObj.message === "string") {
      raw = errObj.message;
    } else if (typeof errObj.detail === "string") {
      raw = errObj.detail;
    } else if (typeof errObj.error === "object" && errObj.error !== null) {
      const nested = errObj.error as Record<string, unknown>;
      raw = typeof nested.message === "string" ? nested.message : JSON.stringify(errObj.error);
    } else {
      raw = JSON.stringify(error);
    }
  } else {
    raw = String(error);
  }

  raw = raw.trim();
  if (!raw) return fallback;

  // If the raw string is a JSON string (e.g. '{"error":"..."}' or '{"message":"..."}'), parse it!
  if ((raw.startsWith("{") && raw.endsWith("}")) || (raw.startsWith("[") && raw.endsWith("]"))) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        const parsedObj = parsed as Record<string, unknown>;
        const inner =
          typeof parsedObj.error === "string"
            ? parsedObj.error
            : typeof parsedObj.message === "string"
            ? parsedObj.message
            : typeof parsedObj.detail === "string"
            ? parsedObj.detail
            : typeof parsedObj.error === "object" && parsedObj.error !== null
            ? (parsedObj.error as Record<string, unknown>).message
            : null;
        if (typeof inner === "string" && inner.trim()) {
          raw = inner.trim();
        }
      }
    } catch {
      // ignore JSON parse failure and proceed with raw string
    }
  }

  const lower = raw.toLowerCase();
  const isAiContext = /\b(ai|model|models|9router|prompt|prompts|gemini|openai|anthropic|claude)\b/i.test(raw);

  // 1. Detect Cloudflare Tunnel / Gateway / DNS errors (e.g. trycloudflare.com, error 1016)
  if (
    lower.includes("trycloudflare.com") ||
    lower.includes("error-1016") ||
    lower.includes("error 1016") ||
    (lower.includes("cloudflare") && lower.includes("unable to resolve"))
  ) {
    if (isAiContext || lower.includes("trycloudflare.com")) {
      return "AI endpoint is unreachable. The Cloudflare tunnel or remote server appears to be offline. Please verify your URL in Settings.";
    }
    return "Service endpoint is unreachable. The remote Cloudflare tunnel or server appears to be offline. Please check your network or configuration.";
  }

  if (lower.includes("521 web server is down") || lower.includes("error 521")) {
    return isAiContext
      ? "The AI server is down or refused the connection. Please verify your host is online."
      : "The remote server is down or refused the connection. Please verify the host is online.";
  }

  if (
    lower.includes("522 connection timed out") ||
    lower.includes("524 a timeout occurred") ||
    lower.includes("error 522") ||
    lower.includes("error 524")
  ) {
    return isAiContext
      ? "Connection to the AI service timed out. The server took too long to respond. Please try again."
      : "Connection timed out. The server took too long to respond. Please try again.";
  }

  if (
    lower.includes("502 bad gateway") ||
    lower.includes("504 gateway timeout") ||
    lower.includes("error 502") ||
    lower.includes("error 504")
  ) {
    return isAiContext
      ? "AI gateway is temporarily unavailable (Bad Gateway). Please check the server status or try again shortly."
      : "Service gateway is temporarily unavailable (Bad Gateway). Please check the server status or try again shortly.";
  }

  // 2. Detect raw HTML responses (e.g. <!DOCTYPE html>, <html>, <div>, <p>)
  const isHtml =
    raw.startsWith("<!DOCTYPE") ||
    raw.startsWith("<html") ||
    /<(?:html|body|div|p|h[1-6]|span|section|article|table)\b/i.test(raw);

  if (isHtml) {
    const titleMatch = raw.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "";
    if (title && !title.toLowerCase().includes("just a moment")) {
      return isAiContext
        ? `AI service returned an error page: ${title}. Please check your endpoint configuration.`
        : `Server returned an error page: ${title}. Please check the server status or try again.`;
    }
    return isAiContext
      ? "The AI service returned an unexpected server error page. Please verify your endpoint URL and internet connection."
      : "The server returned an unexpected error page. Please check your network connection or try again.";
  }

  // 3. Database / SQL / Constraint errors
  if (lower.includes("violates unique constraint") || lower.includes("unique constraint")) {
    return "A record with this information already exists. Please choose a different name or identifier.";
  }
  if (lower.includes("violates foreign key constraint") || lower.includes("foreign key constraint")) {
    return "Cannot perform this action because other records depend on this item.";
  }
  if (
    (lower.includes("column \"") && lower.includes("does not exist")) ||
    (lower.includes("relation \"") && lower.includes("does not exist")) ||
    lower.includes("syntax error at or near")
  ) {
    return "A database schema mismatch occurred. Please refresh the page or try again.";
  }
  if (lower.includes("connection terminated") || lower.includes("database connection")) {
    return "Database connection was interrupted. Please try again in a few moments.";
  }

  // 4. Common API, Authentication, and Permissions errors
  if (
    lower.includes("invalid api key") ||
    lower.includes("incorrect api key") ||
    lower.includes("invalid_api_key") ||
    lower.includes("api key is required")
  ) {
    return isAiContext
      ? "AI authentication failed. Please check or re-enter your API key in Settings."
      : "Authentication failed. Please verify your API credentials in Settings.";
  }

  if (
    lower.includes("quota exceeded") ||
    lower.includes("insufficient_quota") ||
    lower.includes("exceeded your current quota") ||
    lower.includes("billing details")
  ) {
    return isAiContext
      ? "AI quota exceeded. Please check your provider account credits or billing."
      : "Usage quota exceeded. Please check your account credits or billing.";
  }

  if (lower.includes("rate limit") || lower.includes("too many requests") || lower.includes("429")) {
    return isAiContext
      ? "Too many requests to the AI service. Please wait a moment before trying again."
      : "Too many requests. Please wait a moment before trying again.";
  }

  if (
    lower.includes("jwt expired") ||
    lower.includes("token expired") ||
    lower.includes("session expired") ||
    lower.includes("unauthorized")
  ) {
    return "Your session has expired or authentication is invalid. Please sign in again.";
  }

  if (
    lower.includes("forbidden") ||
    lower.includes("insufficient permissions") ||
    lower.includes("access denied") ||
    lower.includes("not authorized")
  ) {
    return "You do not have permission to perform this action.";
  }

  // 5. Network / Transport errors
  if (
    lower.includes("abort") ||
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    lower.includes("etimedout")
  ) {
    return isAiContext
      ? "AI request timed out. Please check your network connection or try again."
      : "Request timed out. Please check your network connection or try again.";
  }

  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("net::err_") ||
    lower.includes("econnrefused") ||
    lower.includes("enotfound")
  ) {
    return isAiContext
      ? "Cannot connect to the AI service. Please check your internet connection or endpoint URL."
      : "Unable to connect to the server. Please check your internet connection or server status.";
  }

  // 6. Clean plain text error message
  // Strip stack traces (e.g. "at Object.<anonymous> (...)", "at sw.js:1:232736", etc.)
  let clean = raw.replace(/\bat\s+[\w$./\\<>:-]+(?:\s+\([^)]+\))?/gi, " ");
  // Strip any accidental inline HTML tags
  clean = clean.replace(/<[^>]*>/g, " ");
  // Collapse whitespace
  clean = clean.replace(/\s+/g, " ").trim();

  // If the clean message is absurdly long, truncate with ellipsis
  if (clean.length > 200) {
    clean = `${clean.slice(0, 197)}...`;
  }

  return clean || fallback;
}

/**
 * Parses upstream provider error responses into humanized error strings.
 */
export function formatProviderErrorResponse(
  provider: string,
  status: number,
  statusText: string,
  rawBody: string
): string {
  const cleanBody = (rawBody || "").trim();

  if (!cleanBody) {
    return `${provider} request failed (${status} ${statusText || "Error"})`;
  }

  // 1. Try parsing JSON error structure
  try {
    const parsed = JSON.parse(cleanBody);
    if (parsed && typeof parsed === "object") {
      const msg =
        (parsed as any).error?.message ||
        (parsed as any).error ||
        (parsed as any).message ||
        (parsed as any).detail;
      if (typeof msg === "string" && msg.trim()) {
        return humanizeErrorMessage(
          msg.trim(),
          `${provider} error (${status}): ${msg.trim()}`
        );
      }
    }
  } catch {
    // Not valid JSON, might be an HTML error page or plain text
  }

  // 2. Pass through humanizeErrorMessage to catch Cloudflare HTML / 502 / 521 / etc.
  return humanizeErrorMessage(
    cleanBody,
    `${provider} request failed (${status} ${statusText || "Error"})`
  );
}
